namespace backend.DTOs
{
    public record BookCreateDto(
        string Title,
        string Author,
        string Category,
        string? Description,
        string? CoverImageUrl,
        string? Isbn,
        int? TotalQuantity
    );

    public record BookResponseDTO(
        int Id,
        string Title,
        string Author,
        string Category,
        string AvailabilityStatus,
        int TotalQuantity,
        int AvailableQuantity,
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
        string? Isbn,
        int? TotalQuantity,
        int? AvailableQuantity
    );
}