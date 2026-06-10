namespace backend.DTOs
{
    public record BookCreateDto(
        string Title,
        string Author,
        string Category,
        string? Description,
        string? CoverImageUrl,
        string? Isbn
    );

    public record BookResponseDTO(
        int Id,
        string Title,
        string Author,
        string Category,
        string AvailabilityStatus,
        string? CoverImageUrl,
        string? Isbn
    );

    public record BookUpdateDto(
        string? Title, 
        string? Author, 
        string? Category, 
        string? Description, 
        string? AvailabilityStatus, 
        string? CoverImageUrl,
        string? Isbn
    );
}