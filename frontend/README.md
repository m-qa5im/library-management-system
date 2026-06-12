# LMS Frontend Client (React)

A modern, responsive, and styled Single-Page Application (SPA) dashboard portal built as the client side of the Library Management System (LMS). It supports distinct dashboards, views, and action controllers for **Administrators** (Librarians) and **Members** (Readers).

---

## 🛠️ Tech Stack & Key Specs

* **Core Framework**: React 19 (using hooks and contextual state providers)
* **Build Engine**: Vite 8.0
* **Styling**: Tailwind CSS v4 (vanilla flex/grid setups, Harmonious tailwind configurations, and clean glassmorphism accents)
* **Routing**: React Router v7 (configured with Protected Guards and lazy-loaded routes)

---

## ⚙️ Project Setup & Installation

### 1. Prerequisites
Ensure you have [Node.js (LTS version)](https://nodejs.org/) installed.

### 2. Install Dependencies
Install all package dependencies:
```bash
npm install
```

### 3. Run Development Server
Boot up the local dev server:
```bash
npm run dev
```
The application will launch on **`http://localhost:5173`**.

### 4. Build Production Bundle
To compile production-optimized static assets inside the `dist/` directory:
```bash
npm run build
```

---

## 📂 Codebase Directory Overview

```text
frontend/
├── public/                 # Static public assets
├── src/
│   ├── assets/             # Brand logos & background layout banners
│   ├── components/         # Shared component widgets (Protected Route, Autocomplete, Icons)
│   ├── context/            # React Global State Providers:
│   │   ├── AuthContext.jsx # Logs authentication token claims & session status
│   │   └── ToastContext.jsx# Renders micro-animation toast alerts for API responses
│   ├── pages/              # Portal Views:
│   │   ├── LandingPage.jsx # Public guest landing page
│   │   ├── Login.jsx       # Login form with client-side validation
│   │   ├── Signup.jsx      # Signup form (minting unique Member Codes)
│   │   ├── Dashboard.jsx   # Admin management panel (Stats, Modals, Views)
│   │   └── MemberDashboard.jsx # Member catalog browsing & loans dashboard
│   ├── services/           # Service API Wrappers:
│   │   ├── apiClient.js    # Fetch client configurations & response parsing
│   │   ├── adminService.js # Admin operations endpoint calls (CRUD, approve/issue)
│   │   └── memberService.js# Member actions endpoint calls (catalog, borrow request)
│   ├── App.jsx             # Main router configuration (lazy loading & suspense fallback)
│   └── main.jsx            # React entry file
```

---

## 🔑 Portals & Component Architecture

### 1. Landing & Authentication
* **Landing Page**: Public dashboard showing platform features, tailored role specs, and CTA triggers.
* **Authentication Route Guards (`ProtectedRoute.jsx`)**: Checks token roles before resolving route requests. Blocks unauthorized members from accessing admin screens.

### 2. Admin Dashboard (`pages/Dashboard.jsx`)
Features a left sidebar view selector connecting the following sub-panels:
* **Dashboard View**: Displays summary analytics (Total Books, Available Copies, Borrowed Assets, Registered Members) and a quick action list.
* **Book Inventory (`BookInventoryPanel.jsx`)**: Admin book table with options to add new assets (custom quantity inputs supported), edit details, delete assets, view metadata cards, or export catalog data to CSV.
* **Member Directory (`MemberInventoryPanel.jsx`)**: Registry table for viewing members and managing account statuses (suspensions, profile updates).
* **Transactions Ledger (`TransactionPanel.jsx`)**: Checkout line registers showing active loans, due dates, return stamps, and check-out managers.
* **Circulation Queue (`CirculationQueuePanel.jsx`)**: Approval panel where admins can approve or reject pending member requests.

### 3. Member Dashboard (`pages/MemberDashboard.jsx`)
* **Catalog Discovery Grid**: Layout showing books with live availability chip indicators. Features 300ms search query debouncing to protect backend API load.
* **Request Borrow**: Trigger button submitting checkout requests directly to the librarian's pending queue. Transition statuses dynamically render.
* **My Borrowed Books**: History listing table showing checkout stamps, due dates, return dates, and overdue alerts.

---

## ⚡ Key Optimizations & Custom Integrations

* **Typing Debouncing**: Keystroke search events are debounced on a 300ms timer inside the member catalog to reduce backend database workload.
* **Responsive Layouts**: Full CSS styling breakpoints enable clean rendering across mobile, tablet, and widescreen devices.
* **Image Fallbacks**: Custom wrapper component `ImageWithFallback` handles loading states and automatically loads Open Library Large book covers based on ISBN references, showing default SVG book covers if no image exists.
* **Refined Sizing**: Cover thumbnails inside tables are optimized using dedicated CSS container constraints (`.mdb-table-cover`) to ensure high-fidelity aspect ratios without squeezing.
