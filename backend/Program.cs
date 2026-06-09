using backend.Data;
using backend.Endpoints; // Enforce our new module boundary
using backend.Interfaces;
using backend.Middleware;
using backend.Repositories;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Establish database context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register data abstractions
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IBookRepository, BookRepository>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "LMS API v1");
    });
}

app.UseHttpsRedirection();

app.MapUserEndpoints();
app.MapBookEndpoints();
app.MapMemberEndpoints();
app.MapTransactionEndpoints(); 

app.MapGet("/", () => "System running smoothly without API prefix boundaries.");

app.Run();