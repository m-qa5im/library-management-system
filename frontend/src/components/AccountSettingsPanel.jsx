import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserProfile, updateUserProfile } from '../services/authService';
import './AccountSettingsPanel.css';

export default function AccountSettingsPanel({ userId, token }) {
  const { authUser, login } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  // Profile fields state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  // Security fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch user details on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await getUserProfile(userId, token);
        if (isMounted && data) {
          setFullName(data.fullName || '');
          setEmail(data.email || '');
        }
      } catch (err) {
        if (isMounted) {
          toast.error(err.message || 'Failed to load user profile details.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (userId && token) {
      fetchProfile();
    }

    return () => {
      isMounted = false;
    };
  }, [userId, token]);

  // Handle profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Full Name is required.');
      return;
    }
    if (!email.trim()) {
      toast.error('Email Address is required.');
      return;
    }

    // Simple email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Invalid email address format.');
      return;
    }

    try {
      setProfileSubmitting(true);
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
      };
      
      const response = await updateUserProfile(userId, payload, token);
      
      // Update global context
      login({
        ...authUser,
        name: response.fullName,
      });

      toast.success('Profile information updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile information.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Handle password change
  const handleSecuritySubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Current password is required.');
      return;
    }
    if (!newPassword) {
      toast.error('New password is required.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Confirm password does not match new password.');
      return;
    }

    try {
      setSecuritySubmitting(true);
      const payload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        currentPassword,
        newPassword,
      };

      await updateUserProfile(userId, payload, token);
      
      // Clear security inputs
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      toast.success('Password updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update security credentials.');
    } finally {
      setSecuritySubmitting(false);
    }
  };

  const handleResetProfile = () => {
    // Re-fetch to reset values
    if (userId && token) {
      getUserProfile(userId, token)
        .then((data) => {
          if (data) {
            setFullName(data.fullName || '');
            setEmail(data.email || '');
            toast.info('Profile form reset to database state.');
          }
        })
        .catch((err) => {
          toast.error('Failed to reset form: ' + err.message);
        });
    }
  };

  if (loading) {
    return (
      <div className="settings-workspace" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
        <p style={{ color: '#505f76', fontWeight: 600 }}>Loading profile workspace...</p>
      </div>
    );
  }

  return (
    <div className="settings-workspace">
      <div className="settings-grid">
        
        {/* CARD 1: Profile Information */}
        <form onSubmit={handleProfileSubmit} className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Profile Settings</span>
            </h3>
            <p className="settings-card-subtitle">
              Manage your personal identity profile details and system registration contact mail.
            </p>
          </div>

          <div className="settings-form-group">
            <label htmlFor="settings-fullName">Full Name</label>
            <input
              id="settings-fullName"
              type="text"
              className="settings-input"
              placeholder="e.g. Administrator Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={profileSubmitting || securitySubmitting}
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="settings-email">Email Address</label>
            <input
              id="settings-email"
              type="email"
              className="settings-input"
              placeholder="e.g. admin@library.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={profileSubmitting || securitySubmitting}
            />
          </div>

          <div className="settings-footer">
            <button
              type="button"
              className="settings-btn settings-btn-secondary"
              onClick={handleResetProfile}
              disabled={profileSubmitting || securitySubmitting}
            >
              Reset
            </button>
            <button
              type="submit"
              className="settings-btn settings-btn-primary"
              disabled={profileSubmitting || securitySubmitting}
            >
              {profileSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* CARD 2: Security & Password */}
        <form onSubmit={handleSecuritySubmit} className="settings-card">
          <div className="settings-card-header">
            <h3 className="settings-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Security Settings</span>
            </h3>
            <p className="settings-card-subtitle">
              Update your account password credentials. Password rotation requires verification of your current password.
            </p>
          </div>

          <div className="settings-form-group">
            <label htmlFor="settings-currentPassword">Current Password</label>
            <input
              id="settings-currentPassword"
              type="password"
              className="settings-input"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={profileSubmitting || securitySubmitting}
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="settings-newPassword">New Password</label>
            <input
              id="settings-newPassword"
              type="password"
              className="settings-input"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={profileSubmitting || securitySubmitting}
            />
          </div>

          <div className="settings-form-group">
            <label htmlFor="settings-confirmPassword">Confirm New Password</label>
            <input
              id="settings-confirmPassword"
              type="password"
              className="settings-input"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={profileSubmitting || securitySubmitting}
            />
          </div>

          <div className="settings-footer">
            <button
              type="submit"
              className="settings-btn settings-btn-primary"
              disabled={profileSubmitting || securitySubmitting}
            >
              {securitySubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
