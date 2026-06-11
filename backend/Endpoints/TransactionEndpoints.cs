using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Endpoints
{
    public static class TransactionEndpoints
    {
        public static void MapTransactionEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/transactions");

            // POST /transactions/issue - Admin only
            group.MapPost("/issue", async ([FromBody] IssueBookDto dto, 
                AppDbContext dbContext,
                IGenericRepository<User> userRepo,
                IGenericRepository<Member> memberRepo,
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                // 1. Verify Member exists and is structurally Active
                var member = await memberRepo.GetByIdAsync(dto.MemberId);
                if (member == null || member.Status != "Active")
                {
                    return Results.BadRequest("Invalid member profile or account is currently suspended.");
                }

                // 2. Perform atomic decrement
                var rowsAffected = await dbContext.Database.ExecuteSqlRawAsync(
                    "UPDATE books SET available_quantity = available_quantity - 1 WHERE id = {0} AND available_quantity > 0 AND is_active = true", 
                    dto.BookId);
                
                if (rowsAffected == 0)
                {
                    return Results.Json(new { error = "This book is currently unavailable or out of stock." }, statusCode: 409);
                }

                var book = await dbContext.Books.FirstOrDefaultAsync(b => b.Id == dto.BookId);
                if (book != null)
                {
                    await dbContext.Entry(book).ReloadAsync();
                    if (book.AvailableQuantity <= 0)
                    {
                        book.AvailabilityStatus = "Issued";
                    }
                    book.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();
                }

                var issueDate = dto.IssueDate ?? DateTime.UtcNow;
                var dueDate = dto.DueDate ?? issueDate.AddDays(14);

                // 4. Generate the Circulation Ledger Entry (Enforcing the 14-Day Due Date Matrix)
                var transaction = new BookTransaction
                {
                    BookId = dto.BookId,
                    MemberId = dto.MemberId,
                    IssueDate = issueDate,
                    DueDate = dueDate,
                    Status = "Issued",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await transactionRepo.AddAsync(transaction);
                await transactionRepo.SaveChangesAsync();

                return Results.Ok(new { Message = "Book issued successfully.", TransactionId = transaction.Id, DueDate = transaction.DueDate });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /transactions/return - Admin only
            group.MapPost("/return", async ([FromBody] ReturnBookDto dto, 
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                // 1. Locate the active ledger row using our partial matching index strategy
                var transaction = await transactionRepo.FindSingleAsync(t => 
                    t.BookId == dto.BookId && t.MemberId == dto.MemberId && t.ReturnDate == null && t.Status == "Issued");

                if (transaction == null)
                {
                    return Results.NotFound("No active tracking transaction record found for this explicit Book-Member pair.");
                }

                // 2. Update transaction metrics to stamp completion
                transaction.ReturnDate = DateTime.UtcNow;
                transaction.Status = "Returned";
                transaction.UpdatedAt = DateTime.UtcNow;
                transactionRepo.Update(transaction);

                // 3. Release the physical inventory book asset back to the wild
                var book = await bookRepo.GetByIdAsync(dto.BookId);
                if (book != null)
                {
                    book.AvailableQuantity = Math.Min(book.AvailableQuantity + 1, book.TotalQuantity);
                    if (book.AvailableQuantity > 0) book.AvailabilityStatus = "Available";
                    book.UpdatedAt = DateTime.UtcNow;
                    bookRepo.Update(book);
                }

                await transactionRepo.SaveChangesAsync();
                return Results.Ok(new { Message = "Book returned and inventory updated successfully." });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /transactions/borrow - Member self-borrow (Member only)
            group.MapPost("/borrow", async ([FromBody] BorrowBookDto dto,
                AppDbContext dbContext,
                ClaimsPrincipal userPrincipal,
                IGenericRepository<Member> memberRepo,
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                // 1. Resolve logged-in user and linked Member profile
                var currentUserIdClaim = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserIdClaim) || !int.TryParse(currentUserIdClaim, out var userId))
                {
                    return Results.Json(new { error = "Forbidden: Invalid credentials context." }, statusCode: 403);
                }
    
                var memberProfiles = await memberRepo.FindAsync(m => m.UserId == userId);
                var member = memberProfiles.FirstOrDefault();
                if (member == null || member.Status != "Active")
                {
                    return Results.BadRequest("Invalid member profile or account is currently suspended.");
                }
    
                // 2. Perform atomic decrement
                var rowsAffected = await dbContext.Database.ExecuteSqlRawAsync(
                    "UPDATE books SET available_quantity = available_quantity - 1 WHERE id = {0} AND available_quantity > 0 AND is_active = true", 
                    dto.BookId);
                
                if (rowsAffected == 0)
                {
                    return Results.Json(new { error = "This book is currently unavailable or out of stock." }, statusCode: 409);
                }
    
                var book = await dbContext.Books.FirstOrDefaultAsync(b => b.Id == dto.BookId);
                if (book != null)
                {
                    await dbContext.Entry(book).ReloadAsync();
                    if (book.AvailableQuantity <= 0)
                    {
                        book.AvailabilityStatus = "Issued";
                    }
                    book.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();
                }
    
                // 4. Generate transaction ledger
                var transaction = new BookTransaction
                {
                    BookId = dto.BookId,
                    MemberId = member.Id,
                    IssueDate = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow.AddDays(14),
                    Status = "Issued",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
    
                await transactionRepo.AddAsync(transaction);
                await transactionRepo.SaveChangesAsync();
    
                return Results.Ok(new { Message = "Book borrowed successfully.", TransactionId = transaction.Id, DueDate = transaction.DueDate });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Member" });

            // GET /transactions/my-loans/{memberId} - Fetch all active checked-out titles for a member (Self-user or Admin)
            group.MapGet("/my-loans/{memberId:int}", async (int memberId, 
                AppDbContext dbContext,
                IGenericRepository<Member> memberRepo,
                ClaimsPrincipal userPrincipal) =>
            {
                var currentUserIdClaim = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = userPrincipal.FindFirst(ClaimTypes.Role)?.Value;

                // Enforce that Members can only retrieve their own loans. Admins can view any loans.
                if (currentUserRole != "Admin")
                {
                    if (string.IsNullOrEmpty(currentUserIdClaim) || !int.TryParse(currentUserIdClaim, out var userId))
                    {
                        return Results.Json(new { error = "Forbidden: Invalid credentials context." }, statusCode: 403);
                    }

                    var memberProfiles = await memberRepo.FindAsync(m => m.UserId == userId);
                    var memberProfile = memberProfiles.FirstOrDefault();
                    if (memberProfile == null || memberProfile.Id != memberId)
                    {
                        return Results.Json(new { error = "Forbidden: You do not have permission to view this member's loan history." }, statusCode: 403);
                    }
                }

                // Retrieve historical lines where return date is null
                var activeLoans = await dbContext.BookTransactions
                    .Include(t => t.Book)
                    .Where(t => t.MemberId == memberId && t.ReturnDate == null)
                    .ToListAsync();
                return Results.Ok(activeLoans);
            }).RequireAuthorization();

            // GET /transactions - Fetch all library transaction records (Admin Overview Log)
            group.MapGet("/", async (AppDbContext dbContext) =>
            {
                var histories = await dbContext.BookTransactions
                    .Include(t => t.Book)
                    .Include(t => t.Member)
                        .ThenInclude(m => m.User)
                    .OrderByDescending(t => t.IssueDate)
                    .ToListAsync();
                return Results.Ok(histories);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /transactions/active/search - Paginated search of active loans (Admin only)
            group.MapGet("/active/search", async ([FromQuery] string? q, AppDbContext dbContext, [FromQuery] int page = 1, [FromQuery] int pageSize = 10) =>
            {
                var query = dbContext.BookTransactions
                    .Include(t => t.Book)
                    .Include(t => t.Member)
                        .ThenInclude(m => m.User)
                    .Where(t => t.ReturnDate == null && t.Status == "Issued")
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(q))
                {
                    var term = q.Trim().ToLower();
                    query = query.Where(t => t.Id.ToString() == term ||
                                             t.Book.Title.ToLower().Contains(term) ||
                                             t.Book.Id.ToString() == term ||
                                             t.Member.MemberCode.ToLower().Contains(term) ||
                                             t.Member.User.FullName.ToLower().Contains(term) ||
                                             t.Member.User.Email.ToLower().Contains(term));
                }

                var total = await query.CountAsync();
                var items = await query.OrderByDescending(t => t.IssueDate).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
                return Results.Ok(new { Items = items, TotalCount = total });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /transactions/{transactionId}/return - Process a return transaction (Admin only)
            group.MapPost("/{transactionId:int}/return", async (int transactionId, [FromBody] ReturnBookTransactionDto dto,
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                var transaction = await transactionRepo.GetByIdAsync(transactionId);
                if (transaction == null || transaction.Status != "Issued" || transaction.ReturnDate != null)
                {
                    return Results.BadRequest("Invalid transaction record or lease is already returned.");
                }

                var returnDate = dto.ReturnDate ?? DateTime.UtcNow;

                transaction.ReturnDate = returnDate;
                transaction.Status = "Returned";
                transaction.UpdatedAt = DateTime.UtcNow;
                transactionRepo.Update(transaction);

                var book = await bookRepo.GetByIdAsync(transaction.BookId);
                if (book != null)
                {
                    book.AvailableQuantity = Math.Min(book.AvailableQuantity + 1, book.TotalQuantity);
                    if (book.AvailableQuantity > 0) book.AvailabilityStatus = "Available";
                    book.UpdatedAt = DateTime.UtcNow;
                    bookRepo.Update(book);
                }

                await transactionRepo.SaveChangesAsync();
                return Results.Ok(new { Message = "Book returned and inventory updated successfully." });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /transactions/request - Member submits a borrow request (Pending queue)
            group.MapPost("/request", async ([FromBody] RequestBorrowDto dto,
                AppDbContext dbContext,
                ClaimsPrincipal userPrincipal,
                IGenericRepository<Member> memberRepo,
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                var currentUserIdClaim = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(currentUserIdClaim) || !int.TryParse(currentUserIdClaim, out var userId))
                    return Results.Json(new { error = "Forbidden: Invalid credentials context." }, statusCode: 403);
    
                var memberProfiles = await memberRepo.FindAsync(m => m.UserId == userId);
                var member = memberProfiles.FirstOrDefault();
                if (member == null || member.Status != "Active")
                    return Results.BadRequest("Invalid member profile or account is currently suspended.");
    
                var bookExists = await dbContext.Books.AnyAsync(b => b.Id == dto.BookId && b.IsActive);
                if (!bookExists)
                    return Results.BadRequest("The requested book does not exist in the catalog.");
    
                // Check: member must not already have a pending/active request for the same book
                var existing = await transactionRepo.FindAsync(t =>
                    t.BookId == dto.BookId && t.MemberId == member.Id &&
                    (t.Status == "Pending" || t.Status == "Issued"));
                if (existing.Any())
                    return Results.BadRequest("You already have an active request or loan for this book.");
    
                // Perform atomic decrement
                var rowsAffected = await dbContext.Database.ExecuteSqlRawAsync(
                    "UPDATE books SET available_quantity = available_quantity - 1 WHERE id = {0} AND available_quantity > 0 AND is_active = true", 
                    dto.BookId);
                
                if (rowsAffected == 0)
                {
                    return Results.Json(new { error = "This book is currently unavailable or out of stock." }, statusCode: 409);
                }
    
                var book = await dbContext.Books.FirstOrDefaultAsync(b => b.Id == dto.BookId);
                if (book != null)
                {
                    await dbContext.Entry(book).ReloadAsync();
                    if (book.AvailableQuantity <= 0)
                    {
                        book.AvailabilityStatus = "Issued";
                    }
                    book.UpdatedAt = DateTime.UtcNow;
                    await dbContext.SaveChangesAsync();
                }
    
                var transaction = new BookTransaction
                {
                    BookId = dto.BookId,
                    MemberId = member.Id,
                    IssueDate = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow.AddDays(14),
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
    
                await transactionRepo.AddAsync(transaction);
                await transactionRepo.SaveChangesAsync();
    
                return Results.Ok(new { Message = "Borrow request submitted. Awaiting admin approval.", TransactionId = transaction.Id });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Member" });

            // GET /transactions/pending - Admin: paginated list of pending borrow requests
            group.MapGet("/pending", async (AppDbContext dbContext, [FromQuery] int page = 1, [FromQuery] int pageSize = 10) =>
            {
                var query = dbContext.BookTransactions
                    .Include(t => t.Book)
                    .Include(t => t.Member)
                        .ThenInclude(m => m.User)
                    .Where(t => t.Status == "Pending")
                    .OrderByDescending(t => t.CreatedAt)
                    .AsQueryable();

                var total = await query.CountAsync();
                var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

                return Results.Ok(new { Items = items, TotalCount = total, Page = page, PageSize = pageSize });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /transactions/{id}/approve - Admin approves a pending request
            group.MapPost("/{id:int}/approve", async (int id,
                AppDbContext dbContext,
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                var transaction = await transactionRepo.GetByIdAsync(id);
                if (transaction == null || transaction.Status != "Pending")
                    return Results.BadRequest("Transaction not found or is not in Pending state.");
    
                var book = await bookRepo.GetByIdAsync(transaction.BookId);
                if (book == null)
                    return Results.BadRequest("The requested book does not exist in the catalog.");
    
                transaction.Status = "Issued";
                transaction.IssueDate = DateTime.UtcNow;
                transaction.DueDate = DateTime.UtcNow.AddDays(14);
                transaction.UpdatedAt = DateTime.UtcNow;
                transactionRepo.Update(transaction);
    
                await transactionRepo.SaveChangesAsync();
                return Results.Ok(new { Message = "Request approved. Book copy locked for member.", AvailableQuantity = book.AvailableQuantity });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /transactions/{id}/reject - Admin rejects a pending request
            group.MapPost("/{id:int}/reject", async (int id,
                AppDbContext dbContext,
                IBookRepository bookRepo,
                IGenericRepository<BookTransaction> transactionRepo) =>
            {
                var transaction = await transactionRepo.GetByIdAsync(id);
                if (transaction == null || transaction.Status != "Pending")
                    return Results.BadRequest("Transaction not found or is not in Pending state.");
    
                // Reclaim/increment the physical copy back to availability
                var book = await bookRepo.GetByIdAsync(transaction.BookId);
                if (book != null)
                {
                    book.AvailableQuantity = Math.Min(book.AvailableQuantity + 1, book.TotalQuantity);
                    if (book.AvailableQuantity > 0) book.AvailabilityStatus = "Available";
                    book.UpdatedAt = DateTime.UtcNow;
                    bookRepo.Update(book);
                }
    
                transaction.Status = "Rejected";
                transaction.UpdatedAt = DateTime.UtcNow;
                transactionRepo.Update(transaction);
    
                await transactionRepo.SaveChangesAsync();
                return Results.Ok(new { Message = "Request rejected successfully." });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }

    // Modular Data Transfer Object Contracts
    public record IssueBookDto(int BookId, int MemberId, DateTime? IssueDate, DateTime? DueDate);
    public record ReturnBookDto(int BookId, int MemberId);
    public record ReturnBookTransactionDto(DateTime? ReturnDate);
    public record BorrowBookDto(int BookId);
    public record RequestBorrowDto(int BookId);
}
