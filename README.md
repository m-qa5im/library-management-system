# Library Management System (LMS)

A modern, high-performance, and secure library catalog and operations platform designed for administrators (librarians) and members. This project features separate portals, transactional borrow-and-return circulation ledgers, optimistic database concurrency controls, server-side in-memory caching, and JWT authentication.

---

## 🛠️ Technology Stack

### Backend
* **Runtime**: .NET 8.0 SDK
* **Database**: PostgreSQL (relational database)
* **ORM**: Entity Framework Core (EF Core)
* **Authentication**: JWT (JSON Web Tokens) & role-based route guards
* **Security Hashing**: BCrypt.Net

### Frontend
* **Core Library**: React 19 (using hooks and contextual state providers)
* **Build Engine**: Vite 8.0
* **Styling**: Tailwind CSS v4 (vanilla flex/grid setups, custom layouts)
* **Routing**: React Router v7 (configured with Protected Guards and lazy-loaded routes)

---

## 🚀 Key Features & Architectural Highlights

### 1. Robust Security & Data Protection
* **Role-Based Guards**: Separate dashboard and action menus for `Admin` (Librarian) and `Member` users.
* **Credential Protection**: Implements `[JsonIgnore]` on database user structures to prevent password hash serialization leakage in API responses.
* **Ledger Security**: BCrypt password hashing and JWT token validation on all transaction interfaces.

### 2. High-Performance Querying & Caching
* **Relational Database Indexing**: Fluent API indexes configured on high-cardinality columns (`Book.Isbn`, `Member.MemberCode`, `BookTransaction.BookId`, `BookTransaction.MemberId`) to ensure O(1) query lookups on join operations.
* **Server-Side In-Memory Caching**: `IMemoryCache` registered and integrated on heavy read endpoints (`GET /books/available` and `GET /books/catalog`) to bypass direct database roundtrips.
* **Proactive Eviction**: Cache values are automatically evicted on write actions (`POST /books`, `PUT /books/{id}`, `DELETE /books/{id}`, approvals, loans, returns) to guarantee catalog parity.

### 3. Concurrency & Inventory Atomicity
* **Optimistic Concurrency**: Confirms atomic inventory updates using EF Core `[ConcurrencyCheck]` tokens on book stock levels.
* **DbUpdateConcurrencyException Handling**: Ledger endpoints catch concurrency exceptions to roll back checkout states and return `409 Conflict` payloads rather than overallocating assets.

### 4. Smart Deletion & Reactivation Flow
* **Circulation Integrity**: Implements logic checks on the `DELETE /books/{id}` endpoint:
  * **Blocked Deletion**: If a book has active checkouts or pending requests (`Status == "Issued" || Status == "Pending"`), deletion is rejected with a clean `400 Bad Request`.
  * **Soft-Deletion**: If a book has historical transaction logs (`Returned` or `Rejected`), it is flagged as inactive (`IsActive = false`) to maintain FK relational logs database integrity.
  * **Hard-Deletion**: If a book has no historical logs, it is permanently purged.
* **Auto-Reactivation**: If an administrator tries to add a book via `POST /books` with an ISBN matching a soft-deleted book, the API reactivates the record, updates its fields, and resets stock numbers.
* **Filter Exclusions**: Administrative dashboard statistics, catalog listings, and member search queries exclude inactive books to maintain catalog accuracy.

### 5. Frontend Optimizations
* **Route Code-Splitting**: Route lazy-loading (`lazy`, `Suspense`) optimizes frontend bundles.
* **Typing Debouncing**: Member catalog search includes a 300ms debouncing window to reduce keystroke API calls.
* **Image Fallbacks**: Custom wrapper component `ImageWithFallback` handles loading states and automatically loads Open Library Large book covers based on ISBN references, showing default SVG book covers if no image exists.
* **Refined Sizing**: Cover thumbnails inside tables are optimized using dedicated CSS container constraints (`.mdb-table-cover`) to ensure high-fidelity aspect ratios without squeezing.

---

## 📂 Project Directory Structure

```text
library-management-system/
├── backend/                   # ASP.NET Core Minimal Web API
│   ├── Data/                  # DbContext & Database Configurations
│   ├── DTOs/                  # Data Transfer Objects
│   ├── Endpoints/             # Routing Endpoints (Book, User, Member, Transaction)
│   ├── Models/                # EF Core Database Models
│   ├── Repositories/          # Repository Pattern Interfaces & Implementations
│   └── Program.cs             # API Startup Configuration
├── frontend/                  # React Single-Page Application (SPA)
│   ├── src/
│   │   ├── assets/            # Static Images & Icons
│   │   ├── components/        # Reusable UI Components
│   │   ├── context/           # React Context Providers (Auth, Toast)
│   │   ├── pages/             # Portal Views (Landing, Dashboard, MemberDashboard)
│   │   └── services/          # Fetch Service API Clients
│   └── package.json           # Scripts & Front-end Dependencies
└── LibraryManagementSystem.slnx # Solution file
```

---

## 🔧 Getting Started & Installation

### Prerequisites
* [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
* [Node.js (LTS version)](https://nodejs.org/)
* [PostgreSQL](https://www.postgresql.org/download/)

### 1. Database Configuration
1. Open [backend/appsettings.json](file:///c:/Users/Qasim/Desktop/library-management-system/backend/appsettings.json) and configure the `DefaultConnection` string with your PostgreSQL instance credentials:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Port=5432;Database=LMS;Username=postgres;Password=YOUR_PASSWORD;"
   }
   ```
2. Apply database migrations to generate database tables:
   ```bash
   cd backend
   dotnet ef database update
   ```

### 2. Run the Backend API
1. Launch the backend server:
   ```bash
   cd backend
   dotnet run
   ```
2. The backend server will startup on **`http://localhost:5117`**.

### 3. Run the React Frontend
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install client dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
4. The React application will boot on **`http://localhost:5173`**.

---

## 📑 API Reference

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/users/register` | `POST` | Public | Register a new user account (defaults to Member profile) |
| `/users/login` | `POST` | Public | Log in and return JWT token along with user profile claims |
| `/books` | `GET` | Admin | Fetch all active book inventory items |
| `/books` | `POST` | Admin | Add a new book (with quantity) or reactivate an archived book |
| `/books/{id}` | `PUT` | Admin | Update book specifications (ISBN checked globally) |
| `/books/{id}` | `DELETE`| Admin | Delete book (safe-checked for history / active borrows) |
| `/books/catalog` | `GET` | Authenticated | Fetch active books list (in-memory cached) |
| `/books/available`| `GET` | Public | Fetch available stock list (in-memory cached) |
| `/books/search` | `GET` | Authenticated | Perform paginated catalog search queries |
| `/dashboard/stats`| `GET` | Admin | Retrieve library metrics & top borrowing charts |
| `/transactions` | `GET` | Admin | Retrieve historical transaction logs ledger |
| `/transactions/issue`| `POST` | Admin | Directly issue a book copy to a member |
| `/transactions/return`| `POST` | Admin | Directly return a book copy from a member |
| `/transactions/borrow`| `POST` | Member | Directly checkout book self-service (Legacy) |
| `/transactions/request`| `POST` | Member | Submit a borrow request to the admin approval queue |
| `/transactions/pending`| `GET` | Admin | Fetch pending borrow requests queue |
| `/transactions/{id}/approve` | `POST` | Admin | Approve a pending borrow request (claims a book copy) |
| `/transactions/{id}/reject` | `POST` | Admin | Reject a pending borrow request (releases the copy) |
| `/transactions/my-loans/{id}`| `GET` | Self/Admin | Retrieve loan logs for a specific member profile |
| `/transactions/{id}/return`| `POST` | Admin | Process returns of active loans |
| `/transactions/active/search` | `GET` | Admin | Paginated search of active loans by query |
