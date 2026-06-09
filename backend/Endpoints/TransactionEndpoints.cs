using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace backend.Endpoints
{
    public static class TransactionEndpoints
    {
        public static void MapTransactionEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/transactions");

            // POST /transactions/issue - Admin only
            group.MapPost("/issue", async ([FromBody] IssueBookDto dto, 
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

                // 2. Verify Book exists and is physically on the shelf
                var book = await bookRepo.GetByIdAsync(dto.BookId);
                if (book == null || !book.IsActive || book.AvailabilityStatus != "Available")
                {
                    return Results.BadRequest("The requested book catalog asset is currently unavailable for loan.");
                }

                // 3. Mutate the Book Inventory Asset State
                book.AvailabilityStatus = "Issued";
                book.UpdatedAt = DateTime.UtcNow;
                bookRepo.Update(book);

                // 4. Generate the Circulation Ledger Entry (Enforcing the 14-Day Due Date Matrix)
                var transaction = new BookTransaction
                {
                    BookId = dto.BookId,
                    MemberId = dto.MemberId,
                    IssueDate = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow.AddDays(14), // Rule: Standard 2-week lease period
                    Status = "Issued",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await transactionRepo.AddAsync(transaction);
                
                // Save both changes atomically within a single unified SQL transaction block
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
                    book.AvailabilityStatus = "Available";
                    book.UpdatedAt = DateTime.UtcNow;
                    bookRepo.Update(book);
                }

                await transactionRepo.SaveChangesAsync();
                return Results.Ok(new { Message = "Book returned and inventory updated successfully." });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /transactions/my-loans/{memberId} - Fetch all active checked-out titles for a member (Self-user or Admin)
            group.MapGet("/my-loans/{memberId:int}", async (int memberId, 
                IGenericRepository<BookTransaction> transactionRepo,
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
                var activeLoans = await transactionRepo.FindAsync(t => t.MemberId == memberId && t.ReturnDate == null);
                return Results.Ok(activeLoans);
            }).RequireAuthorization();

            // GET /transactions - Fetch all library transaction records (Admin Overview Log)
            group.MapGet("/", async (IGenericRepository<BookTransaction> transactionRepo) =>
            {
                var histories = await transactionRepo.GetAllAsync();
                return Results.Ok(histories);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }

    // Modular Data Transfer Object Contracts
    public record IssueBookDto(int BookId, int MemberId);
    public record ReturnBookDto(int BookId, int MemberId);
}