namespace backend.DTOs
{
    public record MemberCreateDto(int UserId, string MemberCode);
    public record MemberUpdateDto(string? Status, string? Password, string? FullName, string? Email);
}
