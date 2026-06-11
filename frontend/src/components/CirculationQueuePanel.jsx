import { useState, useEffect, useCallback } from 'react';
import { getPendingRequests, approveRequest, rejectRequest } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import './CirculationQueuePanel.css';

const PAGE_SIZE = 10;

export default function CirculationQueuePanel({ token, onQueueCountChange }) {
  const toast = useToast();

  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null); // ID of the row being actioned

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // ─── LOAD PENDING REQUESTS ───
  const loadRequests = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const data = await getPendingRequests(page, PAGE_SIZE, token);
      setRequests(data.items ?? data.Items ?? []);
      const count = data.totalCount ?? data.TotalCount ?? 0;
      setTotalCount(count);
      if (onQueueCountChange) onQueueCountChange(count);
    } catch (err) {
      toast.error(err.message || 'Failed to load pending requests.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests(currentPage);
  }, [currentPage, loadRequests]);

  // ─── APPROVE ───
  const handleApprove = async (tx) => {
    try {
      setActioningId(tx.id);
      await approveRequest(tx.id, token);
      toast.success(`Approved — "${tx.book?.title ?? 'Book'}" issued to ${tx.member?.user?.fullName ?? 'member'}.`);
      // Remove from local list immediately for instant feedback
      setRequests(prev => prev.filter(r => r.id !== tx.id));
      setTotalCount(prev => {
        const next = prev - 1;
        if (onQueueCountChange) onQueueCountChange(next);
        return next;
      });
    } catch (err) {
      toast.error(err.message || 'Failed to approve request.');
    } finally {
      setActioningId(null);
    }
  };

  // ─── REJECT ───
  const handleReject = async (tx) => {
    try {
      setActioningId(tx.id);
      await rejectRequest(tx.id, token);
      toast.info(`Rejected — request for "${tx.book?.title ?? 'Book'}" dismissed.`);
      setRequests(prev => prev.filter(r => r.id !== tx.id));
      setTotalCount(prev => {
        const next = prev - 1;
        if (onQueueCountChange) onQueueCountChange(next);
        return next;
      });
    } catch (err) {
      toast.error(err.message || 'Failed to reject request.');
    } finally {
      setActioningId(null);
    }
  };

  // ─── FORMAT DATE ───
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="db-body">
      {/* ─── KPI SUMMARY ─── */}
      <section className="db-stats-grid" aria-label="Queue summary">
        <div className="db-stat-card">
          <div className="db-stat-icon-container borrowed">
            <ClockIcon className="db-stat-icon" />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Pending Requests</span>
            <span className="db-stat-value" style={{ color: totalCount > 0 ? '#d97706' : 'inherit' }}>
              {loading ? '...' : totalCount.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: totalCount > 0 ? '#d97706' : '#757684', marginTop: '2px', fontWeight: 500 }}>
              {totalCount > 0 ? '⚠ Awaiting review' : 'Queue is clear'}
            </span>
          </div>
        </div>

        <div className="db-stat-card">
          <div className="db-stat-icon-container available">
            <CheckCircleIcon className="db-stat-icon" />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Approve to Issue</span>
            <span className="db-stat-value">{loading ? '...' : totalCount.toLocaleString()}</span>
            <span style={{ fontSize: '0.75rem', color: '#757684', marginTop: '2px' }}>
              Copies will be locked on approval
            </span>
          </div>
        </div>
      </section>

      {/* ─── PENDING REQUESTS TABLE ─── */}
      <section className="db-panel-card" style={{ marginTop: '20px' }} aria-label="Circulation Request Queue Table">
        <div className="db-table-wrapper" style={{ margin: 0 }}>
          {loading ? (
            <div className="crq-spinner-row">
              <SpinnerIcon />
              Loading pending requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="crq-empty">
              <CheckCircleIcon className="crq-empty-icon" style={{ color: '#16a34a' }} />
              <h4 className="crq-empty-title">Queue is Empty</h4>
              <p className="crq-empty-desc">
                No borrow requests are currently pending approval. When members submit requests, they will appear here.
              </p>
            </div>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Request #</th>
                  <th>Member</th>
                  <th>Member Code</th>
                  <th>Book Title</th>
                  <th>Availability</th>
                  <th>Requested At</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((tx) => {
                  const avail = tx.book?.availableQuantity ?? 0;
                  const total = tx.book?.totalQuantity ?? 1;
                  const isActioning = actioningId === tx.id;
                  const reqId = `#RQ-${tx.id.toString().padStart(4, '0')}`;

                  return (
                    <tr key={tx.id} className="crq-row-approve">
                      <td style={{ fontWeight: 600, color: '#505f76' }}>{reqId}</td>
                      <td style={{ fontWeight: 600, color: '#131b2e' }}>
                        {tx.member?.user?.fullName ?? '—'}
                      </td>
                      <td>
                        <span className="crq-member-code">
                          {tx.member?.memberCode ?? '—'}
                        </span>
                      </td>
                      <td>
                        <div className="crq-book-cell">
                          <span className="crq-book-title">{tx.book?.title ?? '—'}</span>
                          {tx.book?.isbn && (
                            <span className="crq-book-isbn">ISBN: {tx.book.isbn}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`crq-qty-pill ${avail > 1 ? 'available' : 'low'}`}>
                          {avail} of {total} available
                        </span>
                      </td>
                      <td>
                        <span className="crq-timestamp">{formatDate(tx.createdAt)}</span>
                      </td>
                      <td>
                        <div className="crq-actions-cell">
                          <button
                            className="crq-btn-approve"
                            onClick={() => handleApprove(tx)}
                            disabled={isActioning}
                            title="Approve this request"
                            aria-label={`Approve request ${reqId}`}
                          >
                            <CheckIcon />
                            {isActioning ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            className="crq-btn-reject"
                            onClick={() => handleReject(tx)}
                            disabled={isActioning}
                            title="Reject this request"
                            aria-label={`Reject request ${reqId}`}
                          >
                            <XIcon />
                            {isActioning ? '...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ─── PAGINATION ─── */}
        {!loading && totalPages > 1 && (
          <div className="crq-pagination-row">
            <span className="crq-pagination-summary">
              Showing <strong>{requests.length}</strong> of <strong>{totalCount}</strong> pending requests
            </span>
            <nav className="mdb-pagination" aria-label="Queue pagination" style={{ marginTop: 0 }}>
              <button
                className="mdb-page-btn"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`mdb-page-btn ${currentPage === p ? 'mdb-page-btn-active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="mdb-page-btn"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                &gt;
              </button>
            </nav>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── INLINE SVG ICONS ───

function ClockIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}
