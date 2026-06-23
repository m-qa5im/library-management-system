import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const metrics = [
  {
    value: 'Catalog',
    label: 'Organized book records',
  },
  {
    value: 'Members',
    label: 'Centralized user profiles',
  },
  {
    value: 'Borrowing',
    label: 'Issue and return tracking',
  },
  {
    value: 'Due Dates',
    label: 'Overdue visibility',
  },
];

const features = [
  {
    title: 'Book Management',
    tag: 'Inventory + metadata',
    description:
      'Maintain comprehensive book records with ISBN, author, category, availability, quantity, and structured catalog details.',
    Icon: BookIcon,
  },
  {
    title: 'Member Management',
    tag: 'Profiles + history',
    description:
      'Manage member accounts, borrowing limits, contact details, status, permissions, and complete circulation histories.',
    Icon: UsersIcon,
  },
  {
    title: 'Book Search',
    tag: 'Title + author + ISBN',
    description:
      'Allow users to find books instantly through searchable catalog fields, query debouncing, and availability discovery.',
    Icon: SearchIcon,
  },
  {
    title: 'Borrowing and Returns',
    tag: 'Due dates + status',
    description:
      'Track issued books, active loans, returned inventory, overdue indicators, transaction status, and circulation queues.',
    Icon: SwapIcon,
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Organize the catalog',
    description:
      'Librarians add books, maintain structural metadata, classify inventory levels, and keep book availability metrics accurate.',
  },
  {
    number: '02',
    title: 'Manage members',
    description:
      'Register system members, maintain user profiles, apply borrowing rules, and monitor real-time borrowing activity.',
  },
  {
    number: '03',
    title: 'Control circulation',
    description:
      'Issue books, process returns, track transaction logs, approve borrow requests, and flag overdue circulation records.',
  },
];

const adminItems = [
  'Manage books and inventory details',
  'Manage member accounts and permissions',
  'Issue books and process check-outs',
  'Accept returned books and update status',
];

const memberItems = [
  'Search books with advanced filters',
  'View book details and live availability',
  'Request borrowing options with one click',
  'Track active loans and due dates',
];

const trustItems = [
  'Role-based access control for administrators and members',
  'Structured transactional logs for books, users, and transactions',
  'Clear dashboard visibility into active, returned, and overdue records',
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const targets = document.querySelectorAll(
      '.lms-metric-card, .lms-feature-item, .lms-workflow-step, .lms-portal-card'
    );
    targets.forEach((el) => observer.observe(el));

    const visualObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active-visual');
            visualObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const visuals = document.querySelectorAll(
      '.lms-hero-visual, .lms-portal-visual'
    );
    visuals.forEach((el) => visualObserver.observe(el));

    return () => {
      targets.forEach((el) => observer.unobserve(el));
      visuals.forEach((el) => visualObserver.unobserve(el));
    };
  }, []);

  return (
    <div className="lms-landing">
      <header className="lms-header">
        <div className="lms-container lms-nav">
          <Link to="/" className="lms-brand" onClick={closeMenu}>
            Library Management System
          </Link>

          <nav className="lms-desktop-nav" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#roles">Roles</a>
            <Link to="/login">Login</Link>
            <Link to="/signup" className="lms-nav-cta">
              Get Started
            </Link>
          </nav>

          <button
            className="lms-menu-button"
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>

        <nav 
          className={`lms-mobile-nav ${menuOpen ? 'open' : ''}`} 
          aria-label="Mobile navigation"
        >
          <a href="#features" onClick={closeMenu}>
            Features
          </a>
          <a href="#workflow" onClick={closeMenu}>
            Workflow
          </a>
          <a href="#roles" onClick={closeMenu}>
            Roles
          </a>
          <Link to="/login" onClick={closeMenu}>
            Login
          </Link>
          <Link to="/signup" className="lms-mobile-cta" onClick={closeMenu}>
            Get Started
          </Link>
        </nav>
      </header>

      <main>
        <section className="lms-hero">
          <div className="lms-container lms-hero-grid">
            <div className="lms-hero-content">
              <span className="lms-eyebrow animate-hero-eyebrow">Academic Operations Platform</span>

              <h1 className="animate-hero-title">Precision Circulation and Asset Management for Academic Libraries</h1>

              <p className="lms-hero-text animate-hero-text">
                A dedicated catalog, member, and circulation system built to streamline 
                institutional database audits, track borrow cycles, and eliminate overdue latency.
              </p>

              <div className="lms-hero-actions animate-hero-actions">
                <Link to="/signup" className="lms-primary-button">
                  Get Started
                </Link>

                <Link to="/login" className="lms-secondary-button">
                  Login to Portal
                </Link>
              </div>
            </div>

            <div className="lms-hero-visual animate-hero-visual" aria-hidden="true">
              <DashboardSvg />
            </div>
          </div>
        </section>

        <section className="lms-metrics-section" aria-label="System components index">
          <div className="lms-container lms-metrics-grid">
            {metrics.map((item, index) => (
              <div 
                className="lms-metric-card" 
                key={item.value}
                style={{ '--i': index }}
              >
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lms-section" id="features">
          <div className="lms-container">
            <SectionHeading
              title="Core Capabilities"
              description="Structured mechanisms engineered for precise cataloging, user registration, and circulation control."
            />

            <div className="lms-features-list">
              {features.map(({ title, tag, description, Icon }, index) => (
                <article 
                  className="lms-feature-item" 
                  key={title}
                  style={{ '--i': index }}
                >
                  <div className="lms-feature-header">
                    <div className="lms-feature-icon-title">
                      <div className="lms-icon-box">
                        <Icon />
                      </div>
                      <h3>{title}</h3>
                    </div>
                    <span className="lms-feature-tag">{tag}</span>
                  </div>
                  <p className="lms-feature-desc">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lms-section lms-workflow-section" id="workflow">
          <div className="lms-container">
            <SectionHeading
              title="Circulation Timeline"
              description="A clean chronological cycle from database indexing to active loan enforcement."
            />

            <div className="lms-workflow-timeline">
              {workflowSteps.map((step, index) => (
                <div 
                  className="lms-workflow-step" 
                  key={step.number}
                  style={{ '--i': index }}
                >
                  <div className="lms-workflow-marker" aria-hidden="true" />
                  <div className="lms-workflow-content">
                    <div className="lms-workflow-title-row">
                      <span className="lms-workflow-step-num">{step.number}</span>
                      <h3>{step.title}</h3>
                    </div>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="lms-section lms-roles-section" id="roles">
          <div className="lms-container">
            <SectionHeading
              title="Portal Ecosystem"
              description="Targeted dashboards engineered specifically for administrative control and member self-service."
            />

            <div className="lms-portal-grid">
              <PortalCard
                label="For Librarians"
                title="Admin Portal"
                description="A controlled workspace for catalog management, member administration, and borrowing operations."
                items={adminItems}
                Icon={AdminIcon}
                Visual={AdminVisualSvg}
              />

              <PortalCard
                label="For Members"
                title="Member Portal"
                description="A clean self-service interface for book discovery, availability checking, and personal loan tracking."
                items={memberItems}
                Icon={MemberIcon}
                Visual={MemberVisualSvg}
              />
            </div>
          </div>
        </section>

        <section className="lms-trust-section" aria-label="Operational standards">
          <div className="lms-container lms-trust-grid">
            <div>
              <h2>Clear records, controlled access, and predictable workflows.</h2>
            </div>

            <ul>
              {trustItems.map((item) => (
                <li key={item}>
                  <CheckIcon />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="lms-cta-section">
          <div className="lms-container lms-cta-card">
            <span className="lms-cta-kicker">Ready to streamline operations?</span>
            <h2>Start Using the Library Management System</h2>
            <p>
              Create your account or log in to manage catalog records, member activity, 
              borrowing transactions, returns, and due dates from one structured system.
            </p>

            <div className="lms-cta-actions">
              <Link to="/signup" className="lms-light-button">
                Login or Sign Up
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="lms-footer">
        <div className="lms-container lms-footer-grid">
          <div>
            <Link to="/" className="lms-footer-brand">
              Library Management System
            </Link>
            <p>
              A modern, high-performance system for cataloging, member control, 
              borrowing workflows, and due-date tracking.
            </p>
            <small>© 2026 Library Management System. All rights reserved.</small>
          </div>

          <nav aria-label="Footer navigation">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Contact Support</a>
            <a href="#">Documentation</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({ title, description }) {
  return (
    <div className="lms-section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function PortalCard({ label, title, description, items, Icon, Visual }) {
  return (
    <article className="lms-portal-card">
      <div className="lms-portal-content">
        <span className="lms-portal-card-tag">{label}</span>

        <div className="lms-portal-title-row">
          <div className="lms-icon-box">
            <Icon />
          </div>
          <h3>{title}</h3>
        </div>

        <p className="lms-portal-description">{description}</p>

        <ul>
          {items.map((item) => (
            <li key={item}>
              <CheckIcon />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lms-portal-visual" aria-hidden="true">
        <Visual />
      </div>
    </article>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15Z" />
      <path d="M5 5.5A2.5 2.5 0 0 0 2.5 3H2v15h.5A2.5 2.5 0 0 1 5 20.5v-15Z" />
      <path d="M8 7h7M8 10h6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19" />
      <path d="M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M20 19v-1a3 3 0 0 0-2.2-2.9" />
      <path d="M16.5 4.8a2.8 2.8 0 0 1 0 5.4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="m20 20-4.2-4.2" />
      <path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
      <path d="M18 7l-3 3" />
      <path d="M6 17l3-3" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6l-7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function MemberIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function DashboardSvg() {
  return (
    <svg viewBox="0 0 760 560" role="img" aria-label="Library dashboard illustration">
      <defs>
        <linearGradient id="heroPanel" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eaedff" />
        </linearGradient>
        <linearGradient id="heroScreen" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      <rect width="760" height="560" rx="16" fill="url(#heroPanel)" />
      <circle cx="122" cy="104" r="70" fill="#dde1ff" opacity="0.4" className="svg-fade-in" style={{ '--i': 0 }} />
      <circle cx="642" cy="424" r="92" fill="#dde1ff" opacity="0.25" className="svg-fade-in" style={{ '--i': 1 }} />

      <rect x="110" y="86" width="540" height="356" rx="16" fill="#ffffff" stroke="#c4c5d5" className="svg-fade-in" style={{ '--i': 2 }} />
      <rect x="150" y="126" width="460" height="258" rx="12" fill="url(#heroScreen)" stroke="#cbd5e1" strokeWidth="1" className="svg-fade-in" style={{ '--i': 3 }} />

      <rect x="178" y="154" width="128" height="14" rx="7" fill="#00288e" className="svg-fade-in" style={{ '--i': 4 }} />
      <rect x="178" y="180" width="92" height="8" rx="4" fill="#64748b" opacity="0.7" className="svg-fade-in" style={{ '--i': 5 }} />
      <rect x="448" y="152" width="118" height="30" rx="15" fill="#00288e" className="svg-fade-in" style={{ '--i': 5 }} />

      <rect x="178" y="218" width="180" height="112" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="svg-fade-in" style={{ '--i': 6 }} />
      <path
        d="M196 296c20-42 42-24 64-48 24-26 44 4 78-10"
        stroke="#00288e"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        className="svg-draw-path"
      />
      <path d="M196 305h134M196 274h134M196 244h134" stroke="#e2e8f0" strokeWidth="1" className="svg-fade-in" style={{ '--i': 7 }} />

      <rect x="382" y="218" width="184" height="112" rx="12" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" className="svg-fade-in" style={{ '--i': 7 }} />
      <rect x="404" y="238" width="132" height="18" rx="9" fill="#00288e" opacity="0.15" className="svg-fade-in" style={{ '--i': 8 }} />
      <rect x="404" y="272" width="42" height="10" rx="5" fill="#00288e" opacity="0.3" className="svg-fade-in" style={{ '--i': 9 }} />
      <rect x="458" y="272" width="72" height="10" rx="5" fill="#64748b" opacity="0.4" className="svg-fade-in" style={{ '--i': 9 }} />
      <rect x="404" y="296" width="42" height="10" rx="5" fill="#00288e" opacity="0.3" className="svg-fade-in" style={{ '--i': 10 }} />
      <rect x="458" y="296" width="86" height="10" rx="5" fill="#64748b" opacity="0.4" className="svg-fade-in" style={{ '--i': 10 }} />

      <rect x="168" y="352" width="398" height="16" rx="8" fill="#c4c5d5" className="svg-fade-in" style={{ '--i': 11 }} />
      <path d="M314 384h132l26 56H288l26-56Z" fill="#dde1ff" className="svg-fade-in" style={{ '--i': 12 }} />
      <rect x="252" y="438" width="256" height="24" rx="12" fill="#c4c5d5" className="svg-fade-in" style={{ '--i': 13 }} />

      <rect x="76" y="278" width="138" height="154" rx="16" fill="#ffffff" stroke="#c4c5d5" className="svg-fade-in" style={{ '--i': 8 }} />
      <rect x="104" y="308" width="70" height="10" rx="5" fill="#00288e" className="svg-fade-in" style={{ '--i': 9 }} />
      <rect x="104" y="334" width="46" height="8" rx="4" fill="#505f76" opacity="0.5" className="svg-fade-in" style={{ '--i': 10 }} />
      <rect x="104" y="356" width="76" height="8" rx="4" fill="#505f76" opacity="0.35" className="svg-fade-in" style={{ '--i': 11 }} />
      <rect x="104" y="386" width="82" height="22" rx="11" fill="#dde1ff" className="svg-fade-in" style={{ '--i': 12 }} />
      <path d="M120 397h50" stroke="#00288e" strokeWidth="5" strokeLinecap="round" className="svg-draw-path" />

      <rect x="548" y="252" width="136" height="170" rx="16" fill="#ffffff" stroke="#c4c5d5" className="svg-fade-in" style={{ '--i': 9 }} />
      <rect x="580" y="286" width="72" height="86" rx="10" fill="#dde1ff" className="svg-fade-in" style={{ '--i': 10 }} />
      <path d="M598 309h36M598 332h36M598 355h28" stroke="#00288e" strokeWidth="6" strokeLinecap="round" className="svg-draw-path" />
      <rect x="580" y="388" width="74" height="18" rx="9" fill="#eaedff" className="svg-fade-in" style={{ '--i': 11 }} />
    </svg>
  );
}

function AdminVisualSvg() {
  return (
    <svg viewBox="0 0 720 230" role="img" aria-label="Admin analytics illustration">
      <rect width="720" height="230" fill="#faf8ff" />
      <rect x="42" y="34" width="636" height="162" rx="16" fill="#ffffff" stroke="#c4c5d5" className="svg-fade-in" style={{ '--i': 0 }} />
      <path d="M84 154h560M84 118h560M84 82h560" stroke="#eaedff" strokeWidth="2" className="svg-fade-in" style={{ '--i': 1 }} />

      {[0, 1, 2, 3, 4, 5, 6, 7].map((bar) => (
        <rect
          key={bar}
          x={112 + bar * 65}
          y={118 - (bar % 3) * 16}
          width="28"
          height={54 + (bar % 3) * 16}
          rx="6"
          fill="#dde1ff"
          className="svg-fade-in"
          style={{ '--i': 2 + bar }}
        />
      ))}

      <path
        d="M94 134c58-42 92-20 137-50 48-32 76 18 126-10 63-35 104 21 166-6 40-17 74-10 116 18"
        fill="none"
        stroke="#00288e"
        strokeWidth="6"
        strokeLinecap="round"
        className="svg-draw-path"
      />

      <rect x="518" y="52" width="114" height="30" rx="15" fill="#dde1ff" className="svg-fade-in" style={{ '--i': 3 }} />
      <path d="M538 67h72" stroke="#00288e" strokeWidth="5" strokeLinecap="round" className="svg-draw-path" />
    </svg>
  );
}

function MemberVisualSvg() {
  return (
    <svg viewBox="0 0 720 230" role="img" aria-label="Member catalog illustration">
      <rect width="720" height="230" fill="#f2f3ff" />
      <rect x="70" y="30" width="580" height="170" rx="16" fill="#ffffff" stroke="#c4c5d5" className="svg-fade-in" style={{ '--i': 0 }} />

      {[0, 1, 2, 3].map((card) => (
        <g key={card} className="svg-fade-in" style={{ '--i': 1 + card }}>
          <rect x={104 + card * 130} y="62" width="92" height="108" rx="12" fill="#dde1ff" />
          <rect x={120 + card * 130} y="84" width="60" height="10" rx="5" fill="#00288e" />
          <rect x={120 + card * 130} y="105" width="44" height="8" rx="4" fill="#505f76" opacity="0.55" />
          <rect x={120 + card * 130} y="128" width="58" height="8" rx="4" fill="#505f76" opacity="0.35" />
        </g>
      ))}

      <rect x="536" y="62" width="76" height="26" rx="13" fill="#00288e" className="svg-fade-in" style={{ '--i': 5 }} />
      <path d="M552 75h44" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" className="svg-draw-path" />

      <rect x="104" y="184" width="244" height="8" rx="4" fill="#c4c5d5" className="svg-fade-in" style={{ '--i': 6 }} />
      <rect x="104" y="184" width="132" height="8" rx="4" fill="#00288e" className="svg-fade-in" style={{ '--i': 6 }} />
    </svg>
  );
}