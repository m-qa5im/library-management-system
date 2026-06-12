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
  createBook,
  createMember,
  issueBook,
  returnBook,
  registerAndCreateMember,
  registerUser,
  searchMembers,
  searchBooks,
  searchActiveTransactions,
  returnTransaction,
  getPendingRequests,
} from '../services/adminService';
import BookInventoryPanel from '../components/BookInventoryPanel';
import MemberInventoryPanel from '../components/MemberInventoryPanel';
import TransactionPanel from '../components/TransactionPanel';
import AutocompleteLookup from '../components/AutocompleteLookup';
import AccountSettingsPanel from '../components/AccountSettingsPanel';
import CirculationQueuePanel from '../components/CirculationQueuePanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
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
    setSearchParams({ view });
  };

  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // ─── SEARCH / TABLE FILTER STATE ───
  const [searchText, setSearchText] = useState('');

  // ─── MODAL CONTROLS ───
  const [activeModal, setActiveModal] = useState(null); // 'add-book' | 'add-member' | 'issue-book' | 'return-book' | null
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
    totalQuantity: 1,
  });

  // Add Member Form
  const [memberTab, setMemberTab] = useState('register'); // 'link' | 'register'
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

  // ─── NEW WIZARD MODAL STATES ───
  const [issueStep, setIssueStep] = useState(1);
  const [issueMember, setIssueMember] = useState(null);
  const [issueBookObj, setIssueBookObj] = useState(null);
  const [issueDate, setIssueDate] = useState('');
  const [issueDueDate, setIssueDueDate] = useState('');

  const [returnStep, setReturnStep] = useState(1);
  const [returnTransactionObj, setReturnTransactionObj] = useState(null);
  const [returnDate, setReturnDate] = useState('');

  // ─── WIZARD FORM RESET & INITIALIZATION ───
  useEffect(() => {
    if (activeModal === 'issue-book') {
      setIssueStep(1);
      setIssueMember(null);
      setIssueBookObj(null);
      setIssueDate(getTodayString());
      setIssueDueDate(getTodayString(14));
    } else if (activeModal === 'return-book') {
      setReturnStep(1);
      setReturnTransactionObj(null);
    }
  }, [activeModal]);

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
    setSubmitting(false);
    // Reset Forms
    setBookForm({ title: '', author: '', category: 'General', description: '', coverImageUrl: '', isbn: '', totalQuantity: 1 });
    setMemberForm({ userId: '', memberCode: '', fullName: '', email: '', password: '', role: 'Member' });
    setIssueForm({ bookSearch: '', bookId: '', memberSearch: '', memberId: '' });
    setReturnForm({ selectedTransactionId: '' });
    setBookSuggestions([]);
    setMemberSuggestions([]);

    // Reset wizard states
    setIssueStep(1);
    setIssueMember(null);
    setIssueBookObj(null);
    setIssueDate('');
    setIssueDueDate('');
    setReturnStep(1);
    setReturnTransactionObj(null);
    setReturnDate('');
  };

  // Automatically generate cover image URL when entering isbn in Add Book Form
  useEffect(() => {
    if (bookForm.isbn && bookForm.isbn.trim()) {
      const sanitized = bookForm.isbn.replace(/[- ]/g, "").trim();
      if (sanitized.length === 10 || sanitized.length === 13) {
        setBookForm(prev => {
          if (!prev.coverImageUrl || prev.coverImageUrl.includes('covers.openlibrary.org/b/isbn/')) {
            return {
              ...prev,
              coverImageUrl: `https://covers.openlibrary.org/b/isbn/${sanitized}-L.jpg?default=false`
            };
          }
          return prev;
        });
      }
    }
  }, [bookForm.isbn]);

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
      toast.error('Title and Author fields are strictly mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      await createBook(bookForm, token);
      toast.success('Book asset added successfully to inventory!');
      closeModal();
      loadBooksData(true);
      loadDashboardStatsAndTransactions(true);
    } catch (err) {
      toast.error(err.message || 'Failed to add book asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();

    if (memberTab === 'link') {
      if (!memberForm.memberCode.trim()) {
        toast.error('Member Code is required.');
        return;
      }

      try {
        setSubmitting(true);

        if (!memberForm.userId) {
          toast.error('Please select a User account to link.');
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
        toast.success('Member profile established successfully.');
        closeModal();
        loadMembersAndUsersData(true);
        loadDashboardStatsAndTransactions(true);
      } catch (err) {
        toast.error(err.message || 'Failed to establish member profile.');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Register Tab - hardcoded to 'Member' role for security
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
            role: 'Member', // hardcoded role
          },
          uniqueCode,
          token
        );
        toast.success('Member profile registered and established successfully!');
        closeModal();
        loadMembersAndUsersData(true);
        loadDashboardStatsAndTransactions(true);
      } catch (err) {
        toast.error(err.message || 'Failed to register account.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleIssueBookSubmit = async (e) => {
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
          issueDate: issueDate ? new Date(issueDate + "T12:00:00").toISOString() : undefined,
          dueDate: issueDueDate ? new Date(issueDueDate + "T12:00:00").toISOString() : undefined,
        },
        token
      );
      toast.success('Book asset issued successfully!');
      closeModal();
      loadDashboardStatsAndTransactions(true);
      loadBooksData(true);
      loadMembersAndUsersData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to loan selected asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnBookSubmit = async (e) => {
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
          returnDate: returnDate ? new Date(returnDate + "T12:00:00").toISOString() : undefined,
        },
        token
      );
      toast.success('Circulation register updated. Asset returned successfully!');
      closeModal();
      loadDashboardStatsAndTransactions(true);
      loadBooksData(true);
      loadMembersAndUsersData(true);
    } catch (err) {
      toast.error(err.message || 'Failed to complete book return transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueDateChange = (newDateVal) => {
    setIssueDate(newDateVal);
    if (newDateVal) {
      const d = new Date(newDateVal + "T12:00:00");
      d.setDate(d.getDate() + 14);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setIssueDueDate(`${year}-${month}-${day}`);
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
      <aside className={`db-sidebar ${sidebarOpen ? 'db-sidebar-open' : ''}`}>
        <div className="db-sidebar-top">
          <div className="db-brand-row">
            <div className="db-brand">
              <h1 className="db-brand-title">Library Admin</h1>
              <p className="db-brand-subtitle">Management Portal</p>
            </div>
            <button 
              className="db-sidebar-close-btn" 
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
            >
              <DashboardIcon className="db-nav-icon" />
              <span>Dashboard</span>
            </div>
            <div
              className={`db-nav-item ${activeView === 'analytics' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('analytics');
                setSidebarOpen(false);
              }}
            >
              <svg className="db-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '18px', height: '18px' }}>
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <span>Analytics</span>
            </div>
            <div
              className={`db-nav-item ${activeView === 'books' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('books');
                loadBooksData(true);
                setSidebarOpen(false);
              }}
            >
              <BookIcon className="db-nav-icon" />
              <span>Books</span>
            </div>
            <div
              className={`db-nav-item ${activeView === 'members' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('members');
                loadMembersAndUsersData(true);
                setSidebarOpen(false);
              }}
            >
              <MemberIcon className="db-nav-icon" />
              <span>Members</span>
            </div>
            <div
              className={`db-nav-item ${activeView === 'transactions' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('transactions');
                loadDashboardStatsAndTransactions(true);
                setSidebarOpen(false);
              }}
            >
              <TransactionIcon className="db-nav-icon" />
              <span>Transactions</span>
            </div>
            <div
              className={`db-nav-item ${activeView === 'requests' ? 'db-nav-item-active' : ''}`}
              onClick={() => {
                setActiveView('requests');
                setSidebarOpen(false);
              }}
            >
              <ClockIcon className="db-nav-icon" />
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Borrow Requests</span>
                {pendingCount > 0 && (
                  <span className="db-sidebar-badge">
                    {pendingCount}
                  </span>
                )}
              </span>
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
                  <h4 className="db-status-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: syncError ? '#ba1a1a' : '#16a34a',
                      display: 'inline-block'
                    }} />
                    Operational Status
                  </h4>
                  <p className="db-status-desc">
                    {syncError 
                      ? 'Connection offline or failed to fetch database updates.' 
                      : `System is operational. Database synced at ${lastSync ? lastSync.toLocaleTimeString() : '—'}.`
                    }
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
        )}

        {/* BOOK INVENTORY CRUD PANEL */}
        {activeView === 'books' && (
          <BookInventoryPanel
            books={books}
            loading={loading}
            token={token}
            onRefresh={() => { loadBooksData(true); loadDashboardStatsAndTransactions(true); }}
            onAddBookClick={() => setActiveModal('add-book')}
          />
        )}

        {/* MEMBER INVENTORY CRUD PANEL */}
        {activeView === 'members' && (
          <MemberInventoryPanel
            members={members}
            users={users}
            loading={loading}
            token={token}
            onRefresh={() => { loadMembersAndUsersData(true); loadDashboardStatsAndTransactions(true); }}
            onAddMemberClick={() => setActiveModal('add-member')}
          />
        )}

        {/* TRANSACTIONS LEDGER CRUD PANEL */}
        {activeView === 'transactions' && (
          <TransactionPanel
            transactions={transactions}
            loading={loading}
            token={token}
            onRefresh={() => loadDashboardStatsAndTransactions(true)}
            onIssueBookClick={() => setActiveModal('issue-book')}
            onReturnBookClick={() => setActiveModal('return-book')}
          />
        )}

        {/* SYSTEM ANALYTICS & KPIs PANEL */}
        {activeView === 'analytics' && (
          <AnalyticsPanel
            token={token}
          />
        )}

        {/* CIRCULATION REQUEST QUEUE PANEL */}
        {activeView === 'requests' && (
          <CirculationQueuePanel
            token={token}
            onQueueCountChange={setPendingCount}
          />
        )}

        {/* ACCOUNT PROFILE SETTINGS PANEL */}
        {activeView === 'settings' && (
          <AccountSettingsPanel
            userId={authUser?.userId}
            token={token}
          />
        )}
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
                  <label htmlFor="modal-book-quantity">Total Quantity *</label>
                  <input
                    id="modal-book-quantity"
                    type="number"
                    min="1"
                    className="form-input"
                    value={bookForm.totalQuantity}
                    onChange={(e) => setBookForm((prev) => ({ ...prev, totalQuantity: parseInt(e.target.value, 10) || 1 }))}
                    disabled={submitting}
                    required
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
                <button type="button" className="db-action-btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" disabled={submitting}>
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
            <form onSubmit={handleAddMemberSubmit}>
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
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting}>
                  {submitting ? 'Creating...' : 'Register Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. ISSUE BOOK MODAL */}
      {activeModal === 'issue-book' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Circulation: Loan Asset</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            
            {/* Step indicator */}
            <div className="px-6 pt-4">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                <div className="flex gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${issueStep === 1 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>1</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${issueStep === 2 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>2</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${issueStep === 3 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>3</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {issueStep} of 3</span>
              </div>
            </div>

            <form onSubmit={handleIssueBookSubmit}>
              {issueStep === 1 && (
                <div className="modal-body min-h-[300px]">
                  <div className="form-group mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Search Member Account *</label>
                    <AutocompleteLookup
                      id="issue-member-lookup"
                      fetchCallback={(query, page, pageSize) => searchMembers(query, page, pageSize, token)}
                      placeholder="Type member name, email, or library card ID..."
                      onSelect={(item) => setIssueMember(item)}
                      getLabel={(item) => item ? `${item.user?.fullName} (${item.memberCode})` : ''}
                      formatItem={(item) => (
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-slate-800">{item.user?.fullName}</span>
                          <span className="text-xs text-slate-500">Email: {item.user?.email} | Code: {item.memberCode}</span>
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
                        <p><strong>Name:</strong> {issueMember.user?.fullName}</p>
                        <p><strong>Email:</strong> {issueMember.user?.email}</p>
                        <p><strong>Member Code:</strong> {issueMember.memberCode}</p>
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
                      getLabel={(item) => item ? `${item.title} - ${item.author}` : ''}
                      formatItem={(item) => (
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          <span className="text-xs text-slate-500">Author: {item.author} | Category: {item.category} | ISBN: {item.isbn || 'N/A'}</span>
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
                            e.target.src = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=100&auto=format&fit=crop';
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
                        <p><strong>Author:</strong> {issueBookObj.author}</p>
                        <p><strong>ISBN:</strong> {issueBookObj.isbn || 'N/A'}</p>
                        <p><strong>Category:</strong> {issueBookObj.category}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {issueStep === 3 && (
                <div className="modal-body text-left">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <strong className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider font-bold">Selected Member</strong>
                      <span className="text-slate-800 font-semibold text-sm">{issueMember?.user?.fullName}</span>
                      <span className="text-slate-500 block mt-0.5">{issueMember?.memberCode}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <strong className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider font-bold">Selected Book</strong>
                      <span className="text-slate-800 font-semibold text-sm truncate block">{issueBookObj?.title}</span>
                      <span className="text-slate-500 block mt-0.5">by {issueBookObj?.author}</span>
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label htmlFor="issue-date-input" className="block text-sm font-semibold text-slate-700 mb-2">Custom Issue Date *</label>
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
                    <label htmlFor="due-date-input" className="block text-sm font-semibold text-slate-700 mb-2">Custom Due Date *</label>
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
                    onClick={closeModal}
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
      )}

      {/* 4. RETURN BOOK MODAL */}
      {activeModal === 'return-book' && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Circulation: Return Asset</h3>
              <button className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-4">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                <div className="flex gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${returnStep === 1 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>1</span>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs transition-colors duration-200 ${returnStep === 2 ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-500'}`}>2</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Step {returnStep} of 2</span>
              </div>
            </div>

            <form onSubmit={handleReturnBookSubmit}>
              {returnStep === 1 && (
                <div className="modal-body min-h-[300px]">
                  <div className="form-group mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Search Active Loans *</label>
                    <AutocompleteLookup
                      id="return-loan-lookup"
                      fetchCallback={(query, page, pageSize) => searchActiveTransactions(query, page, pageSize, token)}
                      placeholder="Search by book title, borrower name, email, or code..."
                      onSelect={(item) => setReturnTransactionObj(item)}
                      getLabel={(item) => item ? `"${item.book?.title}" borrowed by ${item.member?.user?.fullName || item.member?.memberCode}` : ''}
                      formatItem={(item) => (
                        <div className="flex flex-col text-left">
                          <span className="font-semibold text-slate-800">"{item.book?.title}"</span>
                          <span className="text-xs text-slate-500">Borrowed by: {item.member?.user?.fullName} ({item.member?.memberCode})</span>
                          <span className="text-xs text-slate-400">Issued: {formatDateString(item.issueDate)} | Due: {formatDateString(item.dueDate)}</span>
                        </div>
                      )}
                      initialLabel={returnTransactionObj ? `"${returnTransactionObj.book?.title}" borrowed by ${returnTransactionObj.member?.user?.fullName}` : ''}
                    />
                  </div>

                  {returnTransactionObj && (
                    <div className="mt-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/60 text-left flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Active Loan Details</h4>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getTransactionStatus(returnTransactionObj) === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                          {getTransactionStatus(returnTransactionObj)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 mt-1">
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
                    <p className="mb-1"><strong>Book:</strong> {returnTransactionObj?.book?.title}</p>
                    <p className="mb-1"><strong>Borrower:</strong> {returnTransactionObj?.member?.user?.fullName} ({returnTransactionObj?.member?.memberCode})</p>
                    <p><strong>Original Due Date:</strong> {formatDateString(returnTransactionObj?.dueDate)}</p>
                  </div>

                  <div className="form-group mb-6">
                    <label htmlFor="return-date-input" className="block text-sm font-semibold text-slate-700 mb-2">Custom Return Date *</label>
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
                    onClick={closeModal}
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
                    onClick={() => setReturnStep((prev) => prev + 2 - returnStep)}
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
        </div>
      )}


    </div>
  );
}




