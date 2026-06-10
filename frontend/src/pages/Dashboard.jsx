import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardStats,
  getTransactions,
  getBooks,
  getMembers,
  getUsers,
  createBook,
  createMember,
  issueBook,
  returnBook,
  registerAndCreateMember,
} from '../services/adminService';
import './Dashboard.css';
import shelfBannerImg from '../assets/library_shelf_banner.png';

export default function Dashboard() {
  const navigate = useNavigate();
  const { authUser, logout } = useAuth();
  const token = authUser?.token;

  // ─── CORE DASHBOARD DATA STATE ───
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalMembers: 0,
    borrowedBooks: 0,
    availableBooks: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ─── SEARCH / TABLE FILTER STATE ───
  const [searchText, setSearchText] = useState('');

  // ─── MODAL CONTROLS ───
  const [activeModal, setActiveModal] = useState(null); // 'add-book' | 'add-member' | 'issue-book' | 'return-book' | null
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── MODAL FORM STATES ───
  // Add Book Form
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'General',
    description: '',
    coverImageUrl: '',
    isbn: '',
  });

  // Add Member Form
  const [memberTab, setMemberTab] = useState('link'); // 'link' | 'register'
  const [memberForm, setMemberForm] = useState({
    userId: '',
    memberCode: '',
    fullName: '',
    email: '',
    password: '',
  });

  // Issue Book Form (search suggestions helper)
  const [issueForm, setIssueForm] = useState({
    bookSearch: '',
    bookId: '',
    memberSearch: '',
    memberId: '',
  });
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [memberSuggestions, setMemberSuggestions] = useState([]);

  // Return Book Form
  const [returnForm, setReturnForm] = useState({
    selectedTransactionId: '', // Select active transaction record directly
  });

  // ─── LOAD DATA FUNCTION ───
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      if (!token) return;

      const [statsData, txData, booksData, membersData, usersData] = await Promise.all([
        getDashboardStats(token),
        getTransactions(token),
        getBooks(token),
        getMembers(token),
        getUsers(token),
      ]);

      setStats(statsData);
      setTransactions(txData);
      setBooks(booksData);
      setMembers(membersData);
      setUsers(usersData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load system dashboard analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  // ─── LOGOUT HANDLER ───
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ─── MODAL CLOSING HELPER ───
  const closeModal = () => {
    setActiveModal(null);
    setModalError('');
    setModalSuccess('');
    setSubmitting(false);
    // Reset Forms
    setBookForm({ title: '', author: '', category: 'General', description: '', coverImageUrl: '', isbn: '' });
    setMemberForm({ userId: '', memberCode: '', fullName: '', email: '', password: '' });
    setIssueForm({ bookSearch: '', bookId: '', memberSearch: '', memberId: '' });
    setReturnForm({ selectedTransactionId: '' });
    setBookSuggestions([]);
    setMemberSuggestions([]);
  };

  // ─── AUTO-SUGGEST FILTERING FOR ISSUE BOOK ───
  useEffect(() => {
    if (!issueForm.bookSearch.trim()) {
      setBookSuggestions([]);
      return;
    }
    const filtered = books.filter(
      (b) =>
        b.availabilityStatus === 'Available' &&
        b.isActive &&
        (b.title.toLowerCase().includes(issueForm.bookSearch.toLowerCase()) ||
          b.author.toLowerCase().includes(issueForm.bookSearch.toLowerCase()))
    );
    setBookSuggestions(filtered.slice(0, 5));
  }, [issueForm.bookSearch, books]);

  useEffect(() => {
    if (!issueForm.memberSearch.trim()) {
      setMemberSuggestions([]);
      return;
    }
    const filtered = members.filter(
      (m) =>
        m.status === 'Active' &&
        (m.memberCode.toLowerCase().includes(issueForm.memberSearch.toLowerCase()) ||
          (m.user?.fullName || '').toLowerCase().includes(issueForm.memberSearch.toLowerCase()))
    );
    setMemberSuggestions(filtered.slice(0, 5));
  }, [issueForm.memberSearch, members]);

  // ─── SUBMIT HANDLERS ───
  const handleAddBookSubmit = async (e) => {
    e.preventDefault();
    if (!bookForm.title.trim() || !bookForm.author.trim()) {
      setModalError('Title and Author fields are strictly mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      await createBook(bookForm, token);
      setModalSuccess('Book asset added successfully to inventory!');
      setTimeout(() => {
        closeModal();
        loadDashboardData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to add book asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberForm.memberCode.trim()) {
      setModalError('Member Code is required.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');

      if (memberTab === 'link') {
        if (!memberForm.userId) {
          setModalError('Please select a User account to link.');
          setSubmitting(false);
          return;
        }
        await createMember(
          {
            userId: parseInt(memberForm.userId, 10),
            memberCode: memberForm.memberCode.trim(),
          },
          token
        );
      } else {
        // Register Tab
        if (!memberForm.fullName.trim() || !memberForm.email.trim() || !memberForm.password.trim()) {
          setModalError('All user fields are required to register a member profile.');
          setSubmitting(false);
          return;
        }
        await registerAndCreateMember(
          {
            fullName: memberForm.fullName.trim(),
            email: memberForm.email.trim(),
            password: memberForm.password,
            role: 'Member',
          },
          memberForm.memberCode.trim(),
          token
        );
      }

      setModalSuccess('Member profile established successfully.');
      setTimeout(() => {
        closeModal();
        loadDashboardData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to establish member profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueBookSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.bookId || !issueForm.memberId) {
      setModalError('Please select a valid Book and Member from the suggestions.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      await issueBook(
        {
          bookId: parseInt(issueForm.bookId, 10),
          memberId: parseInt(issueForm.memberId, 10),
        },
        token
      );
      setModalSuccess('Book asset issued successfully!');
      setTimeout(() => {
        closeModal();
        loadDashboardData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to loan selected asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnBookSubmit = async (e) => {
    e.preventDefault();
    if (!returnForm.selectedTransactionId) {
      setModalError('Please select an active checkout record to complete the return.');
      return;
    }

    const targetTx = transactions.find((t) => t.id === parseInt(returnForm.selectedTransactionId, 10));
    if (!targetTx) {
      setModalError('Selected transaction record is invalid.');
      return;
    }

    try {
      setSubmitting(true);
      setModalError('');
      await returnBook(
        {
          bookId: targetTx.bookId,
          memberId: targetTx.memberId,
        },
        token
      );
      setModalSuccess('Circulation register updated. Asset returned successfully!');
      setTimeout(() => {
        closeModal();
        loadDashboardData();
      }, 1000);
    } catch (err) {
      setModalError(err.message || 'Failed to complete book return transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── FILTER RECENT TRANSACTIONS TABLE ───
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const bTitle = (tx.book?.title || '').toLowerCase();
      const mName = (tx.member?.user?.fullName || '').toLowerCase();
      const statusText = (tx.status || '').toLowerCase();
      const query = searchText.toLowerCase().trim();

      return bTitle.includes(query) || mName.includes(query) || statusText.includes(query);
    });
  }, [transactions, searchText]);

  // List of active transactions (for return dropdown selection)
  const activeTransactions = useMemo(() => {
    return transactions.filter((t) => t.returnDate === null && t.status === 'Issued');
  }, [transactions]);

  // Filter out users who are already linked to a member profile (for select list in dual modal)
  const unlinkedUsers = useMemo(() => {
    const linkedUserIds = members.map((m) => m.userId);
    return users.filter((u) => u.role === 'Member' && !linkedUserIds.includes(u.id));
  }, [users, members]);

  // Dynamic formatting of date string helper
  const formatDateString = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  // Check if a transaction is overdue
  const getTransactionStatus = (tx) => {
    if (tx.status === 'Returned') return 'Returned';
    const due = new Date(tx.dueDate);
    const now = new Date();
    return now > due ? 'Overdue' : 'On Time';
  };

  return (
    <div className="dashboard-container">
      {/* ─── SIDEBAR NAVIGATION ─── */}
      <aside className="db-sidebar">
        <div className="db-sidebar-top">
          <div className="db-brand">
            <h1 className="db-brand-title">Library Admin</h1>
            <p className="db-brand-subtitle">Management Portal</p>
          </div>
          <nav className="db-nav" aria-label="Sidebar navigation">
            <div className="db-nav-item db-nav-item-active">
              <DashboardIcon className="db-nav-icon" />
              <span>Dashboard</span>
            </div>
            <div className="db-nav-item" onClick={() => loadDashboardData()}>
              <BookIcon className="db-nav-icon" />
              <span>Books</span>
            </div>
            <div className="db-nav-item" onClick={() => loadDashboardData()}>
              <MemberIcon className="db-nav-icon" />
              <span>Members</span>
            </div>
            <div className="db-nav-item" onClick={() => loadDashboardData()}>
              <TransactionIcon className="db-nav-icon" />
              <span>Transactions</span>
            </div>
          </nav>
        </div>
        <div className="db-sidebar-bottom">
          <button className="db-logout-btn" onClick={handleLogout} aria-label="Logout button">
            <LogoutIcon className="db-nav-icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT BODY AREA ─── */}
      <main className="db-main">
        {/* HEADER PANEL */}
        <header className="db-header">
          <h2 className="db-header-title">Admin Dashboard</h2>
          <div className="db-header-controls">
            <div className="db-search-wrapper">
              <SearchIcon className="db-search-icon" />
              <input
                type="text"
                placeholder="Search catalog..."
                className="db-search-input"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                aria-label="Search catalog input"
              />
            </div>
            <button className="db-icon-btn" aria-label="Notifications">
              <BellIcon />
            </button>
            <button className="db-icon-btn" aria-label="Settings">
              <SettingsIcon />
            </button>
            <div className="db-avatar-wrapper">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop"
                alt="Admin Profile"
                className="db-avatar"
              />
            </div>
          </div>
        </header>

        {/* ANALYTICS SCROLLABLE GRID BODY */}
        <div className="db-body">
          {/* STATS METRIC CARDS */}
          <section className="db-stats-grid" aria-label="Library metrics">
            <div className="db-stat-card">
              <div className="db-stat-icon-container books">
                <BookOpenIcon className="db-stat-icon" />
              </div>
              <div className="db-stat-info">
                <span className="db-stat-label">Total Books</span>
                <span className="db-stat-value">
                  {loading ? '...' : stats.totalBooks.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-icon-container members">
                <PeopleIcon className="db-stat-icon" />
              </div>
              <div className="db-stat-info">
                <span className="db-stat-label">Total Members</span>
                <span className="db-stat-value">
                  {loading ? '...' : stats.totalMembers.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-icon-container borrowed">
                <ExportIcon className="db-stat-icon" />
              </div>
              <div className="db-stat-info">
                <span className="db-stat-label">Borrowed Books</span>
                <span className="db-stat-value">
                  {loading ? '...' : stats.borrowedBooks.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="db-stat-card">
              <div className="db-stat-icon-container available">
                <CheckCircleIcon className="db-stat-icon" />
              </div>
              <div className="db-stat-info">
                <span className="db-stat-label">Available Books</span>
                <span className="db-stat-value">
                  {loading ? '...' : stats.availableBooks.toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          {/* TWO COLUMNS WRAPPER */}
          <div className="db-grid-main">
            {/* COLUMN 1: RECENT TRANSACTIONS TABLE */}
            <section className="db-panel-card" aria-label="Recent transactions panel">
              <div className="db-panel-header">
                <h3 className="db-panel-title">Recent Transactions</h3>
                <a href="#transactions" className="db-panel-link" onClick={() => loadDashboardData()}>
                  View All
                </a>
              </div>

              <div className="db-table-wrapper">
                {loading ? (
                  <div className="db-table-empty">Loading transaction records...</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="db-table-empty">No transaction logs match search parameters.</div>
                ) : (
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Book Title</th>
                        <th>Member Name</th>
                        <th>Issue Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.slice(0, 6).map((tx) => {
                        const calculatedStatus = getTransactionStatus(tx);
                        return (
                          <tr key={tx.id}>
                            <td>{tx.book?.title || 'Unknown Asset'}</td>
                            <td>{tx.member?.user?.fullName || tx.member?.memberCode || 'Unknown'}</td>
                            <td>{formatDateString(tx.issueDate)}</td>
                            <td>{formatDateString(tx.dueDate)}</td>
                            <td>
                              <span
                                className={`badge ${
                                  calculatedStatus === 'Returned'
                                    ? 'returned'
                                    : calculatedStatus === 'Overdue'
                                    ? 'overdue'
                                    : 'on-time'
                                }`}
                              >
                                {calculatedStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            {/* COLUMN 2: QUICK ACTIONS & STATUS */}
            <div className="db-right-column">
              <section className="db-panel-card" aria-label="Quick actions panel">
                <h3 className="db-panel-title" style={{ marginBottom: '16px' }}>
                  Quick Actions
                </h3>
                <div className="db-actions-list">
                  <button
                    className="db-action-btn db-action-btn-primary"
                    onClick={() => setActiveModal('add-book')}
                    aria-label="Add Book action"
                  >
                    <div className="db-btn-inner">
                      <PlusIcon className="db-action-icon" />
                      <span>Add Book</span>
                    </div>
                    <ChevronRightIcon className="db-chevron-icon" />
                  </button>

                  <button
                    className="db-action-btn db-action-btn-secondary"
                    onClick={() => {
                      setActiveModal('add-member');
                      setMemberTab('link');
                    }}
                    aria-label="Add Member action"
                  >
                    <div className="db-btn-inner">
                      <UserPlusIcon className="db-action-icon" />
                      <span>Add Member</span>
                    </div>
                    <ChevronRightIcon className="db-chevron-icon" />
                  </button>

                  <button
                    className="db-action-btn db-action-btn-secondary"
                    onClick={() => setActiveModal('issue-book')}
                    aria-label="Issue Book action"
                  >
                    <div className="db-btn-inner">
                      <ExportIcon className="db-action-icon" />
                      <span>Issue Book</span>
                    </div>
                    <ChevronRightIcon className="db-chevron-icon" />
                  </button>

                  <button
                    className="db-action-btn db-action-btn-secondary"
                    onClick={() => setActiveModal('return-book')}
                    aria-label="Return Book action"
                  >
                    <div className="db-btn-inner">
                      <ImportIcon className="db-action-icon" />
                      <span>Return Book</span>
                    </div>
                    <ChevronRightIcon className="db-chevron-icon" />
                  </button>
                </div>
              </section>

              {/* OPERATIONAL STATUS CARD */}
              <section className="db-status-card" aria-label="Operational status">
                <h4 className="db-status-title">Operational Status</h4>
                <p className="db-status-desc">
                  System is operational. Last catalog update was 12 minutes ago.
                </p>
              </section>

              {/* DECORATIVE ACCESS BANNER */}
              <section className="db-promo-card" aria-label="Institutional Archive Access">
                <div className="db-promo-bg" style={{ backgroundImage: `url(${shelfBannerImg})` }}></div>
                <div className="db-promo-overlay"></div>
                <h4 className="db-promo-title">Institutional Archive Access</h4>
              </section>
            </div>
          </div>
        </div>
      </main>

      {/* ─── MODAL DIALOGS FOR QUICK ACTIONS ─── */}

      {/* 1. ADD BOOK MODAL */}
      {activeModal === 'add-book' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add New Book Asset</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleAddBookSubmit}>
              <div className="modal-body">
                {modalError && <div className="form-alert">{modalError}</div>}
                {modalSuccess && <div className="form-success">{modalSuccess}</div>}

                <div className="form-group">
                  <label htmlFor="modal-book-title">Book Title *</label>
                  <input
                    id="modal-book-title"
                    type="text"
                    className="form-input"
                    placeholder="e.g. The Great Gatsby"
                    value={bookForm.title}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-book-author">Author *</label>
                  <input
                    id="modal-book-author"
                    type="text"
                    className="form-input"
                    placeholder="e.g. F. Scott Fitzgerald"
                    value={bookForm.author}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, author: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-book-category">Category</label>
                  <select
                    id="modal-book-category"
                    className="form-select"
                    value={bookForm.category}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, category: e.target.value }))}
                    disabled={submitting}
                  >
                    <option value="General">General</option>
                    <option value="Fiction">Fiction</option>
                    <option value="Non-Fiction">Non-Fiction</option>
                    <option value="Science & Tech">Science & Tech</option>
                    <option value="History">History</option>
                    <option value="Biography">Biography</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-book-isbn">ISBN (10 or 13 Alphanumeric chars)</label>
                  <input
                    id="modal-book-isbn"
                    type="text"
                    className="form-input"
                    placeholder="e.g. 0747532699"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, isbn: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-book-cover">Cover Image URL (Optional)</label>
                  <input
                    id="modal-book-cover"
                    type="url"
                    className="form-input"
                    placeholder="e.g. https://covers.openlibrary.org/b/id/8259841-L.jpg"
                    value={bookForm.coverImageUrl}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-book-desc">Description (Optional)</label>
                  <textarea
                    id="modal-book-desc"
                    className="form-input form-textarea"
                    placeholder="Brief description of the literary asset..."
                    value={bookForm.description}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={submitting}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. ADD MEMBER MODAL */}
      {activeModal === 'add-member' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Establish Member Profile</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-tabs" role="tablist">
              <button
                type="button"
                className={`modal-tab ${memberTab === 'link' ? 'modal-tab-active' : ''}`}
                onClick={() => {
                  setMemberTab('link');
                  setModalError('');
                }}
                role="tab"
                aria-selected={memberTab === 'link'}
              >
                Link Registered User
              </button>
              <button
                type="button"
                className={`modal-tab ${memberTab === 'register' ? 'modal-tab-active' : ''}`}
                onClick={() => {
                  setMemberTab('register');
                  setModalError('');
                }}
                role="tab"
                aria-selected={memberTab === 'register'}
              >
                Register New User
              </button>
            </div>
            <form onSubmit={handleAddMemberSubmit}>
              <div className="modal-body">
                {modalError && <div className="form-alert">{modalError}</div>}
                {modalSuccess && <div className="form-success">{modalSuccess}</div>}

                {memberTab === 'link' ? (
                  <>
                    <div className="form-group">
                      <label htmlFor="modal-member-user">Select User Account *</label>
                      <select
                        id="modal-member-user"
                        className="form-select"
                        value={memberForm.userId}
                        onChange={(e) => setMemberForm((prev) => ({ ...prev, userId: e.target.value }))}
                        disabled={submitting}
                      >
                        <option value="">-- Choose User Account --</option>
                        {unlinkedUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName} ({u.email})
                          </option>
                        ))}
                      </select>
                      <small style={{ color: '#757684', marginTop: '4px', display: 'block' }}>
                        Shows registered users of role &quot;Member&quot; who are not yet linked.
                      </small>
                    </div>
                  </>
                ) : (
                  <>
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
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="modal-member-code">Library Card ID / Member Code *</label>
                  <input
                    id="modal-member-code"
                    type="text"
                    className="form-input"
                    placeholder="e.g. MEM0024"
                    value={memberForm.memberCode}
                    onChange={(e) => setMemberForm((prev) => ({ ...prev, memberCode: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting}>
                  {submitting ? 'Creating...' : memberTab === 'link' ? 'Link Account' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ISSUE BOOK MODAL */}
      {activeModal === 'issue-book' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Circulation: Loan Asset</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleIssueBookSubmit}>
              <div className="modal-body">
                {modalError && <div className="form-alert">{modalError}</div>}
                {modalSuccess && <div className="form-success">{modalSuccess}</div>}

                {/* Searchable Book field */}
                <div className="form-group relative-container">
                  <label htmlFor="modal-issue-book">Select Book Title (Search) *</label>
                  <input
                    id="modal-issue-book"
                    type="text"
                    className="form-input"
                    placeholder="Type title or author to search..."
                    value={issueForm.bookSearch}
                    onChange={(e) =>
                      setIssueForm((prev) => ({ ...prev, bookSearch: e.target.value, bookId: '' }))
                    }
                    disabled={submitting}
                    autoComplete="off"
                  />
                  {bookSuggestions.length > 0 && (
                    <ul className="suggestions-list" role="listbox">
                      {bookSuggestions.map((b) => (
                        <li
                          key={b.id}
                          className="suggestion-item"
                          onClick={() => {
                            setIssueForm((prev) => ({
                              ...prev,
                              bookSearch: `${b.title} - ${b.author}`,
                              bookId: b.id.toString(),
                            }));
                            setBookSuggestions([]);
                          }}
                        >
                          <strong>{b.title}</strong> by {b.author} ({b.category})
                        </li>
                      ))}
                    </ul>
                  )}
                  {issueForm.bookSearch.trim() &&
                    !issueForm.bookId &&
                    bookSuggestions.length === 0 && (
                      <ul className="suggestions-list">
                        <li className="suggestion-item-empty">No available books matched search.</li>
                      </ul>
                    )}
                  {issueForm.bookId && (
                    <small style={{ color: '#15803d', display: 'block', marginTop: '4px' }}>
                      ✓ Selected Book ID: {issueForm.bookId}
                    </small>
                  )}
                </div>

                {/* Searchable Member field */}
                <div className="form-group relative-container">
                  <label htmlFor="modal-issue-member">Select Member Name / Code (Search) *</label>
                  <input
                    id="modal-issue-member"
                    type="text"
                    className="form-input"
                    placeholder="Type member name or card code..."
                    value={issueForm.memberSearch}
                    onChange={(e) =>
                      setIssueForm((prev) => ({ ...prev, memberSearch: e.target.value, memberId: '' }))
                    }
                    disabled={submitting}
                    autoComplete="off"
                  />
                  {memberSuggestions.length > 0 && (
                    <ul className="suggestions-list" role="listbox">
                      {memberSuggestions.map((m) => (
                        <li
                          key={m.id}
                          className="suggestion-item"
                          onClick={() => {
                            setIssueForm((prev) => ({
                              ...prev,
                              memberSearch: `${m.user?.fullName || 'Member'} (${m.memberCode})`,
                              memberId: m.id.toString(),
                            }));
                            setMemberSuggestions([]);
                          }}
                        >
                          <strong>{m.user?.fullName || 'User'}</strong> - Code: {m.memberCode} (Status: {m.status})
                        </li>
                      ))}
                    </ul>
                  )}
                  {issueForm.memberSearch.trim() &&
                    !issueForm.memberId &&
                    memberSuggestions.length === 0 && (
                      <ul className="suggestions-list">
                        <li className="suggestion-item-empty">No active members matched search.</li>
                      </ul>
                    )}
                  {issueForm.memberId && (
                    <small style={{ color: '#15803d', display: 'block', marginTop: '4px' }}>
                      ✓ Selected Member ID: {issueForm.memberId}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Loan Terms</label>
                  <input
                    type="text"
                    className="form-input"
                    value="Standard 14-Day Lease Period"
                    disabled
                    style={{ backgroundColor: '#f7f9ff', borderStyle: 'dashed' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting || !issueForm.bookId || !issueForm.memberId}>
                  {submitting ? 'Processing...' : 'Issue Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. RETURN BOOK MODAL */}
      {activeModal === 'return-book' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Circulation: Return Asset</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleReturnBookSubmit}>
              <div className="modal-body">
                {modalError && <div className="form-alert">{modalError}</div>}
                {modalSuccess && <div className="form-success">{modalSuccess}</div>}

                <div className="form-group">
                  <label htmlFor="modal-return-tx">Select Active Checkout Record *</label>
                  <select
                    id="modal-return-tx"
                    className="form-select"
                    value={returnForm.selectedTransactionId}
                    onChange={(e) => setReturnForm({ selectedTransactionId: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="">-- Choose Book Loan to Settle --</option>
                    {activeTransactions.map((tx) => (
                      <option key={tx.id} value={tx.id}>
                        &quot;{tx.book?.title}&quot; borrowed by {tx.member?.user?.fullName || tx.member?.memberCode} (Due: {formatDateString(tx.dueDate)})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#757684', marginTop: '4px', display: 'block' }}>
                    Currently shows {activeTransactions.length} issued items out on loan.
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting || !returnForm.selectedTransactionId}>
                  {submitting ? 'Processing...' : 'Settle Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── INLINE SVG ICON COMPONENTS ───

function DashboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function BookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function MemberIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TransactionIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 8 16 13" />
      <line x1="21" y1="8" x2="9" y2="8" />
      <polyline points="8 21 3 16 8 11" />
      <line x1="3" y1="16" x2="15" y2="16" />
    </svg>
  );
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function BookOpenIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function PeopleIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function UserPlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function ExportIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

function ImportIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12H4M10 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
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
