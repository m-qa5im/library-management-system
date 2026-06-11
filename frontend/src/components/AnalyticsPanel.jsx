import { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import './AnalyticsPanel.css';

export default function AnalyticsPanel({ token }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const stats = await getDashboardStats(token);
        setData(stats);
      } catch (err) {
        toast.error(err.message || 'Failed to retrieve analytics indicators.');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <div className="db-body">
        {/* Skeleton Top Row Grid */}
        <div className="anp-stats-grid">
          <div className="anp-skeleton-card">
            <div className="anp-skeleton-line" style={{ width: '40%', height: '14px' }} />
            <div className="anp-skeleton-line" style={{ width: '70%', height: '28px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '6px' }} />
          </div>
          <div className="anp-skeleton-card">
            <div className="anp-skeleton-line" style={{ width: '50%', height: '14px' }} />
            <div className="anp-skeleton-line" style={{ width: '30%', height: '28px' }} />
            <div className="anp-skeleton-line" style={{ width: '80%', height: '14px' }} />
          </div>
          <div className="anp-skeleton-card">
            <div className="anp-skeleton-line" style={{ width: '45%', height: '14px' }} />
            <div className="anp-skeleton-line" style={{ width: '60%', height: '28px' }} />
            <div className="anp-skeleton-line" style={{ width: '90%', height: '14px' }} />
          </div>
        </div>

        {/* Skeleton Leaderboards */}
        <div className="anp-leaderboards-grid">
          <div className="anp-panel-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="anp-skeleton-line" style={{ width: '40%', height: '20px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
          </div>
          <div className="anp-panel-card" style={{ height: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="anp-skeleton-line" style={{ width: '45%', height: '20px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
            <div className="anp-skeleton-line" style={{ width: '100%', height: '50px', borderRadius: '12px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Calculate parameters for Summary Cards
  const totalAssets = data?.totalBooks ?? 0;
  const availableOnShelves = data?.availableBooks ?? 0;
  const activeCirculation = data?.borrowedBooks ?? 0;
  const exhaustedTitles = data?.exhaustedTitlesCount ?? 0;

  // Percentage Calculations
  const availabilityRate = totalAssets > 0 ? Math.round((availableOnShelves / totalAssets) * 100) : 0;

  // Leaderboard sets
  const topMembers = data?.topMembers ?? [];
  const topBooks = data?.topBooks ?? [];

  return (
    <div className="db-body">
      {/* ─── INVENTORY HEALTH SUMMARY CARDS ─── */}
      <section className="anp-stats-grid" aria-label="Inventory Health Summary">
        {/* Card A: Shelf Availability Balance */}
        <article className="anp-stat-card anp-fade-in anp-delay-100">
          <div>
            <div className="anp-stat-header">
              <h3 className="anp-stat-title">Shelf Availability</h3>
              <div className="anp-stat-icon-container primary">
                <ShelfIcon />
              </div>
            </div>
            <div className="anp-stat-value-row">
              <span className="anp-stat-value">
                {availableOnShelves} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-secondary)' }}>/ {totalAssets}</span>
              </span>
              <span className="anp-stat-badge success">
                {availabilityRate}% On Shelf
              </span>
            </div>
          </div>
          <div>
            <div className="anp-progress-container">
              <div 
                className="anp-progress-bar anp-progress-fill" 
                style={{ width: `${availabilityRate}%` }}
              />
            </div>
            <div className="anp-stat-footer">
              Copies currently on shelves compared to total assets.
            </div>
          </div>
        </article>

        {/* Card B: Stock Exhaustion Counter */}
        <article className="anp-stat-card anp-fade-in anp-delay-200">
          <div>
            <div className="anp-stat-header">
              <h3 className="anp-stat-title">Out of Stock Titles</h3>
              <div className={`anp-stat-icon-container ${exhaustedTitles > 0 ? 'anp-stat-icon-container exhausted-active' : 'amber'}`}>
                <ExhaustedIcon />
              </div>
            </div>
            <div className="anp-stat-value-row">
              <span className="anp-stat-value">{exhaustedTitles}</span>
              {exhaustedTitles > 0 ? (
                <span className="anp-stat-badge amber">
                  Exhausted Stock
                </span>
              ) : (
                <span className="anp-stat-badge success">
                  Fully Available
                </span>
              )}
            </div>
          </div>
          <div className="anp-stat-footer">
            Active catalog titles with exactly 0 copies remaining.
          </div>
        </article>

        {/* Card C: Active Circulation Copies */}
        <article className="anp-stat-card anp-fade-in anp-delay-300">
          <div>
            <div className="anp-stat-header">
              <h3 className="anp-stat-title">Active Circulation</h3>
              <div className="anp-stat-icon-container danger">
                <CirculationIcon />
              </div>
            </div>
            <div className="anp-stat-value-row">
              <span className="anp-stat-value">{activeCirculation}</span>
              <span className="anp-stat-badge muted">
                Checked Out
              </span>
            </div>
          </div>
          <div className="anp-stat-footer">
            Total assets currently checked out or locked for readers.
          </div>
        </article>
      </section>

      {/* ─── ENGAGEMENT LEADERBOARDS SECTION ─── */}
      <div className="anp-leaderboards-grid">
        {/* Column 1: Most Active Readers Board */}
        <section className="anp-panel-card anp-fade-in anp-delay-200" aria-label="Most Active Readers Board">
          <h3 className="anp-panel-title">
            <ReaderIcon style={{ width: '18px', height: '18px' }} />
            <span>Most Active Readers</span>
          </h3>
          <div className="anp-leaderboard-list">
            {topMembers.length === 0 ? (
              <div style={{ color: 'var(--color-outline)', padding: '24px 0', textAlign: 'center', fontSize: '0.9rem' }}>
                No reader checkout logs are available yet.
              </div>
            ) : (
              topMembers.map((member, index) => (
                <div key={member.memberId} className="anp-leaderboard-item">
                  <div className="anp-item-left">
                    <div className={`anp-rank-tag rank-${index + 1}`}>
                      {index + 1}
                    </div>
                    <div className="anp-item-meta">
                      <span className="anp-item-name">{member.fullName}</span>
                      <span className="anp-item-sub">ID: {member.memberCode}</span>
                    </div>
                  </div>
                  <div className="anp-item-right">
                    <span className="anp-count-indicator">
                      {member.checkoutCount} Checkouts
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Column 2: Most Popular Books Board */}
        <section className="anp-panel-card anp-fade-in anp-delay-300" aria-label="Most Popular Books Board">
          <h3 className="anp-panel-title">
            <BookPopularIcon style={{ width: '18px', height: '18px' }} />
            <span>Most Popular Books</span>
          </h3>
          <div className="anp-leaderboard-list">
            {topBooks.length === 0 ? (
              <div style={{ color: 'var(--color-outline)', padding: '24px 0', textAlign: 'center', fontSize: '0.9rem' }}>
                No popular books catalog logs are available yet.
              </div>
            ) : (
              topBooks.map((book, index) => {
                const isOnShelf = book.availableQuantity > 0;
                return (
                  <div key={book.bookId} className="anp-leaderboard-item">
                    <div className="anp-item-left">
                      <div className={`anp-rank-tag rank-${index + 1}`}>
                        {index + 1}
                      </div>
                      <div className="anp-item-meta">
                        <span className="anp-item-name" title={book.title}>
                          {book.title}
                        </span>
                        <span className="anp-item-sub">by {book.author}</span>
                      </div>
                    </div>
                    <div className="anp-item-right">
                      <span className={`anp-status-badge ${isOnShelf ? 'on-shelf' : 'out'}`}>
                        {isOnShelf ? 'On Shelf' : 'Out'}
                      </span>
                      <span className="anp-count-indicator">
                        {book.checkoutCount}x Borrowed
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// ─── INLINE SVG ICON BLOCKS ───

function ShelfIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ExhaustedIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// Custom semantic icon for handouts tracking (e.g. book checkout rotation)
function CirculationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2.1l4 4-4 4" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M7 21.9l-4-4 4-4" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function ReaderIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BookPopularIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
