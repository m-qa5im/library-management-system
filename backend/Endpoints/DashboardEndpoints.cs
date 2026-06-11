using backend.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Endpoints
{
    public static class DashboardEndpoints
    {
        public static void MapDashboardEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/dashboard");

            // GET /dashboard/stats - Fetch summary metrics (Admin only)
            group.MapGet("/stats", async (AppDbContext dbContext) =>
            {
                var totalBooks = await dbContext.Books.SumAsync(b => b.TotalQuantity);
                var totalMembers = await dbContext.Members.CountAsync();
                var borrowedBooks = await dbContext.Books.SumAsync(b => b.TotalQuantity - b.AvailableQuantity);
                var availableBooks = await dbContext.Books.Where(b => b.IsActive).SumAsync(b => b.AvailableQuantity);
                var exhaustedTitlesCount = await dbContext.Books.CountAsync(b => b.AvailableQuantity == 0 && b.IsActive);

                var topMembers = await dbContext.BookTransactions
                    .Where(t => t.Status == "Issued" || t.Status == "Returned")
                    .GroupBy(t => new { t.MemberId, t.Member.User.FullName, t.Member.MemberCode })
                    .Select(g => new
                    {
                        MemberId = g.Key.MemberId,
                        FullName = g.Key.FullName,
                        MemberCode = g.Key.MemberCode,
                        CheckoutCount = g.Count()
                    })
                    .OrderByDescending(x => x.CheckoutCount)
                    .Take(5)
                    .ToListAsync();

                var topBooks = await dbContext.BookTransactions
                    .Where(t => t.Status == "Issued" || t.Status == "Returned")
                    .GroupBy(t => new { t.BookId, t.Book.Title, t.Book.Author, t.Book.AvailableQuantity })
                    .Select(g => new
                    {
                        BookId = g.Key.BookId,
                        Title = g.Key.Title,
                        Author = g.Key.Author,
                        AvailableQuantity = g.Key.AvailableQuantity,
                        CheckoutCount = g.Count()
                    })
                    .OrderByDescending(x => x.CheckoutCount)
                    .Take(5)
                    .ToListAsync();

                return Results.Ok(new
                {
                    TotalBooks = totalBooks,
                    TotalMembers = totalMembers,
                    BorrowedBooks = borrowedBooks,
                    AvailableBooks = availableBooks,
                    ExhaustedTitlesCount = exhaustedTitlesCount,
                    TopMembers = topMembers,
                    TopBooks = topBooks
                });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }
}
