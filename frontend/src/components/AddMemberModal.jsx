import React, { useState } from 'react';
import { registerAndCreateMember } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { CloseIcon } from './Icons';

export default function AddMemberModal({ isOpen, onClose, token, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [memberForm, setMemberForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!memberForm.fullName.trim() || !memberForm.email.trim() || !memberForm.password.trim()) {
      toast.error('All user fields are required to register.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(memberForm.email.trim())) {
      toast.error('Invalid email address format.');
      return;
    }

    if (memberForm.password.length < 8) {
      toast.error('Password must contain at least 8 characters.');
      return;
    }

    if (!/[A-Z]/.test(memberForm.password)) {
      toast.error('Password must contain at least one uppercase letter.');
      return;
    }

    if (!/[a-z]/.test(memberForm.password)) {
      toast.error('Password must contain at least one lowercase letter.');
      return;
    }

    if (!/[0-9]/.test(memberForm.password)) {
      toast.error('Password must contain at least one numeric digit.');
      return;
    }

    // Automatically mint a unique member code
    const uniqueCode = `MEM-${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;

    try {
      setSubmitting(true);
      await registerAndCreateMember(
        {
          fullName: memberForm.fullName.trim(),
          email: memberForm.email.trim(),
          password: memberForm.password,
          role: 'Member',
        },
        uniqueCode,
        token
      );
      toast.success('Member profile registered and established successfully!');
      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to register account.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setMemberForm({
      fullName: '',
      email: '',
      password: '',
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Establish Member Profile</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="modal-member-name">Full Name *</label>
              <input
                id="modal-member-name"
                type="text"
                className="form-input"
                placeholder="John Doe"
                value={memberForm.fullName}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, fullName: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="modal-member-email">Email Address *</label>
              <input
                id="modal-member-email"
                type="email"
                className="form-input"
                placeholder="john.doe@example.com"
                value={memberForm.email}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="modal-member-pass">Password (Min 8 chars, 1 Upper, 1 Lower, 1 Num) *</label>
              <input
                id="modal-member-pass"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={memberForm.password}
                onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting}>
              {submitting ? 'Creating...' : 'Register Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
