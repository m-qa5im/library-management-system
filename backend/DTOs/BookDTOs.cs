namespace backend.DTOs
{
    
    public record CreateBookDTO(
        string Title,
        string Author,
        string Category,
        string? Description
    );

    
    public record BookResponseDTO(
        int Id,
        string Title,
        string Author,
        string Category,
        string AvailabilityStatus
    );

    public record BookUpdateDto(string? Title, string? Author, string? Category, string? Description, string? AvailabilityStatus);
}