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
                var totalBooks = await dbContext.Books.CountAsync();
                var totalMembers = await dbContext.Members.CountAsync();
                var borrowedBooks = await dbContext.Books.CountAsync(b => b.AvailabilityStatus == "Issued");
                var availableBooks = await dbContext.Books.CountAsync(b => b.IsActive && b.AvailabilityStatus == "Available");

                return Results.Ok(new
                {
                    TotalBooks = totalBooks,
                    TotalMembers = totalMembers,
                    BorrowedBooks = borrowedBooks,
                    AvailableBooks = availableBooks
                });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }
}
