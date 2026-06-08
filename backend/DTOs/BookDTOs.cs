namespace backend.DTOs
{
    // Payload accepted when adding a new book to the library system
    public record CreateBookDTO(
        string Title,
        string Author,
        string Category,
        string? Description
    );

    // Payload sent back to the frontend/client application
    public record BookResponseDTO(
        int Id,
        string Title,
        string Author,
        string Category,
        string AvailabilityStatus
    );
}