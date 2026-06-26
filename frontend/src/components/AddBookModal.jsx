import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createBook } from '../services/adminService';
import { useToast } from '../context/ToastContext';
import { CloseIcon } from './Icons';

export default function AddBookModal({ isOpen, onClose, token, onSuccess }) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    category: 'General',
    description: '',
    coverImageUrl: '',
    isbn: '',
    totalQuantity: 1,
  });

  // Automatically generate cover image URL when entering isbn
  useEffect(() => {
    if (bookForm.isbn && bookForm.isbn.trim()) {
      const sanitized = bookForm.isbn.replace(/[- ]/g, '').trim();
      if (sanitized.length === 10 || sanitized.length === 13) {
        setBookForm((prev) => {
          if (!prev.coverImageUrl || prev.coverImageUrl.includes('covers.openlibrary.org/b/isbn/')) {
            return {
              ...prev,
              coverImageUrl: `https://covers.openlibrary.org/b/isbn/${sanitized}-L.jpg?default=false`,
            };
          }
          return prev;
        });
      }
    }
  }, [bookForm.isbn]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookForm.title.trim() || !bookForm.author.trim()) {
      toast.error('Title and Author fields are strictly mandatory.');
      return;
    }

    try {
      setSubmitting(true);
      await createBook(bookForm, token);
      toast.success('Book asset added successfully to inventory!');
      setBookForm({
        title: '',
        author: '',
        category: 'General',
        description: '',
        coverImageUrl: '',
        isbn: '',
        totalQuantity: 1,
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to add book asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Add New Book Asset</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '16px 24px' }}>
            <div className="modal-grid-3col">
              <div className="form-group col-span-3">
                <label htmlFor="modal-book-title">Book Title *</label>
                <input
                  id="modal-book-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. The Great Gatsby"
                  value={bookForm.title}
                  onChange={(e) => setBookForm((prev) => ({ ...prev, title: e.target.value }))}
                  disabled={submitting}
                  required
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
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-book-category">Category</label>
                <select
                  id="modal-book-category"
                  className="form-select"
                  value={bookForm.category}
                  onChange={(e) => setFormValue('category', e.target.value)}
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

              <div className="form-group col-span-2">
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

              <div className="form-group col-span-1">
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

              <div className="form-group col-span-3">
                <label htmlFor="modal-book-desc">Description (Optional)</label>
                <textarea
                  id="modal-book-desc"
                  className="form-input form-textarea"
                  style={{ height: '56px', minHeight: '56px' }}
                  placeholder="Brief description of the literary asset..."
                  value={bookForm.description}
                  onChange={(e) => setBookForm((prev) => ({ ...prev, description: e.target.value }))}
                  disabled={submitting}
                ></textarea>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="db-action-btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="db-action-btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );

  function setFormValue(key, value) {
    setBookForm((prev) => ({ ...prev, [key]: value }));
  }
}
