using backend.Models;

namespace backend.Interfaces
{
    public interface IBookRepository : IGenericRepository<Book>
    {
        // Custom domain contract to check shelf availability without loading entire tables
        Task<IEnumerable<Book>> GetAvailableBooksAsync();
    }
}