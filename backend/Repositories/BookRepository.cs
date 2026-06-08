using backend.Data;
using backend.Interfaces;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Repositories
{
    public class BookRepository : GenericRepository<Book>, IBookRepository
    {
        public BookRepository(AppDbContext context) : base(context) { }

        public async Task<IEnumerable<Book>> GetAvailableBooksAsync()
        {
            return await _dbSet
                .Where(b => b.IsActive && b.AvailabilityStatus == "Available")
                .ToListAsync();
        }
    }
}