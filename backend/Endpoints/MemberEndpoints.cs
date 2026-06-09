using backend.DTOs;
using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Endpoints
{
    public static class MemberEndpoints
    {
        public static void MapMemberEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/members");

            // GET /members - View all registered members
            group.MapGet("/", async (IGenericRepository<Member> memberRepo) =>
            {
                var members = await memberRepo.GetAllAsync();
                return Results.Ok(members);
            });

            // GET /members/{id} - View single member profile
            group.MapGet("/{id:int}", async (int id, IGenericRepository<Member> memberRepo) =>
            {
                var member = await memberRepo.GetByIdAsync(id);
                return member != null ? Results.Ok(member) : Results.NotFound();
            });

            // POST /members - Add a new member profile linkage
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
            });

            // PUT /members/{id} - Update member account profile parameters (e.g., suspend card)
            group.MapPut("/{id:int}", async (int id, [FromBody] MemberUpdateDto dto, IGenericRepository<Member> memberRepo) =>
            {
                var member = await memberRepo.GetByIdAsync(id);
                if (member == null) return Results.NotFound();

                if (!string.IsNullOrWhiteSpace(dto.Status)) member.Status = dto.Status;
                member.UpdatedAt = DateTime.UtcNow;

                memberRepo.Update(member);
                await memberRepo.SaveChangesAsync();
                return Results.Ok(member);
            });
        }
    }
}