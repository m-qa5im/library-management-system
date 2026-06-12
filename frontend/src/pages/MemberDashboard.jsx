import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { fetchCatalogBooks, fetchMyLoans, requestBorrow } from '../services/memberService';
import './MemberDashboard.css';

export default function MemberDashboard() {
  const navigate = useNavigate();
  const { authUser, logout } = useAuth();
  const toast = useToast();
  const token = authUser?.token;
  const memberId = authUser?.memberId;

  // ─── TAB STATE ───
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'loans'

  // ─── DATA STATE ───
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── SEARCH / FILTER STATE ───
  const [searchQuery, setSearchQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState(''); // Search applied on click
  const [sortBy, setSortBy] = useState('title'); // 'title' | 'author' | 'category'
  const [filterCategory, setFilterCategory] = useState('All');

  // ─── PAGINATION STATE ───
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, filterCategory, sortBy]);

  // ─── DETAIL PREVIEW STATE ───
  const [selectedBook, setSelectedBook] = useState(null);

  // ─── CIRCULATION LOADING STATES ───
  const [requestingId, setRequestingId] = useState(null); // book id currently being submitted
  const [pendingBookIds, setPendingBookIds] = useState(new Set()); // session-level pending set
  const [successMessage, setSuccessMessage] = useState('');

  // ─── LOAD DATA FUNCTION ───
  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      if (!token) return;

      const booksData = await fetchCatalogBooks(token);
      setBooks(booksData);

      if (memberId) {
        const loansData = await fetchMyLoans(memberId, token);
        setLoans(loansData);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to sync library database catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, memberId]);

  // ─── SEARCH SUBMIT HANDLER ───
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilterQuery(searchQuery.trim());
  };

  // ─── REQUEST BORROW HANDLER ───
  const handleRequestBorrow = async (bookId) => {
    try {
      setRequestingId(bookId);
      setError('');
      await requestBorrow(bookId, token);
      // Transition button to amber "Awaiting Admin Approval" badge
      setPendingBookIds(prev => new Set([...prev, bookId]));
      toast.success('Request submitted! An admin will review and approve your request shortly.');
    } catch (err) {
      const isConflict = err.message?.toLowerCase().includes('out of stock') || err.message?.toLowerCase().includes('unavailable');
      if (isConflict) {
        toast.error('This item was just claimed by another reader');
        setBooks(prevBooks => 
          prevBooks.map(b => b.id === bookId ? { ...b, availableQuantity: 0 } : b)
        );
      } else {
        toast.error(err.message || 'Failed to submit borrow request.');
      }
    } finally {
      setRequestingId(null);
    }
  };

  // ─── LOGOUT HANDLER ───
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ─── FILTER / SORT MATRIX ───
  const filteredAndSortedBooks = useMemo(() => {
    let result = [...books];

    // 1. Text Search Filter
    if (filterQuery) {
      const q = filterQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q)
      );
    }

    // 2. Category Filter
    if (filterCategory !== 'All') {
      result = result.filter((b) => b.category === filterCategory);
    }

    // 3. Sorting logic
    result.sort((a, b) => {
      const valA = (a[sortBy] || '').toLowerCase();
      const valB = (b[sortBy] || '').toLowerCase();
      return valA.localeCompare(valB);
    });

    return result;
  }, [books, filterQuery, filterCategory, sortBy]);

  // Paginated books list and total pages
  const totalPages = Math.ceil(filteredAndSortedBooks.length / itemsPerPage);
  const paginatedBooks = useMemo(() => {
    return filteredAndSortedBooks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredAndSortedBooks, currentPage, itemsPerPage]);

  // Helper to upgrade image resolutions and fallback to Large Open Library Covers
  const getCoverImageUrl = (book) => {
    if (!book) return null;
    let url = book.coverImageUrl;
    if (url) {
      if (url.includes('covers.openlibrary.org') && url.includes('-M.jpg')) {
        return url.replace('-M.jpg', '-L.jpg');
      }
      return url;
    }
    if (book.isbn) {
      return `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg?default=false`;
    }
    return null;
  };

  // Generate dynamic pagination page numbers with ellipsis
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

  // Unique categories list for dropdown filter
  const categoriesList = useMemo(() => {
    const list = new Set(books.map((b) => b.category));
    return ['All', ...Array.from(list)];
  }, [books]);

  // Helpers to check dynamic state
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  return (
    <div className="mdb-container">
      {/* ─── HEADER NAVIGATION ─── */}
      <header className="mdb-header">
        <a href="#catalog" className="mdb-logo-wrapper" onClick={() => setActiveTab('catalog')}>
          <LogoIcon className="mdb-logo-icon" />
          <span className="mdb-logo-text">Library Management System</span>
        </a>
        <nav className="mdb-nav" aria-label="Member primary navigation">
          <button
            className={`mdb-nav-link ${activeTab === 'catalog' ? 'mdb-nav-link-active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            Catalog
          </button>
          <button
            className={`mdb-nav-link ${activeTab === 'loans' ? 'mdb-nav-link-active' : ''}`}
            onClick={() => setActiveTab('loans')}
          >
            My Borrowed Books
          </button>
          <button className="mdb-logout-btn" onClick={handleLogout} aria-label="Logout button">
            Logout
          </button>
        </nav>
      </header>

      {/* ─── HERO HEADER ─── */}
      {activeTab === 'catalog' && (
        <section className="mdb-hero" aria-label="Catalog discovery search">
          <h1 className="mdb-hero-title">Discover Your Next Great Read</h1>
          <p className="mdb-hero-subtitle">
            Access thousands of academic resources, classic literature, and contemporary research papers from our global digital catalog.
          </p>
          <form className="mdb-search-bar" onSubmit={handleSearchSubmit}>
            <SearchIcon className="mdb-search-icon" />
            <input
              type="text"
              placeholder="Search books by title or author..."
              className="mdb-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search catalog input"
            />
            <button type="submit" className="mdb-search-btn">
              Search
            </button>
          </form>
        </section>
      )}

      {/* ─── DYNAMIC MESSAGE NOTIFICATIONS ─── */}
      {successMessage && (
        <div style={{ maxWidth: '1400px', width: '100%', margin: '20px auto 0 auto', padding: '0 48px' }}>
          <div className="form-success" style={{ margin: 0 }}>
            {successMessage}
          </div>
        </div>
      )}
      {error && (
        <div style={{ maxWidth: '1400px', width: '100%', margin: '20px auto 0 auto', padding: '0 48px' }}>
          <div className="form-alert" style={{ margin: 0 }}>
            {error}
          </div>
        </div>
      )}

      {/* ─── MAIN SCROLLABLE CONTENT BODY ─── */}
      <main className="mdb-content">
        
        {/* TAB 1: CATALOG DISCOVERY GRID */}
        {activeTab === 'catalog' && (
          <>
            <section className="mdb-section-header" aria-label="Catalog header">
              <div className="mdb-section-title-wrapper">
                <h2 className="mdb-section-title">Library Catalog</h2>
                <p className="mdb-section-desc">
                  Showing {filteredAndSortedBooks.length} active titles
                </p>
              </div>

              {/* ACTION FILTERS */}
              <div className="mdb-actions-row">
                {/* Category Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="cat-filter" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#505f76' }}>Category:</label>
                  <select
                    id="cat-filter"
                    className="form-select"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label htmlFor="sort-filter" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#505f76' }}>Sort:</label>
                  <select
                    id="sort-filter"
                    className="form-select"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="category">Category</option>
                  </select>
                </div>
              </div>
            </section>

            {/* CATALOG BOOK CARDS GRID */}
            {loading ? (
              <div className="mdb-empty-state">Syncing catalog books...</div>
            ) : filteredAndSortedBooks.length === 0 ? (
              <div className="mdb-empty-state">
                <EmptyIcon className="mdb-empty-icon" />
                <p>No books found matching search parameters.</p>
              </div>
            ) : (
              <div className="mdb-grid">
                {paginatedBooks.map((book) => {
                  const total = book.totalQuantity ?? 1;
                  const avail = book.availableQuantity ?? (book.availabilityStatus === 'Available' ? 1 : 0);
                  const isOutOfStock = avail <= 0;
                  const isLowStock = avail > 0 && avail < total;
                  const isPending = pendingBookIds.has(book.id);
                  const isRequesting = requestingId === book.id;

                  // Determine badge variant
                  let badgeClass = 'available';
                  let badgeText = `${avail} of ${total} ${total === 1 ? 'Copy' : 'Copies'} Available`;
                  if (isOutOfStock) { 
                    badgeClass = 'borrowed'; 
                    badgeText = total === 1 ? 'Currently Borrowed' : 'Out of Stock'; 
                  }
                  else if (isLowStock) { badgeClass = 'low-stock'; }

                  return (
                    <article key={book.id} className="mdb-card">
                      {/* Cover Image Wrapper */}
                      <div className="mdb-card-cover-wrapper">
                        <ImageWithFallback
                          src={getCoverImageUrl(book)}
                          alt={book.title}
                          className="mdb-card-cover"
                        />
                      </div>

                      {/* Content Card Body */}
                      <div className="mdb-card-body">
                        <div className="mdb-card-meta">
                          <h3 className="mdb-card-title" title={book.title}>
                            {book.title}
                          </h3>
                          <p className="mdb-card-author" title={book.author}>
                            Author: {book.author}
                          </p>
                          <div className="mdb-availability-wrapper">
                            <span className={`mdb-availability-chip ${badgeClass}`}>
                              <span className="mdb-badge-dot" />
                              <span>{badgeText}</span>
                            </span>
                          </div>
                        </div>

                        <div className="mdb-card-actions">
                          {isPending ? (
                            // Amber awaiting-approval badge — non-interactive
                            <>
                              <div className="mdb-btn mdb-btn-pending" aria-live="polite">
                                <HourglassIcon />
                                Awaiting Admin Approval
                              </div>
                              <button
                                className="mdb-btn mdb-btn-secondary"
                                onClick={() => setSelectedBook(book)}
                                aria-label={`View details of ${book.title}`}
                              >
                                View Details
                              </button>
                            </>
                          ) : isOutOfStock ? (
                            // Disabled out-of-stock state
                            <>
                              <button
                                className="mdb-btn mdb-btn-out-of-stock"
                                disabled
                                aria-label={total === 1 ? "Currently Borrowed" : "Out of Stock"}
                              >
                                {total === 1 ? 'Currently Borrowed' : 'Out of Stock'}
                              </button>
                              <button
                                className="mdb-btn mdb-btn-secondary"
                                onClick={() => setSelectedBook(book)}
                                style={{ width: '100%' }}
                                aria-label={`View details of ${book.title}`}
                              >
                                View Details
                              </button>
                            </>
                          ) : (
                            // Available — show Request Borrow + View Details
                            <>
                              <button
                                className="mdb-btn mdb-btn-primary"
                                onClick={() => handleRequestBorrow(book.id)}
                                disabled={isRequesting}
                                aria-label={`Request to borrow ${book.title}`}
                              >
                                {isRequesting ? 'Submitting...' : 'Request Borrow'}
                              </button>
                              <button
                                className="mdb-btn mdb-btn-secondary"
                                onClick={() => setSelectedBook(book)}
                                aria-label={`View details of ${book.title}`}
                              >
                                View Details
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* bottom pagination */}
            {!loading && totalPages > 1 && (
              <nav className="mdb-pagination" aria-label="Catalog pagination">
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
            )}
          </>
        )}

        {/* TAB 2: MY BORROWED BOOKS CIRCULATION LOGS */}
        {activeTab === 'loans' && (
          <section className="mdb-loans-table-card" aria-label="My Borrowed Books list">
            <div className="mdb-loans-header">
              <h2 className="mdb-loans-title">My Borrowed Books</h2>
            </div>
            
            <div className="db-table-wrapper" style={{ margin: 0 }}>
              {loading ? (
                <div className="db-table-empty">Syncing borrowing ledger...</div>
              ) : loans.length === 0 ? (
                <div className="db-table-empty">You have no borrow requests or loan history.</div>
              ) : (
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Book Cover</th>
                      <th>Book Title</th>
                      <th>Issue Date</th>
                      <th>Due Date</th>
                      <th>Return Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loans.map((loan) => {
                      const isOverdue = new Date() > new Date(loan.dueDate);
                      return (
                        <tr key={loan.id}>
                          <td style={{ width: '80px', padding: '12px 24px' }}>
                            <div style={{ width: '48px', height: '64px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e7ff' }}>
                              <ImageWithFallback
                                src={getCoverImageUrl(loan.book)}
                                alt={loan.book?.title}
                                className="mdb-card-cover"
                              />
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{loan.book?.title || 'Unknown Asset'}</td>
                          <td>{formatDate(loan.issueDate)}</td>
                          <td>{formatDate(loan.dueDate)}</td>
                          <td>{formatDate(loan.returnDate)}</td>
                          <td>
                            {(() => {
                              if (loan.status === 'Pending') {
                                return <span className="badge pending">Pending Approval</span>;
                              }
                              if (loan.status === 'Rejected') {
                                return <span className="badge rejected">Request Rejected</span>;
                              }
                              if (loan.status === 'Returned') {
                                return <span className="badge returned">Returned</span>;
                              }
                              // Active issue/borrowed state
                              const isOverdue = new Date() > new Date(loan.dueDate);
                              return (
                                <span className={`badge ${isOverdue ? 'overdue' : 'on-time'}`}>
                                  {isOverdue ? 'Overdue' : 'Borrowed'}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ─── DYNAMIC DETAIL MODAL PREVIEW OVERLAY ─── */}
      {selectedBook && (() => {
        const total = selectedBook.totalQuantity ?? 1;
        const avail = selectedBook.availableQuantity ?? (selectedBook.availabilityStatus === 'Available' ? 1 : 0);
        const isOutOfStock = avail <= 0;
        const isPending = pendingBookIds.has(selectedBook.id);
        const isRequesting = requestingId === selectedBook.id;

        return (
          <div className="modal-backdrop" onClick={() => setSelectedBook(null)}>
            <div className="mdb-detail-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ padding: '16px 24px', borderBottom: 'none' }}>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedBook(null)}
                  style={{ marginLeft: 'auto' }}
                  aria-label="Close modal"
                >
                  <CloseIcon />
                </button>
              </div>
              
              <div className="mdb-detail-modal-body">
                {/* Left Column: Image Cover */}
                <div className="mdb-detail-modal-left">
                  <div className="mdb-detail-modal-cover-wrapper">
                    <ImageWithFallback
                      src={getCoverImageUrl(selectedBook)}
                      alt={selectedBook.title}
                      className="mdb-detail-modal-cover"
                    />
                  </div>
                </div>

                {/* Right Column: Metadata Details */}
                <div className="mdb-detail-modal-right">
                  <div className="mdb-detail-modal-header">
                    <span className="mdb-detail-meta-pill">{selectedBook.category}</span>
                    <h3 className="mdb-detail-modal-title">{selectedBook.title}</h3>
                    <p className="mdb-detail-modal-author">by {selectedBook.author}</p>
                  </div>

                  <div>
                    <h4 className="mdb-detail-synopsis-title">Synopsis</h4>
                    <p className="mdb-detail-synopsis-desc">
                      {selectedBook.description || 'No descriptive overview is currently available for this catalog asset.'}
                    </p>
                  </div>

                  <div className="mdb-detail-info-grid">
                    <div className="mdb-detail-info-item">
                      <span className="mdb-detail-info-label">ISBN Reference</span>
                      <span className="mdb-detail-info-value">{selectedBook.isbn || 'N/A'}</span>
                    </div>
                    <div className="mdb-detail-info-item">
                      <span className="mdb-detail-info-label">Availability</span>
                      <span className="mdb-detail-info-value">
                        {avail} of {total} available
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    {isPending ? (
                      <div className="mdb-btn mdb-btn-pending" style={{ width: '100%' }} aria-live="polite">
                        <HourglassIcon />
                        Awaiting Admin Approval
                      </div>
                    ) : isOutOfStock ? (
                      <button
                        className="mdb-btn mdb-btn-out-of-stock"
                        style={{ width: '100%' }}
                        disabled
                        aria-label={total === 1 ? "Currently Borrowed" : "Out of Stock"}
                      >
                        {total === 1 ? 'Currently Borrowed' : 'Out of Stock'}
                      </button>
                    ) : (
                      <button
                        className="mdb-btn mdb-btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => {
                          handleRequestBorrow(selectedBook.id);
                          setSelectedBook(null);
                        }}
                        disabled={isRequesting}
                        aria-label={`Request to borrow ${selectedBook.title}`}
                      >
                        {isRequesting ? 'Submitting...' : 'Request Borrow'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── FOOTER NAVIGATION PANEL ─── */}
      <footer className="mdb-footer">
        <div className="mdb-footer-content">
          <div className="mdb-footer-left">
            <span className="mdb-footer-brand">Library Management System</span>
            <span className="mdb-footer-copy">
              © {new Date().getFullYear()} Library Management System. All rights reserved.
            </span>
          </div>
          <nav className="mdb-footer-right" aria-label="Member secondary navigation">
            <a href="#privacy" className="mdb-footer-link">Privacy Policy</a>
            <a href="#terms" className="mdb-footer-link">Terms of Service</a>
            <a href="#support" className="mdb-footer-link">Contact Support</a>
            <a href="#documentation" className="mdb-footer-link">Documentation</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ─── COVER IMAGE CONTAINER WITH ERROR FALLBACKS ───
function ImageWithFallback({ src, alt, className }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset error if src changes
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div className="mdb-card-cover-placeholder">
        <DefaultBookIcon className="mdb-card-cover-placeholder-icon" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
}

// ─── INLINE SVGS ───

function LogoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function DefaultBookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M9 6h7" />
      <path d="M9 10h7" />
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

function EmptyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function HourglassIcon({ className, style }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h14" />
      <path d="M5 22h14" />
      <path d="M19 2v4c0 3.3-2.7 6-6 6h-2c-3.3 0-6-2.7-6-6V2" />
      <path d="M5 22v-4c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6v4" />
    </svg>
  );
}
