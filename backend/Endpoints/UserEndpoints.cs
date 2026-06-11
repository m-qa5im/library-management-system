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

                var sanitizedEmail = dto.Email.Trim().ToLowerInvariant();

                // 1. Email Format Validation
                var emailRegex = new System.Text.RegularExpressions.Regex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", System.Text.RegularExpressions.RegexOptions.Compiled);
                if (!emailRegex.IsMatch(sanitizedEmail))
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

                var userExists = await userRepo.FindAsync(u => u.Email == sanitizedEmail);
                if (userExists.Any())
                {
                    return Results.BadRequest("A user record with this email address already exists.");
                }

                // SECURE MECHANISM: Compute a one-way salt and hash of the text password
                string secureHash = BCryptNet.HashPassword(dto.Password, workFactor: 11);

                var newUser = new User
                {
                    FullName = dto.FullName.Trim(),
                    Email = sanitizedEmail,
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
            group.MapPost("/login", async ([FromBody] UserLoginDto dto, 
                IGenericRepository<User> userRepo, 
                IGenericRepository<Member> memberRepo,
                IConfiguration config) =>
            {
                var sanitizedEmail = (dto.Email ?? "").Trim().ToLowerInvariant();

                // Query primarily by email match first to pull matching profile entry
                var users = await userRepo.FindAsync(u => u.Email == sanitizedEmail);
                var user = users.FirstOrDefault();

                // SECURE MECHANISM: Verify clear-text login string against database hash entry
                if (user == null || !BCryptNet.Verify(dto.Password, user.PasswordHash))
                {
                    return Results.Json(new { error = "Invalid email identity or invalid account password credentials." }, statusCode: 401);
                }

                if (!user.IsActive)
                {
                    return Results.Json(new { error = "Your account has been deactivated. Please contact the administrator." }, statusCode: 403);
                }

                if (user.Role == "Member")
                {
                    var members = await memberRepo.FindAsync(m => m.UserId == user.Id);
                    var member = members.FirstOrDefault();
                    if (member != null && member.Status == "Suspended")
                    {
                        return Results.Json(new { error = "Your library membership is currently suspended. Please contact administration." }, statusCode: 403);
                    }
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

            // ==========================================================
            // 👤 GET /users/{userId} - Fetch single user profile (Self/Admin only)
            // ==========================================================
            group.MapGet("/{userId:int}", async (int userId, IGenericRepository<User> userRepo, ClaimsPrincipal userPrincipal) =>
            {
                var currentUserIdClaim = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = userPrincipal.FindFirst(ClaimTypes.Role)?.Value;

                if (currentUserRole != "Admin" && currentUserIdClaim != userId.ToString())
                {
                    return Results.Json(new { error = "Forbidden: You do not have permission to access this user profile." }, statusCode: 403);
                }

                var user = await userRepo.GetByIdAsync(userId);
                if (user == null)
                {
                    return Results.NotFound("User not found.");
                }

                return Results.Ok(new { user.Id, user.FullName, user.Email, user.Role });
            }).RequireAuthorization();

            // ==========================================================
            // ✍️ PUT /users/{userId} - Update user profile details (Self/Admin only)
            // ==========================================================
            group.MapPut("/{userId:int}", async (int userId, [FromBody] UserUpdateDto dto, IGenericRepository<User> userRepo, ClaimsPrincipal userPrincipal) =>
            {
                var currentUserIdClaim = userPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserRole = userPrincipal.FindFirst(ClaimTypes.Role)?.Value;

                if (currentUserRole != "Admin" && currentUserIdClaim != userId.ToString())
                {
                    return Results.Json(new { error = "Forbidden: You do not have permission to modify this user profile." }, statusCode: 403);
                }

                var user = await userRepo.GetByIdAsync(userId);
                if (user == null)
                {
                    return Results.NotFound("User not found.");
                }

                // 1. Update Full Name
                if (!string.IsNullOrWhiteSpace(dto.FullName))
                {
                    user.FullName = dto.FullName.Trim();
                }

                // 2. Update Email Address
                if (!string.IsNullOrWhiteSpace(dto.Email))
                {
                    var sanitizedEmail = dto.Email.Trim().ToLowerInvariant();
                    var emailRegex = new System.Text.RegularExpressions.Regex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", System.Text.RegularExpressions.RegexOptions.Compiled);
                    if (!emailRegex.IsMatch(sanitizedEmail))
                    {
                        return Results.BadRequest("Invalid email address format.");
                    }

                    if (sanitizedEmail != user.Email)
                    {
                        var emailExists = await userRepo.FindAsync(u => u.Email == sanitizedEmail);
                        if (emailExists.Any())
                        {
                            return Results.BadRequest("A user record with this email address already exists.");
                        }
                        user.Email = sanitizedEmail;
                    }
                }

                // 3. Optional Password Rotation
                if (!string.IsNullOrEmpty(dto.NewPassword))
                {
                    if (string.IsNullOrEmpty(dto.CurrentPassword))
                    {
                        return Results.BadRequest("Current password is required to change password.");
                    }

                    if (!BCryptNet.Verify(dto.CurrentPassword, user.PasswordHash))
                    {
                        return Results.BadRequest("Incorrect current password.");
                    }

                    if (dto.NewPassword.Length < 6)
                    {
                        return Results.BadRequest("New password must contain at least 6 characters.");
                    }

                    string secureHash = BCryptNet.HashPassword(dto.NewPassword, workFactor: 11);
                    user.PasswordHash = secureHash;
                }

                user.UpdatedAt = DateTime.UtcNow;
                userRepo.Update(user);
                await userRepo.SaveChangesAsync();

                return Results.Ok(new
                {
                    user.Id,
                    user.FullName,
                    user.Email,
                    user.Role,
                    Message = "Account profile settings updated successfully."
                });
            }).RequireAuthorization();
        }
    }
}