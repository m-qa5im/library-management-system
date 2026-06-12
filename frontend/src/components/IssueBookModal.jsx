import React, { useState, useEffect } from 'react';
import { issueBook, searchMembers, searchBooks } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import AutocompleteLookup from './AutocompleteLookup';
import { CloseIcon } from './Icons';

const getTodayString = (offsetDays = 0) => {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function IssueBookModal({ isOpen, onClose, token, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [issueStep, setIssueStep] = useState(1);
  const [issueMember, setIssueMember] = useState(null);
  const [issueBookObj, setIssueBookObj] = useState(null);
  const [issueDate, setIssueDate] = useState('');
  const [issueDueDate, setIssueDueDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIssueStep(1);
      setIssueMember(null);
      setIssueBookObj(null);
      setIssueDate(getTodayString());
      setIssueDueDate(getTodayString(14));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleIssueDateChange = (newDateVal) => {
    setIssueDate(newDateVal);
    if (newDateVal) {
      const d = new Date(newDateVal + 'T12:00:00');
      d.setDate(d.getDate() + 14);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setIssueDueDate(`${year}-${month}-${day}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (issueStep < 3) {
      if (issueStep === 1 && issueMember) {
        setIssueStep(2);
      } else if (issueStep === 2 && issueBookObj) {
        setIssueStep(3);
      }
      return;
    }

    if (!issueMember || !issueBookObj) {
      toast.error('Please select a valid Member and Book.');
      return;
    }

    try {
      setSubmitting(true);
      await issueBook(
        {
          bookId: issueBookObj.id,
          memberId: issueMember.id,
          issueDate: issueDate ? new Date(issueDate + 'T12:00:00').toISOString() : undefined,
          dueDate: issueDueDate ? new Date(issueDueDate + 'T12:00:00').toISOString() : undefined,
        },
        token
      );
      toast.success('Book asset issued successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to loan selected asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Circulation: Loan Asset</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
            <div className="flex gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${
                  issueStep === 1 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
                }`}
              >
                1
              </span>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${
                  issueStep === 2 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
                }`}
              >
                2
              </span>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${
                  issueStep === 3 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
                }`}
              >
                3
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {issueStep} of 3</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {issueStep === 1 && (
            <div className="modal-body min-h-[300px]">
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search Member Account *</label>
                <AutocompleteLookup
                  id="issue-member-lookup"
                  fetchCallback={(query, page, pageSize) => searchMembers(query, page, pageSize, token)}
                  placeholder="Type member name, email, or library card ID..."
                  onSelect={(item) => setIssueMember(item)}
                  getLabel={(item) => (item ? `${item.user?.fullName} (${item.memberCode})` : '')}
                  formatItem={(item) => (
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-800">{item.user?.fullName}</span>
                      <span className="text-xs text-slate-500">
                        Email: {item.user?.email} | Code: {item.memberCode}
                      </span>
                    </div>
                  )}
                  initialLabel={issueMember ? `${issueMember.user?.fullName} (${issueMember.memberCode})` : ''}
                />
              </div>

              {issueMember && (
                <div className="mt-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/60 text-left flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Selected Member Profile</h4>
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {issueMember.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-700 flex flex-col gap-1 mt-1">
                    <p>
                      <strong>Name:</strong> {issueMember.user?.fullName}
                    </p>
                    <p>
                      <strong>Email:</strong> {issueMember.user?.email}
                    </p>
                    <p>
                      <strong>Member Code:</strong> {issueMember.memberCode}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {issueStep === 2 && (
            <div className="modal-body min-h-[300px]">
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search Available Book *</label>
                <AutocompleteLookup
                  id="issue-book-lookup"
                  fetchCallback={(query, page, pageSize) => searchBooks(query, 'Available', page, pageSize, token)}
                  placeholder="Type book title, author, or ISBN..."
                  onSelect={(item) => setIssueBookObj(item)}
                  getLabel={(item) => (item ? `${item.title} - ${item.author}` : '')}
                  formatItem={(item) => (
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-800">{item.title}</span>
                      <span className="text-xs text-slate-500">
                        Author: {item.author} | Category: {item.category} | ISBN: {item.isbn || 'N/A'}
                      </span>
                    </div>
                  )}
                  initialLabel={issueBookObj ? `${issueBookObj.title} - ${issueBookObj.author}` : ''}
                />
              </div>

              {issueBookObj && (
                <div className="mt-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/60 text-left flex gap-4 items-start">
                  {issueBookObj.coverImageUrl && (
                    <img
                      src={issueBookObj.coverImageUrl}
                      alt={issueBookObj.title}
                      className="w-16 h-20 object-cover rounded-lg shadow-sm border border-slate-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src =
                          'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=100&auto=format&fit=crop';
                      }}
                    />
                  )}
                  <div className="text-sm text-slate-700 flex-1 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Selected Book Asset</h4>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        Available
                      </span>
                    </div>
                    <p className="mt-1 font-semibold text-slate-900">{issueBookObj.title}</p>
                    <p>
                      <strong>Author:</strong> {issueBookObj.author}
                    </p>
                    <p>
                      <strong>ISBN:</strong> {issueBookObj.isbn || 'N/A'}
                    </p>
                    <p>
                      <strong>Category:</strong> {issueBookObj.category}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {issueStep === 3 && (
            <div className="modal-body text-left">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <strong className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider font-bold">
                    Selected Member
                  </strong>
                  <span className="text-slate-800 font-semibold text-sm">{issueMember?.user?.fullName}</span>
                  <span className="text-slate-500 block mt-0.5">{issueMember?.memberCode}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <strong className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider font-bold">
                    Selected Book
                  </strong>
                  <span className="text-slate-800 font-semibold text-sm truncate block">{issueBookObj?.title}</span>
                  <span className="text-slate-500 block mt-0.5">by {issueBookObj?.author}</span>
                </div>
              </div>

              <div className="form-group mb-4">
                <label htmlFor="issue-date-input" className="block text-sm font-semibold text-slate-700 mb-2">
                  Custom Issue Date *
                </label>
                <input
                  id="issue-date-input"
                  type="date"
                  className="form-input"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-group mb-6">
                <label htmlFor="due-date-input" className="block text-sm font-semibold text-slate-700 mb-2">
                  Custom Due Date *
                </label>
                <input
                  id="due-date-input"
                  type="date"
                  className="form-input"
                  value={issueDueDate}
                  onChange={(e) => setIssueDueDate(e.target.value)}
                  disabled={submitting}
                />
                <small style={{ color: '#757684', marginTop: '4px', display: 'block' }}>
                  Defaults automatically to 14 days following the designated issue date.
                </small>
              </div>
            </div>
          )}

          <div className="modal-footer">
            {issueStep > 1 ? (
              <button
                key="issue-back-btn"
                type="button"
                className="db-action-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={() => setIssueStep((prev) => prev - 1)}
                disabled={submitting}
              >
                Back
              </button>
            ) : (
              <button
                key="issue-cancel-btn"
                type="button"
                className="db-action-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
            )}

            {issueStep < 3 ? (
              <button
                key="issue-next-btn"
                type="button"
                className="db-action-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={() => setIssueStep((prev) => prev + 1)}
                disabled={(issueStep === 1 && !issueMember) || (issueStep === 2 && !issueBookObj)}
              >
                Next
              </button>
            ) : (
              <button
                key="issue-submit-btn"
                type="submit"
                className="db-action-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                disabled={submitting || !issueMember || !issueBookObj || !issueDate || !issueDueDate}
              >
                {submitting ? 'Processing...' : 'Issue Asset'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
