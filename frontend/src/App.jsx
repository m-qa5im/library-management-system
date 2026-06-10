import { Routes, Route } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';

import MemberDashboard from './pages/MemberDashboard';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin-only routes */}
      <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Add future admin-only pages here */}
        {/* <Route path="/books" element={<BooksPage />} /> */}
        {/* <Route path="/members" element={<MembersPage />} /> */}
        {/* <Route path="/borrowings" element={<BorrowingsPage />} /> */}
      </Route>

      {/* Member-only routes */}
      <Route element={<ProtectedRoute allowedRoles={['Member']} />}>
        <Route path="/member-dashboard" element={<MemberDashboard />} />

        {/* Add future member-only pages here */}
        {/* <Route path="/catalog" element={<CatalogPage />} /> */}
        {/* <Route path="/my-borrowings" element={<MyBorrowingsPage />} /> */}
      </Route>

      {/* Fallback */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default App;