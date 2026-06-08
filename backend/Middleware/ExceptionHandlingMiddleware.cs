using System.Net;
using System.Text.Json;

namespace backend.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Pass the HTTP context request along to the next operational execution module
                await _next(context);
            }
            catch (Exception ex)
            {
                // Securely capture the internal stack trace data locally inside your server console logs
                _logger.LogError(ex, "An unhandled execution crash occurred in the application pipeline.");
                
                // Route the custom, scrubbed JSON envelope back up to the frontend consumer channel
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            context.Response.ContentType = "application/json";
            
            // Default to a Standard 500 Internal Server Error status block
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var responsePayload = new
            {
                StatusCode = context.Response.StatusCode,
                Message = "A critical system error occurred while processing your request.",
                DetailedError = exception.Message // Handy for debugging in local staging runs
            };

            var jsonResult = JsonSerializer.Serialize(responsePayload);
            return context.Response.WriteAsync(jsonResult);
        }
    }
}