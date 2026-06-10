using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("books")]
    public class Book
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("author")]
        public string Author { get; set; } = string.Empty;

        [Column("description")]
        public string? Description { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("availability_status")]
        public string AvailabilityStatus { get; set; } = "Available";

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(500)]
        [Column("cover_image_url")]
        public string? CoverImageUrl { get; set; }

        [MaxLength(20)]
        [Column("isbn")]
        public string? Isbn { get; set; }

        // Relational Links
        public ICollection<BookTransaction> Transactions { get; set; } = new List<BookTransaction>();
    }
}