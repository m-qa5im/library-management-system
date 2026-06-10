using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using backend.DTOs;

namespace backend.Endpoints
{
    public static class BookEndpoints
    {
        public static void MapBookEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/books");

            // GET /api/books/available - Fetch current reading stock (Public)
            group.MapGet("/available", async (IBookRepository bookRepo) =>
            {
                var availableBooks = await bookRepo.GetAvailableBooksAsync();
                return Results.Ok(availableBooks);
            });

            // GET /books/catalog - Fetch all active books in the library catalog (Authenticated users)
            group.MapGet("/catalog", async (IBookRepository bookRepo) =>
            {
                var allBooks = await bookRepo.GetAllAsync();
                var activeBooks = allBooks.Where(b => b.IsActive);
                return Results.Ok(activeBooks);
            }).RequireAuthorization();

            // POST /api/books - Add a new asset to the catalog (Admin only)
            group.MapPost("/", async ([FromBody] BookCreateDto dto, IBookRepository bookRepo) =>
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

                // Map incoming DTO network data straight into our underlying Database Model
                var newBook = new Book
                {
                    Title = dto.Title,
                    Author = dto.Author,
                    Category = dto.Category,
                    Description = dto.Description,
                    CoverImageUrl = coverUrl,
                    Isbn = sanitizedIsbn,
                    AvailabilityStatus = "Available",
                    IsActive = true
                };

                await bookRepo.AddAsync(newBook);
                await bookRepo.SaveChangesAsync();

                return Results.Created($"/books/{newBook.Id}", newBook);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /books - Fetch every book entry inside the database catalog (Admin only)
            group.MapGet("/", async (IBookRepository bookRepo) =>
            {
                var allBooks = await bookRepo.GetAllAsync();
                return Results.Ok(allBooks);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // DELETE /books/{id} - Remove or soft-delete a literary asset from the inventory database (Admin only)
            group.MapDelete("/{id:int}", async (int id, IBookRepository bookRepo) =>
            {
                var targetBook = await bookRepo.GetByIdAsync(id);
                if (targetBook == null)
                {
                    return Results.NotFound($"No book asset found corresponding to ID: {id}");
                }

                bookRepo.Delete(targetBook);
                await bookRepo.SaveChangesAsync();

                return Results.Ok(new { Message = $"Book asset {id} was successfully purged from the catalog system database." });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // PUT /books/{id} - Modify existing book specifications (Admin only)
            group.MapPut("/{id:int}", async (int id, [FromBody] BookUpdateDto dto, IBookRepository bookRepo) =>
            {
                var book = await bookRepo.GetByIdAsync(id);
                if (book == null)
                {
                    return Results.NotFound($"No book catalog record found matching ID: {id}");
                }

                // Mutate properties conditionally if text is provided
                if (!string.IsNullOrWhiteSpace(dto.Title)) book.Title = dto.Title;
                if (!string.IsNullOrWhiteSpace(dto.Author)) book.Author = dto.Author;
                if (!string.IsNullOrWhiteSpace(dto.Category)) book.Category = dto.Category;
                if (dto.Description != null) book.Description = dto.Description;
                if (!string.IsNullOrWhiteSpace(dto.AvailabilityStatus)) book.AvailabilityStatus = dto.AvailabilityStatus;
                
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

                return Results.Ok(new { Message = "Book catalog item modified successfully.", UpdatedBook = book });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }
}