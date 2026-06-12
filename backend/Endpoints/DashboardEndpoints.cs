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
                var bookStats = await dbContext.Books
                    .AsNoTracking()
                    .Where(b => b.IsActive)
                    .GroupBy(_ => 1)
                    .Select(g => new
                    {
                        TotalBooks = g.Sum(b => b.TotalQuantity),
                        BorrowedBooks = g.Sum(b => b.TotalQuantity - b.AvailableQuantity),
                        AvailableBooks = g.Sum(b => b.AvailableQuantity),
                        ExhaustedTitlesCount = g.Count(b => b.AvailableQuantity == 0)
                    })
                    .FirstOrDefaultAsync();

                var totalBooks = bookStats?.TotalBooks ?? 0;
                var borrowedBooks = bookStats?.BorrowedBooks ?? 0;
                var availableBooks = bookStats?.AvailableBooks ?? 0;
                var exhaustedTitlesCount = bookStats?.ExhaustedTitlesCount ?? 0;

                var totalMembers = await dbContext.Members.AsNoTracking().CountAsync();

                var topMembers = await dbContext.BookTransactions
                    .AsNoTracking()
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
                    .AsNoTracking()
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
