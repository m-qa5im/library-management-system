using backend.DTOs;
using backend.Interfaces;
using backend.Models;
using backend.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Endpoints
{
    public static class MemberEndpoints
    {
        public static void MapMemberEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/members");

            // GET /members - View all registered members (Admin only)
            group.MapGet("/", async (IGenericRepository<Member> memberRepo) =>
            {
                var members = await memberRepo.GetAllAsync();
                return Results.Ok(members);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /members/{id} - View single member profile (Admin only)
            group.MapGet("/{id:int}", async (int id, IGenericRepository<Member> memberRepo) =>
            {
                var member = await memberRepo.GetByIdAsync(id);
                return member != null ? Results.Ok(member) : Results.NotFound();
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // POST /members - Add a new member profile linkage (Admin only)
            group.MapPost("/", async ([FromBody] MemberCreateDto dto, IGenericRepository<Member> memberRepo) =>
            {
                var newMember = new Member
                {
                    UserId = dto.UserId,
                    MemberCode = dto.MemberCode,
                    Status = "Active"
                };
                await memberRepo.AddAsync(newMember);
                await memberRepo.SaveChangesAsync();
                return Results.Created($"/members/{newMember.Id}", newMember);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // PUT /members/{id} - Update member account profile parameters (e.g., suspend card) (Admin only)
            group.MapPut("/{id:int}", async (int id, [FromBody] MemberUpdateDto dto, IGenericRepository<Member> memberRepo, IGenericRepository<User> userRepo) =>
            {
                var member = await memberRepo.GetByIdAsync(id);
                if (member == null) return Results.NotFound();

                if (!string.IsNullOrWhiteSpace(dto.Status)) member.Status = dto.Status;

                var user = member.User;
                if (user == null)
                {
                    user = await userRepo.GetByIdAsync(member.UserId);
                }

                if (user != null)
                {
                    bool userUpdated = false;

                    if (!string.IsNullOrWhiteSpace(dto.Status))
                    {
                        user.IsActive = (dto.Status == "Active");
                        userUpdated = true;
                    }

                    if (!string.IsNullOrWhiteSpace(dto.FullName))
                    {
                        user.FullName = dto.FullName.Trim();
                        userUpdated = true;
                    }

                    if (!string.IsNullOrWhiteSpace(dto.Email))
                    {
                        var sanitizedEmail = dto.Email.Trim().ToLowerInvariant();
                        if (!ValidationHelper.IsValidEmail(sanitizedEmail))
                        {
                            return Results.BadRequest("Invalid email address format.");
                        }

                        var userExists = await userRepo.FindAsync(u => u.Email == sanitizedEmail && u.Id != member.UserId);
                        if (userExists.Any())
                        {
                            return Results.BadRequest("A user record with this email address already exists.");
                        }

                        user.Email = sanitizedEmail;
                        userUpdated = true;
                    }

                    if (!string.IsNullOrWhiteSpace(dto.Password))
                    {
                        var passwordError = ValidationHelper.ValidatePassword(dto.Password);
                        if (passwordError != null)
                        {
                            return Results.BadRequest(passwordError);
                        }

                        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 11);
                        userUpdated = true;
                    }

                    if (userUpdated)
                    {
                        user.UpdatedAt = DateTime.UtcNow;
                        userRepo.Update(user);
                    }
                }

                member.UpdatedAt = DateTime.UtcNow;
                memberRepo.Update(member);
                await memberRepo.SaveChangesAsync();
                return Results.Ok(member);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // DELETE /members/{id} - Delete a member profile (Admin only)
            group.MapDelete("/{id:int}", async (int id, IGenericRepository<Member> memberRepo) =>
            {
                var member = await memberRepo.GetByIdAsync(id);
                if (member == null) return Results.NotFound();

                try
                {
                    memberRepo.Delete(member);
                    await memberRepo.SaveChangesAsync();
                    return Results.Ok(new { Message = $"Member with ID {id} was successfully deleted." });
                }
                catch (Exception)
                {
                    return Results.BadRequest("Cannot delete member. Ensure they have no active loan records or transactions associated with their profile.");
                }
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });

            // GET /members/search - Paginated search by name or email (Admin only)
            group.MapGet("/search", async ([FromQuery] string? q, AppDbContext dbContext, [FromQuery] int page = 1, [FromQuery] int pageSize = 10) =>
            {
                var query = dbContext.Members.Include(m => m.User).AsQueryable();
                if (!string.IsNullOrWhiteSpace(q))
                {
                    var term = q.Trim().ToLower();
                    query = query.Where(m => m.MemberCode.ToLower().Contains(term) ||
                                             m.User.FullName.ToLower().Contains(term) ||
                                             m.User.Email.ToLower().Contains(term));
                }
                var total = await query.CountAsync();
                var items = await query.OrderBy(m => m.User.FullName).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
                return Results.Ok(new { Items = items, TotalCount = total });
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }
}