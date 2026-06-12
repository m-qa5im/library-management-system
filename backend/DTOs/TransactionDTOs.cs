using System;

namespace backend.DTOs
{
    public record IssueBookDto(int BookId, int MemberId, DateTime? IssueDate, DateTime? DueDate);
    public record ReturnBookDto(int BookId, int MemberId);
    public record ReturnBookTransactionDto(DateTime? ReturnDate);
    public record BorrowBookDto(int BookId);
    public record RequestBorrowDto(int BookId);
}
