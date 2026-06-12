using System.Text.RegularExpressions;

namespace backend.Helpers
{
    public static class ValidationHelper
    {
        private static readonly Regex EmailRegex = new Regex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", RegexOptions.Compiled);

        public static bool IsValidEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return false;
            return EmailRegex.IsMatch(email);
        }

        public static string? ValidatePassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
            {
                return "Password must contain at least 8 characters.";
            }
            if (!password.Any(char.IsUpper))
            {
                return "Password must contain at least one uppercase letter.";
            }
            if (!password.Any(char.IsLower))
            {
                return "Password must contain at least one lowercase letter.";
            }
            if (!password.Any(char.IsDigit))
            {
                return "Password must contain at least one numeric digit.";
            }
            return null;
        }
    }
}
