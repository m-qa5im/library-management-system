using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using Microsoft.Extensions.Caching.Memory;

namespace backend.Endpoints
{
    public static class BookEndpoints
    {
        public static void MapBookEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/books");

            // GET /api/books/available - Fetch current reading stock (Public)
            group.MapGet("/available", async (IBookRepository bookRepo, IMemoryCache cache) =>
            {
                if (!cache.TryGetValue("available_books", out IEnumerable<Book>? availableBooks))
                {
                    availableBooks = await bookRepo.GetAvailableBooksAsync();
                    var cacheEntryOptions = new MemoryCacheEntryOptions()
                        .SetSlidingExpiration(TimeSpan.FromMinutes(10));
                    cache.Set("available_books", availableBooks, cacheEntryOptions);
                }
                return Results.Ok(availableBooks);
            });

            // GET /books/catalog - Fetch all active books in the library catalog (Authenticated users)
            group.MapGet("/catalog", async (IBookRepository bookRepo, IMemoryCache cache) =>
            {
                if (!cache.TryGetValue("catalog_books", out IEnumerable<Book>? activeBooks))
                {
                    var allBooks = await bookRepo.GetAllAsync();
                    activeBooks = allBooks.Where(b => b.IsActive).ToList();
                    var cacheEntryOptions = new MemoryCacheEntryOptions()
                        .SetSlidingExpiration(TimeSpan.FromMinutes(10));
                    cache.Set("catalog_books", activeBooks, cacheEntryOptions);
                }
                return Results.Ok(activeBooks);
            }).RequireAuthorization();

            // POST /api/books - Add a new asset to the catalog (Admin only)
            group.MapPost("/", async ([FromBody] BookCreateDto dto, IBookRepository bookRepo, IMemoryCache cache) =>
            {
                // Basic business logic validation
                if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Author))
                {
                    return Results.BadRequest("Title and Author fields are strictly mandatory.");
                }

                string? sanitizedIsbn = null;
                if (!string.IsNullOrWhiteSpace(dto.Isbn))
                {
                    sanitizedIsbn = dto.Isbn.Replace("-", "").Replace(" ", "").Trim();
                    if (sanitizedIsbn.Length != 10 && sanitizedIsbn.Length != 13)
                    {
                        return Results.BadRequest("ISBN must be exactly 10 or 13 alphanumeric characters.");
                    }
                    if (!sanitizedIsbn.All(char.IsLetterOrDigit))
                    {
                        return Results.BadRequest("ISBN must contain only alphanumeric characters.");
                    }
                }

                string? coverUrl = dto.CoverImageUrl;
                if (string.IsNullOrWhiteSpace(coverUrl) && !string.IsNullOrWhiteSpace(sanitizedIsbn))
                {
                    coverUrl = $"https://covers.openlibrary.org/b/isbn/{sanitizedIsbn}-M.jpg?default=false";
                }

                if (!string.IsNullOrWhiteSpace(sanitizedIsbn))
                {
                    var existingBook = await bookRepo.FindSingleAsync(b => b.IsActive && b.Isbn == sanitizedIsbn);
                    if (existingBook != null)
                    {
                        return Results.BadRequest("A book with this ISBN already exists in the catalog.");
                    }

                    // Reactivate previously soft-deleted book if matching ISBN is found
                    var softDeletedBook = await bookRepo.FindSingleAsync(b => !b.IsActive && b.Isbn == sanitizedIsbn);
                    if (softDeletedBook != null)
                    {
                        var restoreQty = dto.TotalQuantity.HasValue && dto.TotalQuantity.Value > 0 ? dto.TotalQuantity.Value : 1;
                        softDeletedBook.IsActive = true;
                        softDeletedBook.Title = dto.Title;
                        softDeletedBook.Author = dto.Author;
                        softDeletedBook.Category = dto.Category;
                        softDeletedBook.Description = dto.Description;
                        softDeletedBook.CoverImageUrl = coverUrl;
                        softDeletedBook.TotalQuantity = restoreQty;
                        softDeletedBook.AvailableQuantity = restoreQty;
                        softDeletedBook.AvailabilityStatus = "Available";
                        softDeletedBook.UpdatedAt = DateTime.UtcNow;

                        bookRepo.Update(softDeletedBook);
                        await bookRepo.SaveChangesAsync();

                        cache.Remove("available_books");
                        cache.Remove("catalog_books");

                        return Results.Created($"/books/{softDeletedBook.Id}", softDeletedBook);
                    }
                }

                // Map incoming DTO network data straight into our underlying Database Model
                var qty = dto.TotalQuantity.HasValue && dto.TotalQuantity.Value > 0 ? dto.TotalQuantity.Value : 1;
                var newBook = new Book
                {
                    Title = dto.Title,
                    Author = dto.Author,
                    Category = dto.Category,
                    Description = dto.Description,
                    CoverImageUrl = coverUrl,
                    Isbn = sanitizedIsbn,
                    AvailabilityStatus = "Available",
                    TotalQuantity = qty,
                    AvailableQuantity = qty,
                    IsActive = true
                };

                await bookRepo.AddAsync(newBook);
                await bookRepo.SaveChangesAsync();

                cache.Remove("available_books");
                cache.Remove("catalog_books");

                return Results.Created($"/books/{newBook.Id}", newBook);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /books - Fetch every book entry inside the database catalog (Admin only)
            group.MapGet("/", async (IBookRepository bookRepo) =>
            {
                var allBooks = await bookRepo.GetAllAsync();
                var activeBooks = allBooks.Where(b => b.IsActive);
                return Results.Ok(activeBooks);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // DELETE /books/{id} - Remove or soft-delete a literary asset from the inventory database (Admin only)
            group.MapDelete("/{id:int}", async (int id, IBookRepository bookRepo, AppDbContext dbContext, IMemoryCache cache) =>
            {
                var targetBook = await bookRepo.GetByIdAsync(id);
                if (targetBook == null || !targetBook.IsActive)
                {
                    return Results.NotFound($"No book asset found corresponding to ID: {id}");
                }

                // Check if book has any active transactions (Issued or Pending)
                var hasActiveTransactions = await dbContext.BookTransactions.AnyAsync(t => 
                    t.BookId == id && (t.Status == "Issued" || t.Status == "Pending"));
                
                if (hasActiveTransactions)
                {
                    return Results.BadRequest("Cannot delete book. Ensure it has no active loans or pending borrow requests.");
                }

                // Check if book has any historical transaction logs (Returned or Rejected)
                var hasHistory = await dbContext.BookTransactions.AnyAsync(t => t.BookId == id);
                if (hasHistory)
                {
                    // Soft delete because of database restrict foreign key constraint on transactions
                    targetBook.IsActive = false;
                    targetBook.UpdatedAt = DateTime.UtcNow;
                    bookRepo.Update(targetBook);
                }
                else
                {
                    // Hard delete if it has absolutely no transaction history
                    bookRepo.Delete(targetBook);
                }

                await bookRepo.SaveChangesAsync();

                cache.Remove("available_books");
                cache.Remove("catalog_books");

                return Results.Ok(new { Message = $"Book asset {id} was successfully purged from the catalog system database." });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // PUT /books/{id} - Modify existing book specifications (Admin only)
            group.MapPut("/{id:int}", async (int id, [FromBody] BookUpdateDto dto, IBookRepository bookRepo, IMemoryCache cache) =>
            {
                var book = await bookRepo.GetByIdAsync(id);
                if (book == null || !book.IsActive)
                {
                    return Results.NotFound($"No book catalog record found matching ID: {id}");
                }

                // Mutate properties conditionally if text is provided
                if (!string.IsNullOrWhiteSpace(dto.Title)) book.Title = dto.Title;
                if (!string.IsNullOrWhiteSpace(dto.Author)) book.Author = dto.Author;
                if (!string.IsNullOrWhiteSpace(dto.Category)) book.Category = dto.Category;
                if (dto.Description != null) book.Description = dto.Description;
                if (!string.IsNullOrWhiteSpace(dto.AvailabilityStatus)) book.AvailabilityStatus = dto.AvailabilityStatus;
                if (dto.TotalQuantity.HasValue && dto.TotalQuantity.Value > 0) book.TotalQuantity = dto.TotalQuantity.Value;
                if (dto.AvailableQuantity.HasValue && dto.AvailableQuantity.Value >= 0) book.AvailableQuantity = dto.AvailableQuantity.Value;
                
                if (dto.Isbn != null)
                {
                    if (string.IsNullOrWhiteSpace(dto.Isbn))
                    {
                        book.Isbn = null;
                    }
                    else
                    {
                        var sanitizedIsbn = dto.Isbn.Replace("-", "").Replace(" ", "").Trim();
                        if (sanitizedIsbn.Length != 10 && sanitizedIsbn.Length != 13)
                        {
                            return Results.BadRequest("ISBN must be exactly 10 or 13 alphanumeric characters.");
                        }
                        if (!sanitizedIsbn.All(char.IsLetterOrDigit))
                        {
                            return Results.BadRequest("ISBN must contain only alphanumeric characters.");
                        }

                        var bookWithIsbn = await bookRepo.FindSingleAsync(b => b.Isbn == sanitizedIsbn && b.Id != id);
                        if (bookWithIsbn != null)
                        {
                            return Results.BadRequest("Another book with this ISBN already exists in the database.");
                        }
                        book.Isbn = sanitizedIsbn;
                    }
                }

                if (dto.CoverImageUrl != null)
                {
                    book.CoverImageUrl = string.IsNullOrWhiteSpace(dto.CoverImageUrl) ? null : dto.CoverImageUrl;
                }

                // If cover url is null/empty but isbn is set, auto-construct
                if (string.IsNullOrWhiteSpace(book.CoverImageUrl) && !string.IsNullOrWhiteSpace(book.Isbn))
                {
                    book.CoverImageUrl = $"https://covers.openlibrary.org/b/isbn/{book.Isbn}-M.jpg?default=false";
                }

                book.UpdatedAt = DateTime.UtcNow;
                bookRepo.Update(book);
                await bookRepo.SaveChangesAsync();

                cache.Remove("available_books");
                cache.Remove("catalog_books");

                return Results.Ok(new { Message = "Book catalog item modified successfully.", UpdatedBook = book });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /books/search - Paginated search (Authenticated users)
            group.MapGet("/search", async ([FromQuery] string? q, [FromQuery] string? status, AppDbContext dbContext, [FromQuery] int page = 1, [FromQuery] int pageSize = 10) =>
            {
                var query = dbContext.Books.Where(b => b.IsActive).AsQueryable();
                if (!string.IsNullOrWhiteSpace(q))
                {
                    var term = q.Trim().ToLower();
                    query = query.Where(b => b.Title.ToLower().Contains(term) ||
                                             b.Author.ToLower().Contains(term) ||
                                             (b.Isbn != null && b.Isbn.ToLower().Contains(term)) ||
                                             b.Id.ToString() == term);
                }
                if (!string.IsNullOrWhiteSpace(status))
                {
                    query = query.Where(b => b.AvailabilityStatus == status);
                }
                var total = await query.CountAsync();
                var items = await query.OrderBy(b => b.Title).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
                return Results.Ok(new { Items = items, TotalCount = total });
            }).RequireAuthorization();
        }
    }
}