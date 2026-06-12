using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Member> Members { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<BookTransaction> BookTransactions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure database performance indexes
            modelBuilder.Entity<Book>().HasIndex(b => b.Isbn);
            modelBuilder.Entity<Member>().HasIndex(m => m.MemberCode);
            modelBuilder.Entity<BookTransaction>().HasIndex(t => t.BookId);
            modelBuilder.Entity<BookTransaction>().HasIndex(t => t.MemberId);

            // Enforce explicit mapping constraints via Fluent API
            
            // 1. Configure 1:0..1 Relationship (Users <-> Members)
            modelBuilder.Entity<User>()
                .HasOne(u => u.MemberProfile)
                .WithOne(m => m.User)
                .HasForeignKey<Member>(m => m.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Member>()
                .Navigation(m => m.User)
                .AutoInclude();

            // 2. Configure Many-to-One: Transactions -> Books
            modelBuilder.Entity<BookTransaction>()
                .HasOne(t => t.Book)
                .WithMany(b => b.Transactions)
                .HasForeignKey(t => t.BookId)
                .OnDelete(DeleteBehavior.Restrict);

            // 3. Configure Many-to-One: Transactions -> Members
            modelBuilder.Entity<BookTransaction>()
                .HasOne(t => t.Member)
                .WithMany(m => m.Transactions)
                .HasForeignKey(t => t.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}