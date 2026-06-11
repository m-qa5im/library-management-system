import { useState, useMemo, useEffect } from 'react';

export default function TransactionPanel({ transactions = [], loading, token, onRefresh, onIssueBookClick, onReturnBookClick }) {
  // ─── STATE MANAGEMENT ───
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedTxPreview, setSelectedTxPreview] = useState(null);

  // Reset pagination when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // ─── TRANSACTION DYNAMIC STATUS CALCULATOR ───
  const getTransactionStatus = (tx) => {
    if (tx.status === 'Pending') return 'Pending';
    if (tx.status === 'Rejected') return 'Rejected';
    if (tx.status === 'Returned' || tx.returnDate !== null) return 'Returned';
    
    const dueDate = new Date(tx.dueDate);
    const now = new Date();
    
    if (now > dueDate) return 'Overdue';
    
    // Check if due within next 48 hours
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    if (dueDate > now && dueDate <= fortyEightHoursFromNow) {
      return 'Due Soon';
    }
    
    return 'Issued';
  };

  // ─── LOCAL STATS COMPUTATIONS ───
  const stats = useMemo(() => {
    let activeLoans = 0;
    let returnedBooks = 0;
    let dueSoon = 0;
    let overdue = 0;

    transactions.forEach((tx) => {
      const status = getTransactionStatus(tx);
      if (status === 'Returned') {
        returnedBooks++;
      } else if (status === 'Issued' || status === 'Due Soon' || status === 'Overdue') {
        activeLoans++;
        if (status === 'Due Soon') dueSoon++;
        if (status === 'Overdue') overdue++;
      }
    });

    return { activeLoans, returnedBooks, dueSoon, overdue };
  }, [transactions]);

  // ─── SEARCH & FILTER LOGIC ───
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Text Search Filter
      const bookTitle = (tx.book?.title || '').toLowerCase();
      const memberName = (tx.member?.user?.fullName || '').toLowerCase();
      const memberCode = (tx.member?.memberCode || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || bookTitle.includes(q) || memberName.includes(q) || memberCode.includes(q);

      // 2. Status Filter
      const txStatus = getTransactionStatus(tx);
      let matchesStatus = true;
      if (statusFilter !== 'All') {
        matchesStatus = txStatus === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchQuery, statusFilter]);

  // ─── PAGINATION COMPUTATIONS ───
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const getPageNumbers = () => {
    const pages = [];
    const boundaryPages = 1;
    const siblingPages = 1;

    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const leftSiblingIndex = Math.max(currentPage - siblingPages, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingPages, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > boundaryPages + 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - (boundaryPages + 1);

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const itemCount = 3 + 2 * siblingPages;
      for (let i = 1; i <= itemCount; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      pages.push(1);
      pages.push('...');
      const itemCount = 3 + 2 * siblingPages;
      const startRange = totalPages - itemCount + 1;
      for (let i = startRange; i <= totalPages; i++) {
        pages.push(i);
      }
    } else if (shouldShowLeftDots && shouldShowRightDots) {
      pages.push(1);
      pages.push('...');
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  // ─── CSV EXPORT ───
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Transaction ID', 'Book Title', 'Member Name', 'Issue Date', 'Due Date', 'Return Date', 'Status'];
    const rows = filteredTransactions.map((tx) => [
      `TR-${tx.id.toString().padStart(4, '0')}`,
      tx.book?.title || 'Unknown',
      tx.member?.user?.fullName || tx.member?.memberCode || 'Unknown',
      tx.issueDate ? new Date(tx.issueDate).toLocaleDateString() : '',
      tx.dueDate ? new Date(tx.dueDate).toLocaleDateString() : '',
      tx.returnDate ? new Date(tx.returnDate).toLocaleDateString() : '—',
      getTransactionStatus(tx),
    ]);

    // Construct CSV file string
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `library_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── FORMAT DATE STRING HELPER ───
  const formatDateString = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="db-body">
      {/* ─── KPI STATISTICS CARDS GRID ─── */}
      <section className="db-stats-grid" aria-label="Transactions stats summary">
        {/* Active Loans */}
        <div className="db-stat-card">
          <div className="db-stat-icon-container books">
            <ActiveLoansIcon className="db-stat-icon" />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Active Loans</span>
            <span className="db-stat-value">
              {loading ? '...' : stats.activeLoans.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px', fontWeight: 500 }}>
              ↑ Active checkouts
            </span>
          </div>
        </div>

        {/* Returned Books */}
        <div className="db-stat-card">
          <div className="db-stat-icon-container available">
            <CheckCircleIcon className="db-stat-icon" />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Returned Books</span>
            <span className="db-stat-value">
              {loading ? '...' : stats.returnedBooks.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#757684', marginTop: '2px' }}>
              Processed successfully
            </span>
          </div>
        </div>

        {/* Due Soon */}
        <div className="db-stat-card">
          <div className="db-stat-icon-container borrowed" style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
            <ClockIcon className="db-stat-icon" />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Due Soon</span>
            <span className="db-stat-value" style={{ color: stats.dueSoon > 0 ? '#d97706' : 'inherit' }}>
              {loading ? '...' : stats.dueSoon.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#757684', marginTop: '2px' }}>
              Lease expiring in 48h
            </span>
          </div>
        </div>

        {/* Overdue */}
        <div className="db-stat-card">
          <div className="db-stat-icon-container" style={{ backgroundColor: 'rgba(186, 26, 26, 0.1)', color: '#ba1a1a' }}>
            <AlertIcon className="db-stat-icon" />
          </div>
          <div className="db-stat-info">
            <span className="db-stat-label">Overdue</span>
            <span className="db-stat-value" style={{ color: stats.overdue > 0 ? '#ba1a1a' : 'inherit' }}>
              {loading ? '...' : stats.overdue.toLocaleString()}
            </span>
            <span style={{ fontSize: '0.75rem', color: stats.overdue > 0 ? '#ba1a1a' : '#757684', marginTop: '2px', fontWeight: stats.overdue > 0 ? 600 : 400 }}>
              {stats.overdue > 0 ? '⚠ Action required' : 'No overdue records'}
            </span>
          </div>
        </div>
      </section>

      {/* ─── UNIFIED ACTION / FILTER BAR ─── */}
      <div className="db-action-row-container" style={{ marginTop: '16px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search – left */}
        <div className="db-search-wrapper" style={{ margin: 0, width: '340px', maxWidth: '100%' }}>
          <SearchIcon className="db-search-icon" />
          <input
            type="text"
            placeholder="Search by book title or member name..."
            className="db-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search by book title or member name"
          />
        </div>

        {/* Controls – right */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="tx-status-filter" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#505f76' }}>
              Filter:
            </label>
            <select
              id="tx-status-filter"
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem', height: '38px', borderRadius: '8px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Issued">Issued / Active</option>
              <option value="Returned">Returned</option>
              <option value="Due Soon">Due Soon</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            className="db-add-book-btn"
            style={{ backgroundColor: '#ffffff', color: '#00288e', border: '1px solid #00288e' }}
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            title="Export to CSV"
            aria-label="Export transactions as CSV"
          >
            <ExportIcon style={{ width: '16px', height: '16px', stroke: '#00288e' }} />
            <span>Export CSV</span>
          </button>

          {/* Issue Book */}
          <button className="db-add-book-btn" onClick={onIssueBookClick} aria-label="Issue Book Action">
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            <span>Issue Book</span>
          </button>

          {/* Return Book */}
          <button
            className="db-return-book-btn"
            onClick={onReturnBookClick}
            aria-label="Return Book Action"
          >
            <ReturnIcon style={{ width: '16px', height: '16px', stroke: '#00288e' }} />
            <span>Return Book</span>
          </button>
        </div>
      </div>

      {/* ─── LEDGER TABLE CARD ─── */}
      <section className="db-panel-card" style={{ marginTop: '20px' }} aria-label="Transactions Ledger Directory">
        <div className="db-table-wrapper" style={{ margin: 0 }}>
          {loading ? (
            <div className="db-table-empty">Loading transactions ledger...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="db-table-empty">No transaction records found matching active filters.</div>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Book Title</th>
                  <th>Member Name</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((tx) => {
                  const txStatus = getTransactionStatus(tx);
                  const txIdLabel = `#TR-${tx.id.toString().padStart(4, '0')}`;
                  
                  return (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600, color: '#505f76' }}>{txIdLabel}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#131b2e' }}>
                          {tx.book?.title || 'Unknown Asset'}
                        </span>
                      </td>
                      <td>{tx.member?.user?.fullName || tx.member?.memberCode || 'Unknown'}</td>
                      <td>{formatDateString(tx.issueDate)}</td>
                      <td>{formatDateString(tx.dueDate)}</td>
                      <td>{formatDateString(tx.returnDate)}</td>
                      <td>
                        <span
                          className={`badge ${
                            txStatus === 'Returned'
                              ? 'returned'
                              : txStatus === 'Overdue'
                              ? 'overdue'
                              : txStatus === 'Pending'
                              ? 'pending'
                              : txStatus === 'Rejected'
                              ? 'rejected'
                              : 'on-time'
                          }`}
                          style={
                            txStatus === 'Due Soon'
                              ? { backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.2)' }
                              : txStatus === 'Issued'
                              ? { backgroundColor: 'rgba(30, 64, 175, 0.1)', color: '#1e40af', borderColor: 'rgba(30, 64, 175, 0.2)' }
                              : txStatus === 'Pending'
                              ? { backgroundColor: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }
                              : txStatus === 'Rejected'
                              ? { backgroundColor: '#fdf2f8', color: '#db2777', borderColor: '#fbcfe8' }
                              : {}
                          }
                        >
                          {txStatus}
                        </span>
                      </td>
                      <td>
                        <div className="db-table-actions">
                          <button
                            className="db-action-icon-btn view"
                            onClick={() => setSelectedTxPreview(tx)}
                            title="Inspect Details"
                          >
                            <EyeIcon />
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

        {/* ─── DYNAMIC PAGINATION CONTROLS ─── */}
        {!loading && totalPages > 1 && (
          <div className="db-pagination-container">
            <span className="db-pagination-summary">
              Showing <strong>{paginatedTransactions.length}</strong> of <strong>{filteredTransactions.length}</strong> transactions
            </span>
            <nav className="mdb-pagination" aria-label="Transaction ledger pagination" style={{ marginTop: 0 }}>
              <button
                className="mdb-page-btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                &lt;
              </button>
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`dots-${index}`} className="mdb-page-dots">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    className={`mdb-page-btn ${currentPage === page ? 'mdb-page-btn-active' : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className="mdb-page-btn"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                &gt;
              </button>
            </nav>
          </div>
        )}
      </section>

      {/* ─── INSPECT DETAIL MODAL OVERLAY ─── */}
      {selectedTxPreview && (
        <div className="modal-backdrop" onClick={() => setSelectedTxPreview(null)}>
          <div className="modal-content" style={{ width: '550px', maxWidth: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Circulation Lease Summary</h3>
              <button className="modal-close-btn" onClick={() => setSelectedTxPreview(null)} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaedff', paddingBottom: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#00288e' }}>
                    #TR-{selectedTxPreview.id.toString().padStart(4, '0')}
                  </span>
                  <span
                    className={`badge ${
                      getTransactionStatus(selectedTxPreview) === 'Returned'
                        ? 'returned'
                        : getTransactionStatus(selectedTxPreview) === 'Overdue'
                        ? 'overdue'
                        : 'on-time'
                    }`}
                    style={
                      getTransactionStatus(selectedTxPreview) === 'Due Soon'
                        ? { backgroundColor: 'rgba(217, 119, 6, 0.1)', color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.2)' }
                        : getTransactionStatus(selectedTxPreview) === 'Issued'
                        ? { backgroundColor: 'rgba(30, 64, 175, 0.1)', color: '#1e40af', borderColor: 'rgba(30, 64, 175, 0.2)' }
                        : {}
                    }
                  >
                    {getTransactionStatus(selectedTxPreview)}
                  </span>
                </div>

                {/* Book Asset Metadata */}
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#757684', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Asset Specifications
                  </h4>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e7ff' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#131b2e', display: 'block' }}>
                      {selectedTxPreview.book?.title}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#505f76', display: 'block', marginTop: '2px' }}>
                      by {selectedTxPreview.book?.author || 'Unknown Author'}
                    </span>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.8rem', color: '#757684' }}>
                      <span>Category: <strong>{selectedTxPreview.book?.category || 'General'}</strong></span>
                      <span>ISBN: <strong>{selectedTxPreview.book?.isbn || 'N/A'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Member Profile Metadata */}
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#757684', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Leaseholder Details
                  </h4>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e7ff' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#131b2e', display: 'block' }}>
                      {selectedTxPreview.member?.user?.fullName}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#505f76', display: 'block', marginTop: '2px' }}>
                      Email: {selectedTxPreview.member?.user?.email}
                    </span>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: '0.8rem', color: '#757684' }}>
                      <span>Library ID: <strong>{selectedTxPreview.member?.memberCode}</strong></span>
                      <span>Status: <strong style={{ color: selectedTxPreview.member?.status === 'Active' ? '#16a34a' : '#ba1a1a' }}>{selectedTxPreview.member?.status}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Date Ledger Matrix */}
                <div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#757684', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Transactions Ledger Timeline
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '12px', backgroundColor: '#f7f9ff', borderRadius: '8px', border: '1px solid #e2e7ff' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#757684', display: 'block' }}>Issue Date</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#131b2e', display: 'block', marginTop: '2px' }}>
                        {formatDateString(selectedTxPreview.issueDate)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#757684', display: 'block' }}>Due Date</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#00288e', display: 'block', marginTop: '2px' }}>
                        {formatDateString(selectedTxPreview.dueDate)}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#757684', display: 'block' }}>Return Date</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: selectedTxPreview.returnDate ? '#16a34a' : '#505f76', display: 'block', marginTop: '2px' }}>
                        {formatDateString(selectedTxPreview.returnDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="db-action-btn-primary" 
                style={{ padding: '8px 16px', fontSize: '0.875rem' }} 
                onClick={() => setSelectedTxPreview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INLINE SVGS ───

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function PlusIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ReturnIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 10 4 15 9 20" />
      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ActiveLoansIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function CheckCircleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ExportIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
