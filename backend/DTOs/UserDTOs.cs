namespace backend.DTOs
{
    public record UserRegisterDto(string FullName, string Email, string Password, string Role);
    public record UserLoginDto(string Email, string Password);
    public record UserUpdateDto(string FullName, string Email, string? CurrentPassword, string? NewPassword);
}