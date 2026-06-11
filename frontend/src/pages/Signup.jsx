import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';
import { useToast } from '../context/ToastContext';
import './AuthPage.css';

export default function Signup() {
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

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
    if (!formData.fullName.trim()) {
      return 'Full name is required.';
    }

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

    if (formData.password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }

    if (!/[A-Z]/.test(formData.password)) {
      return 'Password must contain at least one uppercase letter.';
    }

    if (!/[a-z]/.test(formData.password)) {
      return 'Password must contain at least one lowercase letter.';
    }

    if (!/[0-9]/.test(formData.password)) {
      return 'Password must contain at least one numeric digit.';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Password and confirm password do not match.';
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

      await registerUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: 'Member',
      });

      toast.success('Account created successfully. Redirecting to login...');

      setTimeout(() => {
        navigate('/login');
      }, 900);
    } catch (err) {
      toast.error(err.message || 'Signup failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Signup form">
        <div className="auth-card-body">
          <div className="auth-brand-icon">
            <LibraryIcon />
          </div>

          <h1>Library Management System</h1>
          <p className="auth-subtitle">Create your Member portal account.</p>

          <div className="auth-tabs" aria-label="Authentication navigation">
            <Link replace to="/login" className="auth-tab">
              Login
            </Link>
            <Link replace to="/signup" className="auth-tab auth-tab-active">
              Signup
            </Link>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={updateField}
                autoComplete="name"
              />
            </div>

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
                placeholder="Create a secure password"
                value={formData.password}
                onChange={updateField}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={updateField}
                autoComplete="new-password"
              />
            </div>

            <div className="auth-field">
              <label htmlFor="role">Account Role</label>
              <select id="role" name="role" value="Member" disabled>
                <option value="Member">Member</option>
              </select>
              <small>Administrative accounts are created internally by the library.</small>
            </div>

            <button className="auth-submit-button" type="submit" disabled={submitting}>
              <span>{submitting ? 'Creating Account...' : 'Create Account'}</span>
              <ArrowRightIcon />
            </button>
          </form>

          {/* <p className="auth-switch-text">
            Already registered? <Link to="/login">Switch to Login</Link>
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