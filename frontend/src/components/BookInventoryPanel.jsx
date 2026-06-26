import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updateBook, deleteBook } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { SearchIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon, CloseIcon, ExportIcon } from './Icons';

export default function BookInventoryPanel({ books, loading, token, onRefresh, onAddBookClick }) {
  const toast = useToast();

  // ─── BOOK INVENTORY CRUD STATE ───
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookCurrentPage, setBookCurrentPage] = useState(1);
  const bookItemsPerPage = 10;

  const [selectedBookPreview, setSelectedBookPreview] = useState(null);
  const [editingBook, setEditingBook] = useState(null);
  const [deletingBook, setDeletingBook] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    author: '',
    category: 'General',
    description: '',
    isbn: '',
    coverImageUrl: '',
    availabilityStatus: 'Available',
  });

  const [submitting, setSubmitting] = useState(false);

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

  // Automatically generate cover image URL when editing isbn
  useEffect(() => {
    if (editForm.isbn && editForm.isbn.trim()) {
      const sanitized = editForm.isbn.replace(/[- ]/g, "").trim();
      if (sanitized.length === 10 || sanitized.length === 13) {
        setEditForm(prev => {
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
  }, [editForm.isbn]);

  // Lock parent body scrolling when modals are open
  useEffect(() => {
    const hasModal = !!(editingBook || selectedBookPreview || deletingBook);
    if (hasModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingBook, selectedBookPreview, deletingBook]);

  // Filter books list on local search query
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const q = bookSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
      );
    });
  }, [books, bookSearchQuery]);

  const bookTotalPages = Math.ceil(filteredBooks.length / bookItemsPerPage);

  const paginatedBooks = useMemo(() => {
    return filteredBooks.slice(
      (bookCurrentPage - 1) * bookItemsPerPage,
      bookCurrentPage * bookItemsPerPage
    );
  }, [filteredBooks, bookCurrentPage]);

  // Generate dynamic pagination page numbers with ellipsis
  const getBookPageNumbers = () => {
    const pages = [];
    const boundaryPages = 1;
    const siblingPages = 1;

    if (bookTotalPages <= 6) {
      for (let i = 1; i <= bookTotalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    const leftSiblingIndex = Math.max(bookCurrentPage - siblingPages, 1);
    const rightSiblingIndex = Math.min(bookCurrentPage + siblingPages, bookTotalPages);

    const shouldShowLeftDots = leftSiblingIndex > boundaryPages + 2;
    const shouldShowRightDots = rightSiblingIndex < bookTotalPages - (boundaryPages + 1);

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const itemCount = 3 + 2 * siblingPages;
      for (let i = 1; i <= itemCount; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(bookTotalPages);
    } else if (shouldShowLeftDots && !shouldShowRightDots) {
      pages.push(1);
      pages.push('...');
      const itemCount = 3 + 2 * siblingPages;
      const startRange = bookTotalPages - itemCount + 1;
      for (let i = startRange; i <= bookTotalPages; i++) {
        pages.push(i);
      }
    } else if (shouldShowLeftDots && shouldShowRightDots) {
      pages.push(1);
      pages.push('...');
      for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(bookTotalPages);
    }

    return pages;
  };

  const handleStartEdit = (book) => {
    setEditingBook(book);
    setEditForm({
      title: book.title || '',
      author: book.author || '',
      category: book.category || 'General',
      description: book.description || '',
      isbn: book.isbn || '',
      coverImageUrl: book.coverImageUrl || '',
      availabilityStatus: book.availabilityStatus || 'Available',
      totalQuantity: book.totalQuantity ?? 1,
      availableQuantity: book.availableQuantity ?? 1,
    });
  };

  const handleEditBookSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.author.trim()) {
      toast.error('Title and Author fields are strictly mandatory.');
      return;
    }
    try {
      setSubmitting(true);
      await updateBook(editingBook.id, editForm, token);
      toast.success('Book asset modified successfully!');
      closeModal();
      setEditingBook(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to modify book asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async (id) => {
    try {
      setSubmitting(true);
      await deleteBook(id, token);
      toast.success('Book asset deleted successfully from inventory!');
      setDeletingBook(null);
      closeModal();
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.message || 'Failed to delete book asset.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── CSV EXPORT ───
  const handleExportCSV = () => {
    if (filteredBooks.length === 0) return;

    const headers = ['Book ID', 'Title', 'Author', 'Category', 'Total Quantity', 'Available Quantity', 'Status'];
    const rows = filteredBooks.map((book) => {
      const avail = book.availableQuantity ?? (book.availabilityStatus === 'Available' ? 1 : 0);
      const isAvailable = avail > 0;
      return [
        `BK-${book.id.toString().padStart(4, '0')}`,
        book.title || '',
        book.author || '',
        book.category || '',
        (book.totalQuantity ?? 1).toString(),
        avail.toString(),
        isAvailable ? 'Available' : 'Out of Stock',
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.join(','),
        ...rows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `library_books_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const closeModal = () => {
    setSubmitting(false);
  };

  return (
    <div className="db-body">
      {/* Search and Add Book action row */}
      <div className="db-action-row-container" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div className="db-search-wrapper" style={{ margin: 0, width: '400px', maxWidth: '100%' }}>
          <SearchIcon className="db-search-icon" />
          <input
            type="text"
            placeholder="Search by title or author..."
            className="db-search-input"
            value={bookSearchQuery}
            onChange={(e) => {
              setBookSearchQuery(e.target.value);
              setBookCurrentPage(1);
            }}
            aria-label="Search by title or author"
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Export CSV */}
          <button
            className="db-add-book-btn"
            style={{ backgroundColor: '#ffffff', color: '#00288e', border: '1px solid #00288e' }}
            onClick={handleExportCSV}
            disabled={filteredBooks.length === 0}
            title="Export to CSV"
            aria-label="Export books as CSV"
          >
            <ExportIcon style={{ width: '16px', height: '16px', stroke: '#00288e' }} />
            <span>Export CSV</span>
          </button>

          <button
            className="db-add-book-btn"
            onClick={onAddBookClick}
            aria-label="Add Book"
          >
            <PlusIcon style={{ width: '16px', height: '16px' }} />
            <span>Add Book</span>
          </button>
        </div>
      </div>

      {/* CRUD Table card */}
      <section className="db-panel-card" style={{ marginTop: '20px' }} aria-label="Book Inventory Panel">
        <div className="db-table-wrapper" style={{ margin: 0 }}>
          {loading ? (
            <div className="db-table-empty">Loading book records...</div>
          ) : filteredBooks.length === 0 ? (
            <div className="db-table-empty">No books found in matching inventory.</div>
          ) : (
            <table className="db-table">
              <thead>
                <tr>
                  <th>Book ID</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Total Qty</th>
                  <th style={{ textAlign: 'center' }}>Available Qty</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedBooks.map((book) => {
                  const total = book.totalQuantity ?? 1;
                  const avail = book.availableQuantity ?? (book.availabilityStatus === 'Available' ? 1 : 0);
                  const isAvailable = avail > 0;
                  const bookCode = `#BK-${book.id.toString().padStart(4, '0')}`;
                  
                  let bookSubtitle = 'Classic Literature';
                  if (book.description && book.description.trim().length > 0) {
                    bookSubtitle = book.description.substring(0, 40) + (book.description.length > 40 ? '...' : '');
                  } else if (book.category === 'Science & Tech' || book.category === 'Technology') {
                    bookSubtitle = 'Scientific Theories';
                  } else if (book.category === 'Non-Fiction') {
                    bookSubtitle = 'General Research';
                  } else if (book.category === 'Biography') {
                    bookSubtitle = 'Biography & Memoir';
                  } else if (book.category === 'Fiction') {
                    bookSubtitle = 'Classic Fiction';
                  } else {
                    bookSubtitle = 'Library Collection';
                  }

                  return (
                    <tr key={book.id}>
                      <td style={{ fontWeight: 600, color: '#505f76' }}>{bookCode}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {/* Book cover thumbnail */}
                          <div style={{ width: '40px', height: '54px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e7ff', backgroundColor: '#f2f3ff' }}>
                            <TableImageWithFallback
                              src={getCoverImageUrl(book)}
                              alt={book.title}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: '#131b2e' }}>{book.title}</span>
                            <span style={{ fontSize: '0.775rem', color: '#757684', marginTop: '2px' }}>
                              {bookSubtitle}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{book.author}</td>
                      <td>
                        <span className={`db-category-badge ${book.category?.toLowerCase().replace('&', 'and').replace(/\s+/g, '-')}`}>
                          {book.category}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{total}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{avail}</td>
                      <td>
                        <span className={`db-status-dot-badge ${isAvailable ? 'available' : 'borrowed'}`}>
                          <span className="dot" />
                          <span>{isAvailable ? 'Available' : 'Out of Stock'}</span>
                        </span>
                      </td>
                      <td>
                        <div className="db-table-actions">
                          <button
                            className="db-action-icon-btn view"
                            onClick={() => setSelectedBookPreview(book)}
                            title="View Details"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            className="db-action-icon-btn edit"
                            onClick={() => handleStartEdit(book)}
                            title="Edit Book"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            className="db-action-icon-btn delete"
                            onClick={() => setDeletingBook(book)}
                            title="Delete Book"
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
        {!loading && bookTotalPages > 1 && (
          <div className="db-pagination-container">
            <span className="db-pagination-summary">
              Showing <strong>{paginatedBooks.length}</strong> of <strong>{filteredBooks.length}</strong> books
            </span>
            <nav className="mdb-pagination" aria-label="Book inventory pagination" style={{ marginTop: 0 }}>
              <button
                className="mdb-page-btn"
                onClick={() => setBookCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={bookCurrentPage === 1}
                aria-label="Previous page"
              >
                &lt;
              </button>
              {getBookPageNumbers().map((page, index) => {
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
                    className={`mdb-page-btn ${bookCurrentPage === page ? 'mdb-page-btn-active' : ''}`}
                    onClick={() => setBookCurrentPage(page)}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                className="mdb-page-btn"
                onClick={() => setBookCurrentPage((prev) => Math.min(prev + 1, bookTotalPages))}
                disabled={bookCurrentPage === bookTotalPages}
                aria-label="Next page"
              >
                &gt;
              </button>
            </nav>
          </div>
        )}
      </section>

      {/* Insights footer card */}
      {/* <section className="db-insights-card" aria-label="Inventory Insights">
        <h4 className="db-insights-title">Inventory Insights</h4>
        <p className="db-insights-desc">
          Manage your collection with clinical precision. Our updated indexing system ensures 99.9% search accuracy for your library members.
        </p>
      </section> */}

      {/* ─── MODALS ─── */}

           {selectedBookPreview && createPortal(
        <div className="modal-backdrop" onClick={() => setSelectedBookPreview(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Book Details Summary</h3>
              <button className="modal-close-btn" onClick={() => setSelectedBookPreview(null)} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="db-preview-modal-grid">
                <div className="db-preview-modal-cover-wrapper">
                  {getCoverImageUrl(selectedBookPreview) ? (
                    <img
                      src={getCoverImageUrl(selectedBookPreview)}
                      alt={selectedBookPreview.title}
                      className="db-preview-modal-cover"
                    />
                  ) : (
                    <div className="db-preview-modal-cover-none">
                      No Cover
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span className="db-category-badge" style={{ alignSelf: 'flex-start' }}>
                      {selectedBookPreview.category}
                    </span>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '8px 0 2px 0', color: '#131b2e' }}>{selectedBookPreview.title}</h4>
                    <p style={{ margin: 0, color: '#505f76', fontSize: '0.9rem' }}>by {selectedBookPreview.author}</p>
                  </div>
                  <div>
                    <h5 className="text-label-sm" style={{ margin: '0 0 4px 0', color: '#757684' }}>Synopsis</h5>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#131b2e', lineHeight: 1.6 }}>
                      {selectedBookPreview.description || 'No descriptive overview is currently available for this catalog asset.'}
                    </p>
                  </div>
                  <div className="modal-grid-2col" style={{ marginTop: '4px', backgroundColor: '#f7f9ff', padding: '16px', borderRadius: '8px', border: '1px solid #e2e7ff' }}>
                    <div>
                      <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>ISBN Reference</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#131b2e', marginTop: '4px', display: 'block' }}>{selectedBookPreview.isbn || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>Availability Status</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#131b2e', marginTop: '4px', display: 'block' }}>
                        {selectedBookPreview.availabilityStatus} ({(selectedBookPreview.availableQuantity ?? 0)} of {(selectedBookPreview.totalQuantity ?? 1)} available)
                      </span>
                    </div>
                    <div>
                      <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>Total Quantity</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#131b2e', marginTop: '4px', display: 'block' }}>{selectedBookPreview.totalQuantity ?? 1}</span>
                    </div>
                    <div>
                      <span className="text-label-md" style={{ display: 'block', color: '#757684' }}>Available Quantity</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#131b2e', marginTop: '4px', display: 'block' }}>{selectedBookPreview.availableQuantity ?? 1}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => setSelectedBookPreview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editingBook && createPortal(
        <div className="modal-backdrop" onClick={() => { setEditingBook(null); closeModal(); }}>
          <div className="modal-content modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Book Asset Specifications</h3>
              <button className="modal-close-btn" onClick={() => { setEditingBook(null); closeModal(); }} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleEditBookSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px' }}>
                <div className="modal-grid-3col">
                  <div className="form-group col-span-3">
                    <label htmlFor="modal-edit-title">Book Title *</label>
                    <input
                      id="modal-edit-title"
                      type="text"
                      className="form-input"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-edit-author">Author *</label>
                    <input
                      id="modal-edit-author"
                      type="text"
                      className="form-input"
                      value={editForm.author}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, author: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-edit-category">Category</label>
                    <select
                      id="modal-edit-category"
                      className="form-select"
                      value={editForm.category}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
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
                    <label htmlFor="modal-edit-isbn">ISBN Reference</label>
                    <input
                      id="modal-edit-isbn"
                      type="text"
                      className="form-input"
                      value={editForm.isbn}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, isbn: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="modal-edit-cover">Cover Image URL</label>
                    <input
                      id="modal-edit-cover"
                      type="url"
                      className="form-input"
                      value={editForm.coverImageUrl}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, coverImageUrl: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="modal-edit-total-qty">Total Qty *</label>
                    <input
                      id="modal-edit-total-qty"
                      type="number"
                      min="1"
                      className="form-input"
                      value={editForm.totalQuantity ?? 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setEditForm((prev) => ({ 
                          ...prev, 
                          totalQuantity: val,
                          availableQuantity: Math.min(prev.availableQuantity ?? 1, val)
                        }));
                      }}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="modal-edit-avail-qty">Available Qty *</label>
                    <input
                      id="modal-edit-avail-qty"
                      type="number"
                      min="0"
                      className="form-input"
                      value={editForm.availableQuantity ?? 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        setEditForm((prev) => ({ 
                          ...prev, 
                          availableQuantity: Math.min(val, prev.totalQuantity ?? 1)
                        }));
                      }}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="form-group col-span-1">
                    <label htmlFor="modal-edit-status">Availability Status</label>
                    <select
                      id="modal-edit-status"
                      className="form-select"
                      value={editForm.availabilityStatus}
                      onChange={(e) => setEditForm((prev) => {
                        const status = e.target.value;
                        let avail = prev.availableQuantity;
                        if (status === 'Available' && avail === 0) {
                          avail = 1;
                        } else if (status === 'Issued') {
                          avail = 0;
                        }
                        return { ...prev, availabilityStatus: status, availableQuantity: avail };
                      })}
                      disabled={submitting}
                    >
                      <option value="Available">Available</option>
                      <option value="Issued">Issued</option>
                    </select>
                  </div>

                  <div className="form-group col-span-2">
                    <label htmlFor="modal-edit-desc">Description (Optional)</label>
                    <textarea
                      id="modal-edit-desc"
                      className="form-input form-textarea"
                      style={{ height: '44px', minHeight: '44px' }}
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      disabled={submitting}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => { setEditingBook(null); closeModal(); }} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 7. DELETE BOOK CONFIRMATION MODAL */}
      {deletingBook && createPortal(
        <div className="modal-backdrop" onClick={() => { setDeletingBook(null); closeModal(); }}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ba1a1a' }}>Confirm Asset Purge</h3>
              <button className="modal-close-btn" onClick={() => { setDeletingBook(null); closeModal(); }} aria-label="Close modal">
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#505f76', lineHeight: 1.5 }}>
                Are you absolutely sure you want to permanently purge <strong>&quot;{deletingBook.title}&quot;</strong> from the library book inventory?
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: '#ba1a1a', fontWeight: 600 }}>
                Warning: This action is destructive and cannot be reversed.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="db-action-btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }} onClick={() => { setDeletingBook(null); closeModal(); }} disabled={submitting}>
                Cancel
              </button>
              <button type="button" className="db-action-btn-primary" style={{ padding: '8px 16px', fontSize: '0.875rem', backgroundColor: '#ba1a1a', borderColor: '#ba1a1a' }} onClick={() => handleDeleteBook(deletingBook.id)} disabled={submitting}>
                {submitting ? 'Purging...' : 'Purge Asset'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── INLINE SVGS ───

function TableImageWithFallback({ src, alt }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eaedff', color: '#00288e' }}>
        <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={() => setError(true)}
    />
  );
}
