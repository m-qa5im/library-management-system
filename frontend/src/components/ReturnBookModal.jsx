import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { returnTransaction, searchActiveTransactions } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import AutocompleteLookup from './AutocompleteLookup';
import { CloseIcon } from './Icons';

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ReturnBookModal({ isOpen, onClose, token, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [returnStep, setReturnStep] = useState(1);
  const [returnTransactionObj, setReturnTransactionObj] = useState(null);
  const [returnDate, setReturnDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReturnStep(1);
      setReturnTransactionObj(null);
      setReturnDate(getTodayString());
    }
  }, [isOpen]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDateString = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const getTransactionStatus = (tx) => {
    if (tx.status === 'Pending') return 'Pending';
    if (tx.status === 'Rejected') return 'Rejected';
    if (tx.status === 'Returned' || tx.returnDate !== null) return 'Returned';
    const due = new Date(tx.dueDate);
    const now = new Date();
    return now > due ? 'Overdue' : 'On Time';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (returnStep < 2) {
      if (returnStep === 1 && returnTransactionObj) {
        setReturnStep(2);
      }
      return;
    }

    if (!returnTransactionObj) {
      toast.error('Please select an active checkout record to complete the return.');
      return;
    }

    try {
      setSubmitting(true);
      await returnTransaction(
        returnTransactionObj.id,
        {
          returnDate: returnDate ? new Date(returnDate + 'T12:00:00').toISOString() : undefined,
        },
        token
      );
      toast.success('Circulation register updated. Asset returned successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to complete book return transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Circulation: Return Asset</h3>
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
                  returnStep === 1 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
                }`}
              >
                1
              </span>
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${
                  returnStep === 2 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'
                }`}
              >
                2
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {returnStep} of 2</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {returnStep === 1 && (
            <div className="modal-body min-h-[300px]">
              <div className="form-group mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Search Active Loans *</label>
                <AutocompleteLookup
                  id="return-loan-lookup"
                  fetchCallback={(query, page, pageSize) => searchActiveTransactions(query, page, pageSize, token)}
                  placeholder="Search by book title, borrower name, email, or code..."
                  onSelect={(item) => setReturnTransactionObj(item)}
                  getLabel={(item) =>
                    item
                      ? `"${item.book?.title}" borrowed by ${item.member?.user?.fullName || item.member?.memberCode}`
                      : ''
                  }
                  formatItem={(item) => (
                    <div className="flex flex-col text-left">
                      <span className="font-semibold text-slate-800">"{item.book?.title}"</span>
                      <span className="text-xs text-slate-500">
                        Borrowed by: {item.member?.user?.fullName} ({item.member?.memberCode})
                      </span>
                      <span className="text-xs text-slate-400">
                        Issued: {formatDateString(item.issueDate)} | Due: {formatDateString(item.dueDate)}
                      </span>
                    </div>
                  )}
                  initialLabel={
                    returnTransactionObj
                      ? `"${returnTransactionObj.book?.title}" borrowed by ${returnTransactionObj.member?.user?.fullName}`
                      : ''
                  }
                />
              </div>

              {returnTransactionObj && (
                <div className="mt-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/60 text-left flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Active Loan Details</h4>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                        getTransactionStatus(returnTransactionObj) === 'Overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {getTransactionStatus(returnTransactionObj)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-700 mt-1">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Book Title</p>
                      <p className="font-semibold text-slate-800 truncate">{returnTransactionObj.book?.title}</p>
                      <p className="text-xs text-slate-500">by {returnTransactionObj.book?.author}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Borrower</p>
                      <p className="font-semibold text-slate-800">{returnTransactionObj.member?.user?.fullName}</p>
                      <p className="text-xs text-slate-500">Code: {returnTransactionObj.member?.memberCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Issue Date</p>
                      <p className="font-semibold text-slate-800">{formatDateString(returnTransactionObj.issueDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Due Date</p>
                      <p className="font-semibold text-slate-800">{formatDateString(returnTransactionObj.dueDate)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {returnStep === 2 && (
            <div className="modal-body text-left">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 mb-6 text-sm text-slate-700">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Loan Verification</h4>
                <p className="mb-1">
                  <strong>Book:</strong> {returnTransactionObj?.book?.title}
                </p>
                <p className="mb-1">
                  <strong>Borrower:</strong> {returnTransactionObj?.member?.user?.fullName} (
                  {returnTransactionObj?.member?.memberCode})
                </p>
                <p>
                  <strong>Original Due Date:</strong> {formatDateString(returnTransactionObj?.dueDate)}
                </p>
              </div>

              <div className="form-group mb-6">
                <label htmlFor="return-date-input" className="block text-sm font-semibold text-slate-700 mb-2">
                  Custom Return Date *
                </label>
                <input
                  id="return-date-input"
                  type="date"
                  className="form-input"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          <div className="modal-footer">
            {returnStep > 1 ? (
              <button
                key="return-back-btn"
                type="button"
                className="db-action-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={() => setReturnStep((prev) => prev - 1)}
                disabled={submitting}
              >
                Back
              </button>
            ) : (
              <button
                key="return-cancel-btn"
                type="button"
                className="db-action-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
            )}

            {returnStep < 2 ? (
              <button
                key="return-next-btn"
                type="button"
                className="db-action-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                onClick={() => setReturnStep(2)}
                disabled={!returnTransactionObj}
              >
                Next
              </button>
            ) : (
              <button
                key="return-submit-btn"
                type="submit"
                className="db-action-btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
                disabled={submitting || !returnTransactionObj || !returnDate}
              >
                {submitting ? 'Processing...' : 'Settle Return'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
