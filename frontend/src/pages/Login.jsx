import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getMemberProfile, loginUser } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

import './AuthPage.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [selectedRole, setSelectedRole] = useState('Member');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      return 'Email address is required.';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email.trim())) {
      return 'Invalid email address format.';
    }

    if (!formData.password.trim()) {
      return 'Password is required.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const loginResponse = await loginUser({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (!loginResponse?.userId || !loginResponse?.role) {
        toast.error('Invalid authentication response received from server.');
        return;
      }

      if (loginResponse.role !== selectedRole) {
        toast.error(
          `This account is registered as ${loginResponse.role}. Please select the correct account role.`
        );
        return;
      }

      if (loginResponse.role === 'Admin') {
        toast.success(loginResponse.message || 'Authentication verified successfully.');
        login({
          userId: loginResponse.userId,
          role: loginResponse.role,
          name: loginResponse.name,
          token: loginResponse.token,
        });

        navigate('/dashboard', { replace: true });
        return;
      }

      if (loginResponse.role === 'Member') {
        const memberProfile = await getMemberProfile(loginResponse.userId, loginResponse.token);

        toast.success(loginResponse.message || 'Authentication verified successfully.');
        login({
          userId: loginResponse.userId,
          role: loginResponse.role,
          name: loginResponse.name,
          token: loginResponse.token,
          memberId: memberProfile.id,
          memberCode: memberProfile.memberCode,
          memberStatus: memberProfile.status,
        });

        navigate('/member-dashboard', { replace: true });
        return;
      }

      toast.error('Unsupported account role.');
    } catch (err) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Login form">
        <div className="auth-card-body">
          <div className="auth-brand-icon">
            <LibraryIcon />
          </div>

          <h1>Library Management System</h1>
          <p className="auth-subtitle">Access your Admin or Member portal.</p>

          <div className="auth-tabs" aria-label="Authentication navigation">
            <Link replace to="/login" className="auth-tab auth-tab-active">
              Login
            </Link>

            <Link replace to="/signup" className="auth-tab">
              Signup
            </Link>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email Address</label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="email@library.com"
                value={formData.email}
                onChange={updateField}
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>

                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>

              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={updateField}
                autoComplete="current-password"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="role">Account Role</label>

              <select
                id="role"
                name="role"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <button className="auth-submit-button" type="submit" disabled={submitting}>
              <span>{submitting ? 'Verifying...' : 'Login'}</span>
              <ArrowRightIcon />
            </button>
          </form>

          {/* <p className="auth-switch-text">
            New here? <Link to="/signup">Switch to Signup</Link>
          </p> */}
        </div>

        <div className="auth-card-footer">
          <ShieldIcon />
          <span>Enterprise Secure Authentication</span>
        </div>
      </section>
    </main>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 5.5c-2.5-2-5.5-2-8-1v13c2.5-1 5.5-1 8 1 2.5-2 5.5-2 8-1v-13c-2.5-1-5.5-1-8 1Z" />
      <path d="M12 5.5v13" />
      <path d="M9 3.5a3 3 0 0 1 6 0" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 12h13" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3 5.5 5.8v5.7c0 4.1 2.7 7.8 6.5 9.1 3.8-1.3 6.5-5 6.5-9.1V5.8L12 3Z" />
      <path d="M9.5 12.2 11.3 14l3.4-4" />
    </svg>
  );
}