using backend.Interfaces;
using backend.Models;
using Microsoft.AspNetCore.Mvc;

namespace backend.Endpoints
{
    public static class BookEndpoints
    {
        public static void MapBookEndpoints(this IEndpointRouteBuilder app)
        {
            var group = app.MapGroup("/books");

            // GET /api/books/available - Fetch current reading stock
            group.MapGet("/available", async (IBookRepository bookRepo) =>
            {
                var availableBooks = await bookRepo.GetAvailableBooksAsync();
                return Results.Ok(availableBooks);
            });

            // POST /api/books - Add a new asset to the catalog
            group.MapPost("/", async ([FromBody] BookCreateDto dto, IBookRepository bookRepo) =>
            {
                // Basic business logic validation
                if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Author))
                {
                    return Results.BadRequest("Title and Author fields are strictly mandatory.");
                }

                // Map incoming DTO network data straight into our underlying Database Model
                var newBook = new Book
                {
                    Title = dto.Title,
                    Author = dto.Author,
                    Category = dto.Category,
                    Description = dto.Description,
                    AvailabilityStatus = "Available",
                    IsActive = true
                };

                await bookRepo.AddAsync(newBook);
                await bookRepo.SaveChangesAsync();

                return Results.Created($"/books/{newBook.Id}", newBook);
            });
        }
    }

    // Modular Data Transfer Object (DTO) contract placed directly where it is consumed
    public record BookCreateDto(string Title, string Author, string Category, string? Description);
}