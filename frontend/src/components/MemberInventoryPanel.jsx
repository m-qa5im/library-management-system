import { useState, useMemo, useEffect } from 'react';
import { updateMember, deleteMember } from '../services/adminService';
import { useToast } from '../context/ToastContext';

export default function MemberInventoryPanel({ members, users = [], loading, token, onRefresh, onAddMemberClick }) {
  const toast = useToast();

  // ─── MEMBER CRUD STATE ───
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);
  const memberItemsPerPage = 10;

  const [selectedMemberPreview, setSelectedMemberPreview] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'Active',
  });

  const [submitting, setSubmitting] = useState(false);

  // Helper to resolve linked User details (with fallback to users array)
  const getMemberUser = (member) => {
    if (!member) return null;
    if (member.user && member.user.fullName) return member.user;
    return users.find((u) => u.id === member.userId) || null;
  };

  // Filter members list on local search query
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = memberSearchQuery.toLowerCase().trim();
      if (!q) return true;
      const user = getMemberUser(m);
      const fullName = (user?.fullName || '').toLowerCase();
      const email = (user?.email || '').toLowerCase();
      const code = (m.memberCode || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || code.includes(q);
    });
  }, [members, users, memberSearchQuery]);

  const memberTotalPages = Math.ceil(filteredMembers.length / memberItemsPerPage);

  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice(
      (memberCurrentPage - 1) * memberItemsPerPage,
      memberCurrentPage * memberItemsPerPage
    );
  }, [filteredMembers, memberCurrentPage]);

  // Generate dynamic pagination page numbers with ellipsis
  const getMemberPageNumbers = () => {
    const pages = [];
    const boundaryPages = 1;
    const siblingPages = 1;

    if (memberTotalPages <= 6) {
      for (let i = 1; i <= memberTotalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const leftSiblingIndex = Math.max(memberCurrentPage - siblingPages, 1);
    const rightSiblingIndex = Math.min(memberCurrentPage + siblingPages, memberTotalPages);

    const shouldShowLeftDots = leftSiblingIndex > boundaryPages + 2;
    const shouldShowRightDots = rightSiblingIndex < memberTotalPages - (boundaryPages + 1);

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const itemCount = 3 + 2 * siblingPages;
      for (let i = 1; i <= itemCount; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(memberTotalPages);
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      pages.push(1);
      pages.push('...');
      const itemCount = 3 + 2 * siblingPages;
      const startRange = memberTotalPages - itemCount + 1;
      for (let i = startRange; i <= memberTotalPages; i++) {
        pages.push(i);
      }
    } else if (shouldShowLeftDots && shouldShowRightDots) {
      pages.push(1);
      pages.push('...');
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(memberTotalPages);
    }

    return pages;
  };

  const handleStartEdit = (member) => {
    const userObj = getMemberUser(member);
    setEditingMember(member);
    setEditForm({
      status: member.status || 'Active',
      fullName: userObj?.fullName || '',
      email: userObj?.email || '',
      password: '',
    });
  };

  const handleEditMemberSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim() || !editForm.email.trim()) {
      toast.error('Name and Email fields are strictly mandatory.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(editForm.email.trim())) {
      toast.error('Invalid email address format.');
      return;
    }

    if (editForm.password && editForm.password.trim()) {
      const pwd = editForm.password.trim();
      if (pwd.length < 8) {
        toast.error('Password must contain at least 8 characters.');
        return;
      }
      if (!/[A-Z]/.test(pwd)) {
        toast.error('Password must contain at least one uppercase letter.');
        return;
      }
      if (!/[a-z]/.test(pwd)) {
        toast.error('Password must contain at least one lowercase letter.');
        return;
      }
      if (!/[0-9]/.test(pwd)) {
        toast.error('Password must contain at least one numeric digit.');
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        status: editForm.status,
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
      };

      if (editForm.password && editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      await updateMember(editingMember.id, payload, token);
      toast.success('Member profile updated successfully!');
      closeModal();
      setEditingMember(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to update member profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (id) => {
    try {
      setSubmitting(true);
      await deleteMember(id, token);
      toast.success('Member profile purged successfully!');
      setDeletingMember(null);
      closeModal();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to delete member.');
    } finally {
      setSubmitting(false);
    }
  };
  const handleReactivateMember = async (member) => {
    try {
      setSubmitting(true);
      await updateMember(member.id, { status: 'Active' }, token);
      toast.success('Member profile reactivated successfully!');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to reactivate member profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSubmitting(false);
  };

  return (
    <div className="db-body">
      {/* Search and Add Member action row */}
      <div className="db-action-row-container">
        <div className="db-search-wrapper" style={{ margin: 0, width: '400px', maxWidth: '100%' }}>
          <SearchIcon className="db-search-icon" />
          <input
            type="text"
            placeholder="Search by name, email, or code..."
            className="db-search-input"
            value={memberSearchQuery}
            onChange={(e) => {
              setMemberSearchQuery(e.target.value);
              setMemberCurrentPage(1);
            }}
            aria-label="Search members"
          />
        </div>
        <button
          className="db-add-book-btn"
          onClick={onAddMemberClick}
          aria-label="Add Member"
        >
          <UserPlusIcon style={{ width: '16px', height: '16px' }} />
          <span>Add Member</span>
        </button>
      </div>

      {/* CRUD Table card */}
      <section className="db-panel-card" style={{ marginTop: '20px' }} aria-label="Member Directory Panel">
        <div className="db-table-wrapper" style={{ margin: 0 }}>
          {loading ? (
            <div className="db-table-empty">Loading member profiles...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="db-table-empty">No members found in system database.</div>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Member Code</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.map((member) => {
                  const isActive = member.status === 'Active';
                  const memberCodeDisplay = member.memberCode || 'N/A';
                  const memberIdLabel = `#MB-${member.id.toString().padStart(4, '0')}`;
                  const userObj = getMemberUser(member);
                  
                  return (
                    <tr key={member.id}>
                      <td style={{ fontWeight: 600, color: '#505f76' }}>{memberIdLabel}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#131b2e' }}>
                          {userObj?.fullName || 'Anonymous User'}
                        </span>
                      </td>
                      <td>{userObj?.email || 'N/A'}</td>
                      <td style={{ fontWeight: 500, color: '#00288e' }}>{memberCodeDisplay}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`db-status-dot-badge ${isActive ? 'available' : 'borrowed'}`}>
                            <span className="dot" />
                            <span>{member.status}</span>
                          </span>
                          {!isActive && (
                            <button
                              type="button"
                              className="db-reactivate-btn"
                              onClick={() => handleReactivateMember(member)}
                              disabled={submitting}
                              title="Reactivate Profile"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="db-table-actions">
                          <button
                            className="db-action-icon-btn view"
                            onClick={() => setSelectedMemberPreview(member)}
                            title="View Details"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            className="db-action-icon-btn edit"
                            onClick={() => handleStartEdit(member)}
                            title="Edit Status"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="db-action-icon-btn delete"
                            onClick={() => setDeletingMember(member)}
                            title="Delete Member"
                          >
                            <TrashIcon />
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

        {/* Dynamic Ellipsis Pagination */}
        {!loading && memberTotalPages > 1 && (
          <div className="db-pagination-container">
            <span className="db-pagination-summary">
              Showing <strong>{paginatedMembers.length}</strong> of <strong>{filteredMembers.length}</strong> members
            </span>
            <nav className="mdb-pagination" aria-label="Member inventory pagination" style={{ marginTop: 0 }}>
              <button
                className="mdb-page-btn"
                onClick={() => setMemberCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={memberCurrentPage === 1}
                aria-label="Previous page"
              >
                &lt;
              </button>
              {getMemberPageNumbers().map((page, index) => {
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
                    className={`mdb-page-btn ${memberCurrentPage === page ? 'mdb-page-btn-active' : ''}`}
                    onClick={() => setMemberCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className="mdb-page-btn"
                onClick={() => setMemberCurrentPage((prev) => Math.min(prev + 1, memberTotalPages))}
                disabled={memberCurrentPage === memberTotalPages}
                aria-label="Next page"
              >
                &gt;
              </button>
            </nav>
          </div>
        )}
      </section>

      {/* ─── MODALS ─── */}

      {/* 1. READ-ONLY PREVIEW MODAL */}
      {selectedMemberPreview && (
        <div className="modal-backdrop" onClick={() => setSelectedMemberPreview(null)}>
          <div className="modal-content" style={{ width: '500px', maxWidth: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Member Profile Summary</h3>
              <button className="modal-close-btn" onClick={() => setSelectedMemberPreview(null)} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#e2e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00288e', fontWeight: 700, fontSize: '1.5rem' }}>
                    {(getMemberUser(selectedMemberPreview)?.fullName || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#131b2e' }}>
                      {getMemberUser(selectedMemberPreview)?.fullName}
                    </h4>
                    <p style={{ margin: '2px 0 0 0', color: '#757684', fontSize: '0.875rem' }}>
                      {getMemberUser(selectedMemberPreview)?.email}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f7f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e7ff' }}>
                  <div>
                    <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>Member Code</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#00288e', marginTop: '4px', display: 'block' }}>
                      {selectedMemberPreview.memberCode || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>Status</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: selectedMemberPreview.status === 'Active' ? '#16a34a' : '#c2410c', marginTop: '4px', display: 'block' }}>
                      {selectedMemberPreview.status}
                    </span>
                  </div>
                  <div style={{ gridColumn: 'span 2', marginTop: '4px', borderTop: '1px solid #eaedff', paddingTop: '12px' }}>
                    <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>Account Established</span>
                    <span style={{ fontSize: '0.9rem', color: '#131b2e', marginTop: '4px', display: 'block' }}>
                      {new Date(selectedMemberPreview.createdAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="db-action-btn-primary" onClick={() => setSelectedMemberPreview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT MEMBER PROFILE MODAL */}
      {editingMember && (
        <div className="modal-backdrop" onClick={() => { setEditingMember(null); closeModal(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Member Profile</h3>
              <button className="modal-close-btn" onClick={() => { setEditingMember(null); closeModal(); }} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditMemberSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#505f76' }}>
                    Modifying profile details for member code <strong>{editingMember.memberCode}</strong>.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-edit-member-name">Full Name *</label>
                  <input
                    id="modal-edit-member-name"
                    type="text"
                    className="form-input"
                    placeholder="John Doe"
                    value={editForm.fullName || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-edit-member-email">Email Address *</label>
                  <input
                    id="modal-edit-member-email"
                    type="email"
                    className="form-input"
                    placeholder="john.doe@example.com"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-edit-member-status">Account Status</label>
                  <select
                    id="modal-edit-member-status"
                    className="form-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    disabled={submitting}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="modal-edit-member-password">Update Password (Optional - Min 8 chars, 1 Upper, 1 Lower, 1 Num)</label>
                  <input
                    id="modal-edit-member-password"
                    type="password"
                    className="form-input"
                    placeholder="Enter new password to change..."
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" onClick={() => { setEditingMember(null); closeModal(); }} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DELETE MEMBER CONFIRMATION MODAL */}
      {deletingMember && (
        <div className="modal-backdrop" onClick={() => { setDeletingMember(null); closeModal(); }}>
          <div className="modal-content" style={{ width: '400px', maxWidth: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ba1a1a' }}>Confirm Profile Deletion</h3>
              <button className="modal-close-btn" onClick={() => { setDeletingMember(null); closeModal(); }} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#505f76', lineHeight: 1.6 }}>
                Are you absolutely sure you want to permanently delete the member account for <strong>&quot;{getMemberUser(deletingMember)?.fullName}&quot;</strong> ({deletingMember.memberCode})?
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#ba1a1a', fontWeight: 600 }}>
                Warning: This action will sever database relations and cannot be reversed.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="db-action-btn-secondary" onClick={() => { setDeletingMember(null); closeModal(); }} disabled={submitting}>
                Cancel
              </button>
              <button type="button" className="db-action-btn-primary" style={{ backgroundColor: '#ba1a1a', borderColor: '#ba1a1a' }} onClick={() => handleDeleteMember(deletingMember.id)} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Profile'}
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

function UserPlusIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
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

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
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
