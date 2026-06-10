using backend.Interfaces;
using backend.Models;
using backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using BCryptNet = BCrypt.Net.BCrypt; // Standard cryptographic engine alias
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authorization;

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
            group.MapPost("/register", async ([FromBody] UserRegisterDto dto, 
                IGenericRepository<User> userRepo,
                IGenericRepository<Member> memberRepo) =>
            {
                if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    return Results.BadRequest("Email and Password fields are mandatory.");
                }

                // 1. Email Format Validation
                var emailRegex = new System.Text.RegularExpressions.Regex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", System.Text.RegularExpressions.RegexOptions.Compiled);
                if (!emailRegex.IsMatch(dto.Email.Trim()))
                {
                    return Results.BadRequest("Invalid email address format.");
                }

                // 2. Password Strength Validation
                if (dto.Password.Length < 8)
                {
                    return Results.BadRequest("Password must contain at least 8 characters.");
                }
                if (!dto.Password.Any(char.IsUpper))
                {
                    return Results.BadRequest("Password must contain at least one uppercase letter.");
                }
                if (!dto.Password.Any(char.IsLower))
                {
                    return Results.BadRequest("Password must contain at least one lowercase letter.");
                }
                if (!dto.Password.Any(char.IsDigit))
                {
                    return Results.BadRequest("Password must contain at least one numeric digit.");
                }

                var trimmedEmail = dto.Email.Trim();
                var userExists = await userRepo.FindAsync(u => u.Email == trimmedEmail);
                if (userExists.Any())
                {
                    return Results.BadRequest("A user record with this email address already exists.");
                }

                // SECURE MECHANISM: Compute a one-way salt and hash of the text password
                string secureHash = BCryptNet.HashPassword(dto.Password, workFactor: 11);

                var newUser = new User
                {
                    FullName = dto.FullName.Trim(),
                    Email = trimmedEmail,
                    PasswordHash = secureHash, // Store the un-reversible mathematical string footprint
                    Role = dto.Role,
                    IsActive = true
                };

                await userRepo.AddAsync(newUser);
                await userRepo.SaveChangesAsync();

                if (newUser.Role == "Member")
                {
                    var newMember = new Member
                    {
                        UserId = newUser.Id,
                        MemberCode = $"MEM{newUser.Id:D4}",
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await memberRepo.AddAsync(newMember);
                    await memberRepo.SaveChangesAsync();
                }

                return Results.Created($"/users/{newUser.Id}", new { newUser.Id, newUser.Email, newUser.Role });
            });

            // ==========================================================
            // 🔑 POST /users/login - Verify hashed credentials securely and issue JWT
            // ==========================================================
            group.MapPost("/login", async ([FromBody] UserLoginDto dto, IGenericRepository<User> userRepo, IConfiguration config) =>
            {
                // Query primarily by email match first to pull matching profile entry
                var users = await userRepo.FindAsync(u => u.Email == dto.Email);
                var user = users.FirstOrDefault();

                // SECURE MECHANISM: Verify clear-text login string against database hash entry
                if (user == null || !user.IsActive || !BCryptNet.Verify(dto.Password, user.PasswordHash))
                {
                    return Results.Json(new { error = "Invalid email identity or invalid account password credentials." }, statusCode: 401);
                }

                // Generate signed JWT token
                var tokenHandler = new JwtSecurityTokenHandler();
                var jwtSettings = config.GetSection("Jwt");
                var key = Encoding.UTF8.GetBytes(jwtSettings["Key"] ?? throw new InvalidOperationException("JWT Key is not configured."));

                var tokenDescriptor = new SecurityTokenDescriptor
                {
                    Subject = new ClaimsIdentity(new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                        new Claim(ClaimTypes.Name, user.FullName),
                        new Claim(ClaimTypes.Email, user.Email),
                        new Claim(ClaimTypes.Role, user.Role)
                    }),
                    Expires = DateTime.UtcNow.AddDays(1),
                    Issuer = jwtSettings["Issuer"],
                    Audience = jwtSettings["Audience"],
                    SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
                };

                var token = tokenHandler.CreateToken(tokenDescriptor);
                var tokenString = tokenHandler.WriteToken(token);

                return Results.Ok(new 
                { 
                    Message = "Authentication verified successfully.", 
                    UserId = user.Id, 
                    Role = user.Role, 
                    Name = user.FullName,
                    Token = tokenString
                });
            });

            // ==========================================================
            // 🟨 GET /users/{userId}/member-profile - Link login identity to library profile
            // ==========================================================
            group.MapGet("/{userId:int}/member-profile", async (int userId, IGenericRepository<Member> memberRepo, ClaimsPrincipal userPrincipal) =>
            {
                var currentUserIdClaim = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = userPrincipal.FindFirst(ClaimTypes.Role)?.Value;

                // Enforce that Members can only access their own profile. Admins can access any profile.
                if (currentUserRole != "Admin" && currentUserIdClaim != userId.ToString())
                {
                    return Results.Json(new { error = "Forbidden: You do not have permission to access this member profile." }, statusCode: 403);
                }

                var profiles = await memberRepo.FindAsync(m => m.UserId == userId);
                var profile = profiles.FirstOrDefault();

                if (profile == null)
                {
                    // Safe Fallback: Auto-create member profile for existing registered users of role Member
                    profile = new Member
                    {
                        UserId = userId,
                        MemberCode = $"MEM{userId:D4}",
                        Status = "Active",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await memberRepo.AddAsync(profile);
                    await memberRepo.SaveChangesAsync();
                }

                return Results.Ok(profile);
            }).RequireAuthorization();

            // ==========================================================
            // 👥 GET /users - Fetch all users in the system (Admin only)
            // ==========================================================
            group.MapGet("/", async (IGenericRepository<User> userRepo) =>
            {
                var users = await userRepo.GetAllAsync();
                var userDtos = users.Select(u => new { u.Id, u.FullName, u.Email, u.Role, u.IsActive });
                return Results.Ok(userDtos);
            }).RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" });
        }
    }
}