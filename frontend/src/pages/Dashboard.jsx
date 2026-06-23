import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getDashboardStats,
  getTransactions,
  getBooks,
  getMembers,
  getUsers,
  getPendingRequests,
} from '../services/adminService';
import BookInventoryPanel from '../components/BookInventoryPanel';
import MemberInventoryPanel from '../components/MemberInventoryPanel';
import TransactionPanel from '../components/TransactionPanel';
import AccountSettingsPanel from '../components/AccountSettingsPanel';
import CirculationQueuePanel from '../components/CirculationQueuePanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import AddBookModal from '../components/AddBookModal';
import AddMemberModal from '../components/AddMemberModal';
import IssueBookModal from '../components/IssueBookModal';
import ReturnBookModal from '../components/ReturnBookModal';
import { CardSkeleton, TableSkeleton } from '../components/SkeletonLoader';
import {
  CloseIcon,
  DashboardIcon,
  BookIcon,
  MemberIcon,
  TransactionIcon,
  ClockIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  BookOpenIcon,
  PeopleIcon,
  CheckCircleIcon,
  PlusIcon,
  UserPlusIcon,
  ExportIcon,
  ImportIcon,
  ChevronRightIcon,
  SearchIcon
} from '../components/Icons';
import './Dashboard.css';
import shelfBannerImg from '../assets/library_shelf_banner.png';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { authUser, logout } = useAuth();
  const toast = useToast();
  const token = authUser?.token;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ─── DELIGHT: DEVTOOLS EASTER EGG & CONSOLE WELCOME ───
  useEffect(() => {
    console.log(
      '%c📚 Academic Archive System',
      'color: #00288e; font-family: "Lato", sans-serif; font-size: 20px; font-weight: 900; text-shadow: 1px 1px 0px #eaedff;'
    );
    console.log(
      '%cSystem operational. Ready to index knowledge and coordinate resources.',
      'color: #505f76; font-family: "Lato", sans-serif; font-size: 14px; font-weight: 500;'
    );
  }, []);

  // ─── DELIGHT: CONTEXTUAL TIME-OF-DAY GREETINGS ───
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = authUser?.name ? authUser.name.split(' ')[0] : 'Admin';
    if (hour < 12) {
      return {
        text: `Good morning, ${name}`,
        sub: 'Ready to manage the archives and circulate some literature today?'
      };
    } else if (hour < 17) {
      return {
        text: `Good afternoon, ${name}`,
        sub: 'Archive services are online. Running smooth, structured operations.'
      };
    } else {
      return {
        text: `Good evening, ${name}`,
        sub: 'Winding down circulation. Let’s review today’s system activity.'
      };
    }
  };
  const greeting = getGreeting();

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
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    if (!token) return;
    const fetchPendingCount = async () => {
      try {
        const data = await getPendingRequests(1, 1, token);
        setPendingCount(data.totalCount ?? data.TotalCount ?? 0);
      } catch (err) {
        console.error('Failed to fetch pending requests count', err);
      }
    };
    fetchPendingCount();
  }, [token]);

  // ─── VIEW STATE ───
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') || 'dashboard';
  const setActiveView = (view) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        setSearchParams({ view });
      });
    } else {
      setSearchParams({ view });
    }
  };

  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ─── SEARCH / TABLE FILTER STATE ───
  const [searchText, setSearchText] = useState('');

  // ─── MODAL CONTROLS ───
  const [activeModal, setActiveModal] = useState(null); // 'add-book' | 'add-member' | 'issue-book' | 'return-book' | null

  // Click outside to close profile dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAvatarDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ─── LOAD DATA FUNCTIONS ───
  const loadDashboardStatsAndTransactions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      if (!token) return;

      const [statsData, txData] = await Promise.all([
        getDashboardStats(token),
        getTransactions(token),
      ]);

      setStats(statsData);
      setTransactions(txData);
      setLastSync(new Date());
      setSyncError(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load system dashboard analytics.');
      setSyncError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadBooksData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      if (!token) return;

      const booksData = await getBooks(token);
      setBooks(booksData);
      setLastSync(new Date());
      setSyncError(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load library book inventory.');
      setSyncError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMembersAndUsersData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      if (!token) return;

      const [membersData, usersData] = await Promise.all([
        getMembers(token),
        getUsers(token),
      ]);

      setMembers(membersData);
      setUsers(usersData);
      setLastSync(new Date());
      setSyncError(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load member/user profiles.');
      setSyncError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    if (activeView === 'dashboard' || activeView === 'transactions') {
      const isCached = stats.totalBooks > 0 || transactions.length > 0;
      loadDashboardStatsAndTransactions(isCached);
    } else if (activeView === 'books') {
      const isCached = books.length > 0;
      loadBooksData(isCached);
    } else if (activeView === 'members') {
      const isCached = members.length > 0 || users.length > 0;
      loadMembersAndUsersData(isCached);
    }
  }, [activeView, token]);

  // ─── LOGOUT HANDLER ───
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ─── MODAL CLOSING HELPER ───
  const closeModal = () => {
    setActiveModal(null);
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

  // Dynamic formatting of date string helper
  const formatDateString = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  // Check if a transaction is overdue
  const getTransactionStatus = (tx) => {
    if (tx.status === 'Pending') return 'Pending';
    if (tx.status === 'Rejected') return 'Rejected';
    if (tx.status === 'Returned' || tx.returnDate !== null) return 'Returned';
    const due = new Date(tx.dueDate);
    const now = new Date();
    return now > due ? 'Overdue' : 'On Time';
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar Backdrop Overlay on Mobile */}
      {sidebarOpen && (
        <div className="db-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── SIDEBAR NAVIGATION ─── */}
      <aside className={`db-sidebar ${sidebarOpen ? 'db-sidebar-open' : ''} ${sidebarCollapsed ? 'db-sidebar-collapsed' : ''}`}>
        <div className="db-sidebar-top">
          <div className="db-brand-row">
            {!sidebarCollapsed ? (
              <div className="db-brand animate-fade-in-up">
                <h1 className="db-brand-title">Library Admin</h1>
                <p className="db-brand-subtitle">Management Portal</p>
              </div>
            ) : (
              <div className="db-brand-collapsed-logo animate-fade-in-up" style={{ color: '#00288e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BookOpenIcon className="w-6 h-6" />
              </div>
            )}
            <button
              className="db-sidebar-toggle-btn desktop-only"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon style={{ width: '12px', height: '12px' }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              )}
            </button>
            <button
              className="db-sidebar-close-btn mobile-only"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="db-nav" aria-label="Sidebar navigation">
            <div
              className={`db-nav-item ${activeView === 'dashboard' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('dashboard');
                loadDashboardStatsAndTransactions(true);
                setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? "Dashboard" : undefined}
            >
              <DashboardIcon className="db-nav-icon" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </div>
            <div
              className={`db-nav-item ${activeView === 'analytics' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('analytics');
                setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? "Analytics" : undefined}
            >
              <svg className="db-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              {!sidebarCollapsed && <span>Analytics</span>}
            </div>
            <div
              className={`db-nav-item ${activeView === 'books' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('books');
                loadBooksData(true);
                setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? "Books" : undefined}
            >
              <BookIcon className="db-nav-icon" />
              {!sidebarCollapsed && <span>Books</span>}
            </div>
            <div
              className={`db-nav-item ${activeView === 'members' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('members');
                loadMembersAndUsersData(true);
                setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? "Members" : undefined}
            >
              <MemberIcon className="db-nav-icon" />
              {!sidebarCollapsed && <span>Members</span>}
            </div>
            <div
              className={`db-nav-item ${activeView === 'transactions' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('transactions');
                loadDashboardStatsAndTransactions(true);
                setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? "Transactions" : undefined}
            >
              <TransactionIcon className="db-nav-icon" />
              {!sidebarCollapsed && <span>Transactions</span>}
            </div>
            <div
              className={`db-nav-item ${activeView === 'requests' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('requests');
                setSidebarOpen(false);
              }}
              title={sidebarCollapsed ? "Borrow Requests" : undefined}
            >
              {sidebarCollapsed ? (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClockIcon className="db-nav-icon" />
                  {pendingCount > 0 && (
                    <span className="db-sidebar-badge-mini">
                      {pendingCount}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <ClockIcon className="db-nav-icon" />
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>Borrow Requests</span>
                    {pendingCount > 0 && (
                      <span className="db-sidebar-badge">
                        {pendingCount}
                      </span>
                    )}
                  </span>
                </>
              )}
            </div>
          </nav>
        </div>
        <div className="db-sidebar-bottom">
          <button className="db-logout-btn" onClick={handleLogout} aria-label="Logout button" title={sidebarCollapsed ? "Logout" : undefined}>
            <LogoutIcon className="db-nav-icon" />{!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT BODY AREA ─── */}
      <main className={`db-main ${sidebarCollapsed ? 'db-main-collapsed' : ''}`}>
        {/* HEADER PANEL */}
        <header className="db-header">
          <button
            className="db-hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </button>
          <h2 className="db-header-title">
            {activeView === 'books'
              ? 'Book Inventory'
              : activeView === 'members'
                ? 'Member Directory'
                : activeView === 'transactions'
                  ? 'Transactions Ledger'
                  : activeView === 'requests'
                    ? 'Circulation Request Queue'
                    : activeView === 'settings'
                      ? 'Account Settings'
                      : activeView === 'analytics'
                        ? 'System Analytics & KPIs'
                        : 'Admin Dashboard'}
          </h2>
          <div className="db-header-controls">
            <div className="db-avatar-wrapper" ref={dropdownRef}>
              <button
                className="db-avatar-btn"
                onClick={() => setAvatarDropdownOpen((prev) => !prev)}
                aria-label="Profile menu"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop"
                  alt="Admin Profile"
                  className="db-avatar"
                />
              </button>
              {avatarDropdownOpen && (
                <div className="avatar-dropdown">
                  <div className="avatar-dropdown-header">
                    <span className="avatar-dropdown-name">{authUser?.name}</span>
                    <span className="avatar-dropdown-role">{authUser?.role}</span>
                  </div>
                  <hr className="avatar-dropdown-divider" />
                  <div className="avatar-dropdown-body">
                    <button
                      onClick={() => {
                        setActiveView('settings');
                        setAvatarDropdownOpen(false);
                      }}
                      className="avatar-dropdown-item"
                    >
                      <SettingsIcon className="avatar-dropdown-icon" />
                      <span>Account Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setAvatarDropdownOpen(false);
                      }}
                      className="avatar-dropdown-item logout"
                    >
                      <LogoutIcon className="avatar-dropdown-icon" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ANALYTICS SCROLLABLE GRID BODY */}
        {activeView === 'dashboard' && (
          <div className="db-body db-view-animate">
            {/* DELIGHT: WELCOME BANNER */}
            <div className="db-welcome-banner">
              <div className="db-welcome-text">
                <h3 className="db-welcome-title">{greeting.text}</h3>
                <p className="db-welcome-subtitle">{greeting.sub}</p>
              </div>
              <div className="db-welcome-time">
                <ClockIcon className="db-welcome-clock-icon" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            {/* STATS METRIC CARDS */}
            {loading ? (
              <section className="db-stats-grid" aria-label="Library metrics loading">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </section>
            ) : (
              <section className="db-stats-grid" aria-label="Library metrics">
                <div className="db-stat-card db-stat-card-animate" style={{ '--i': 0 }}>
                  <div className="db-stat-icon-container books">
                    <BookOpenIcon className="db-stat-icon" />
                  </div>
                  <div className="db-stat-info">
                    <span className="db-stat-label">Total Books</span>
                    <span className="db-stat-value">
                      {stats.totalBooks.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="db-stat-card db-stat-card-animate" style={{ '--i': 1 }}>
                  <div className="db-stat-icon-container members">
                    <PeopleIcon className="db-stat-icon" />
                  </div>
                  <div className="db-stat-info">
                    <span className="db-stat-label">Total Members</span>
                    <span className="db-stat-value">
                      {stats.totalMembers.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="db-stat-card db-stat-card-animate" style={{ '--i': 2 }}>
                  <div className="db-stat-icon-container borrowed">
                    <ExportIcon className="db-stat-icon" />
                  </div>
                  <div className="db-stat-info">
                    <span className="db-stat-label">Borrowed Books</span>
                    <span className="db-stat-value">
                      {stats.borrowedBooks.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="db-stat-card db-stat-card-animate" style={{ '--i': 3 }}>
                  <div className="db-stat-icon-container available">
                    <CheckCircleIcon className="db-stat-icon" />
                  </div>
                  <div className="db-stat-info">
                    <span className="db-stat-label">Available Books</span>
                    <span className="db-stat-value">
                      {stats.availableBooks.toLocaleString()}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* TWO COLUMNS WRAPPER */}
            <div className="db-grid-main">
              {/* COLUMN 1: RECENT TRANSACTIONS TABLE */}
              <section className="db-panel-card" aria-label="Recent transactions panel">
                <div className="db-panel-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  <h3 className="db-panel-title">Recent Transactions</h3>
                  <div className="db-panel-controls">
                    <div className="db-search-wrapper">
                      <SearchIcon className="db-search-icon" />
                      <input
                        type="text"
                        placeholder="Search recent..."
                        className="db-search-input"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        aria-label="Search recent transactions"
                        style={{ height: '36px', padding: '0 12px 0 32px' }}
                      />
                    </div>
                    <a href="#transactions" className="db-panel-link" onClick={() => { setActiveView('transactions'); loadDashboardStatsAndTransactions(true); }}>
                      View All
                    </a>
                  </div>
                </div>

                <div className="db-table-wrapper">
                  {loading ? (
                    <TableSkeleton cols={5} rows={5} />
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
                                  className={`badge ${calculatedStatus === 'Returned'
                                      ? 'returned'
                                      : calculatedStatus === 'Overdue'
                                        ? 'overdue'
                                        : calculatedStatus === 'Pending'
                                          ? 'pending'
                                          : calculatedStatus === 'Rejected'
                                            ? 'rejected'
                                            : 'on-time'
                                    }`}
                                  style={
                                    calculatedStatus === 'Pending'
                                      ? { backgroundColor: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }
                                      : calculatedStatus === 'Rejected'
                                        ? { backgroundColor: '#fdf2f8', color: '#db2777', borderColor: '#fbcfe8' }
                                        : {}
                                  }
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
                      className="db-action-btn db-action-btn-primary db-quick-action-animate"
                      style={{ '--i': 0 }}
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
                      className="db-action-btn db-action-btn-secondary db-quick-action-animate"
                      style={{ '--i': 1 }}
                      onClick={() => {
                        setActiveModal('add-member');
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
                      className="db-action-btn db-action-btn-secondary db-quick-action-animate"
                      style={{ '--i': 2 }}
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
                      className="db-action-btn db-action-btn-secondary db-quick-action-animate"
                      style={{ '--i': 3 }}
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
                  <h4 className="db-status-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`db-status-dot ${syncError ? 'offline' : 'online'}`} />
                    Operational Status
                  </h4>
                  <p className="db-status-desc">
                    {syncError
                      ? 'Connection offline or failed to fetch database updates.'
                      : `System is operational. Database synced at ${lastSync ? lastSync.toLocaleTimeString() : '—'}.`
                    }
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* BOOK INVENTORY CRUD PANEL */}
        {activeView === 'books' && (
          <div className="db-view-animate">
            <BookInventoryPanel
              books={books}
              loading={loading}
              token={token}
              onRefresh={() => { loadBooksData(true); loadDashboardStatsAndTransactions(true); }}
              onAddBookClick={() => setActiveModal('add-book')}
            />
          </div>
        )}

        {/* MEMBER INVENTORY CRUD PANEL */}
        {activeView === 'members' && (
          <div className="db-view-animate">
            <MemberInventoryPanel
              members={members}
              users={users}
              loading={loading}
              token={token}
              onRefresh={() => { loadMembersAndUsersData(true); loadDashboardStatsAndTransactions(true); }}
              onAddMemberClick={() => setActiveModal('add-member')}
            />
          </div>
        )}

        {/* TRANSACTIONS LEDGER CRUD PANEL */}
        {activeView === 'transactions' && (
          <div className="db-view-animate">
            <TransactionPanel
              transactions={transactions}
              loading={loading}
              token={token}
              onRefresh={() => loadDashboardStatsAndTransactions(true)}
              onIssueBookClick={() => setActiveModal('issue-book')}
              onReturnBookClick={() => setActiveModal('return-book')}
            />
          </div>
        )}

        {/* SYSTEM ANALYTICS & KPIs PANEL */}
        {activeView === 'analytics' && (
          <div className="db-view-animate">
            <AnalyticsPanel
              token={token}
            />
          </div>
        )}

        {/* CIRCULATION REQUEST QUEUE PANEL */}
        {activeView === 'requests' && (
          <div className="db-view-animate">
            <CirculationQueuePanel
              token={token}
              onQueueCountChange={setPendingCount}
            />
          </div>
        )}

        {/* ACCOUNT PROFILE SETTINGS PANEL */}
        {activeView === 'settings' && (
          <div className="db-view-animate">
            <AccountSettingsPanel
              userId={authUser?.userId}
              token={token}
            />
          </div>
        )}
      </main>

      {/* ─── MODAL DIALOGS FOR QUICK ACTIONS ─── */}
      <AddBookModal
        isOpen={activeModal === 'add-book'}
        onClose={closeModal}
        token={token}
        onSuccess={() => {
          loadBooksData(true);
          loadDashboardStatsAndTransactions(true);
        }}
      />

      <AddMemberModal
        isOpen={activeModal === 'add-member'}
        onClose={closeModal}
        token={token}
        onSuccess={() => {
          loadMembersAndUsersData(true);
          loadDashboardStatsAndTransactions(true);
        }}
      />

      <IssueBookModal
        isOpen={activeModal === 'issue-book'}
        onClose={closeModal}
        token={token}
        onSuccess={() => {
          loadDashboardStatsAndTransactions(true);
          loadBooksData(true);
          loadMembersAndUsersData(true);
        }}
      />

      <ReturnBookModal
        isOpen={activeModal === 'return-book'}
        onClose={closeModal}
        token={token}
        onSuccess={() => {
          loadDashboardStatsAndTransactions(true);
          loadBooksData(true);
          loadMembersAndUsersData(true);
        }}
      />
    </div>
  );
}




