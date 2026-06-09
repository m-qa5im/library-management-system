using backend.DTOs;
using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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
            group.MapPut("/{id:int}", async (int id, [FromBody] MemberUpdateDto dto, IGenericRepository<Member> memberRepo) =>
            {
                var member = await memberRepo.GetByIdAsync(id);
                if (member == null) return Results.NotFound();

                if (!string.IsNullOrWhiteSpace(dto.Status)) member.Status = dto.Status;
                member.UpdatedAt = DateTime.UtcNow;

                memberRepo.Update(member);
                await memberRepo.SaveChangesAsync();
                return Results.Ok(member);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }
}