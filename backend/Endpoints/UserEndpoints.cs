using backend.Interfaces;
using backend.Models;
using backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using BCryptNet = BCrypt.Net.BCrypt; // Standard cryptographic engine alias

namespace backend.Endpoints
{
    public static class UserEndpoints
    {
        public static void MapUserEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/users");

            // ==========================================================
            // 🟩 POST /users/register - Create a new user identity with hashing
            // ==========================================================
            group.MapPost("/register", async ([FromBody] UserRegisterDto dto, IGenericRepository<User> userRepo) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    return Results.BadRequest("Email and Password fields are mandatory.");
                }

                var userExists = await userRepo.FindAsync(u => u.Email == dto.Email);
                if (userExists.Any())
                {
                    return Results.BadRequest("A user record with this email address already exists.");
                }

                // SECURE MECHANISM: Compute a one-way salt and hash of the text password
                string secureHash = BCryptNet.HashPassword(dto.Password, workFactor: 11);

                var newUser = new User
                {
                    FullName = dto.FullName,
                    Email = dto.Email,
                    PasswordHash = secureHash, // Store the un-reversible mathematical string footprint
                    Role = dto.Role,
                    IsActive = true
                };

                await userRepo.AddAsync(newUser);
                await userRepo.SaveChangesAsync();

                return Results.Created($"/users/{newUser.Id}", new { newUser.Id, newUser.Email, newUser.Role });
            });

            // ==========================================================
            // 🔑 POST /users/login - Verify hashed credentials securely
            // ==========================================================
            group.MapPost("/login", async ([FromBody] UserLoginDto dto, IGenericRepository<User> userRepo) =>
            {
                // Query primarily by email match first to pull matching profile entry
                var users = await userRepo.FindAsync(u => u.Email == dto.Email);
                var user = users.FirstOrDefault();

                // SECURE MECHANISM: Verify clear-text login string against database hash entry
                if (user == null || !user.IsActive || !BCryptNet.Verify(dto.Password, user.PasswordHash))
                {
                    return Results.Json(new { error = "Invalid email identity or invalid account password credentials." }, statusCode: 401);
                }

                return Results.Ok(new { Message = "Authentication verified successfully.", UserId = user.Id, Role = user.Role, Name = user.FullName });
            });

            // ==========================================================
            // 🟨 GET /users/{userId}/member-profile - Link login identity to library profile
            // ==========================================================
            group.MapGet("/{userId:int}/member-profile", async (int userId, IGenericRepository<Member> memberRepo) =>
            {
                var profiles = await memberRepo.FindAsync(m => m.UserId == userId);
                var profile = profiles.FirstOrDefault();

                if (profile == null)
                {
                    return Results.NotFound("No library member profile associated with this user identity.");
                }

                return Results.Ok(profile);
            });
        }
    }
}