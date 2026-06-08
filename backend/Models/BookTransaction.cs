using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace backend.Models
{
    [Table("book_transactions")]
    public class BookTransaction
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [Column("book_id")]
        public int BookId { get; set; }

        [Required]
        [Column("member_id")]
        public int MemberId { get; set; }

        [Required]
        [Column("issue_date")]
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;

        [Required]
        [Column("due_date")]
        public DateTime DueDate { get; set; }

        [Column("return_date")]
        public DateTime? ReturnDate { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("status")]
        public string Status { get; set; } = "Issued";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relational Links
        [ForeignKey("BookId")]
        public Book Book { get; set; } = null!;

        [ForeignKey("MemberId")]
        public Member Member { get; set; } = null!;
    }
}