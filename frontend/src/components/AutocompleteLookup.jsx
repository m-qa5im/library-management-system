import { useState, useEffect, useRef } from 'react';

export default function AutocompleteLookup({
  fetchCallback,
  placeholder,
  onSelect,
  getLabel,
  formatItem,
  id = 'autocomplete',
  initialLabel = '',
}) {
  const [query, setQuery] = useState(initialLabel);
  const [inputValue, setInputValue] = useState(initialLabel);
  const [results, setResults] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef(null);
  const pageSize = 10;

  // Track initial label updates
  useEffect(() => {
    setInputValue(initialLabel);
    setQuery(initialLabel);
  }, [initialLabel]);

  // Input Debounce tracking (300ms)
  useEffect(() => {
    // If the input value exactly matches what was selected or initialLabel, do not fetch
    if (inputValue === initialLabel && initialLabel !== '') {
      return;
    }

    const handler = setTimeout(() => {
      setQuery(inputValue);
      setCurrentPage(1); // Reset page on new search
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, initialLabel]);

  // Asynchronous Fetch Handler
  useEffect(() => {
    // Prevent fetching if search query is empty
    if (!query.trim()) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchCallback(query, currentPage, pageSize);
        if (isMounted) {
          setResults(data.items || data.Items || []);
          setTotalCount(data.totalCount || data.TotalCount || 0);
        }
      } catch (err) {
        console.error('Lookup search error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [query, currentPage, fetchCallback]);

  // Handle clicking outside to close results overlay dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // If they didn't select, reset input to initialLabel
        setInputValue(initialLabel);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [initialLabel]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    if (!e.target.value.trim()) {
      onSelect(null); // Clear selection on empty input
    }
  };

  const handleItemClick = (item) => {
    const label = getLabel(item);
    setInputValue(label);
    setQuery(label);
    setIsOpen(false);
    onSelect(item);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={id}
        type="text"
        className="form-input w-full"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        }}
        autoComplete="off"
      />
      
      {isOpen && query.trim() !== '' && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden max-h-[320px] flex flex-col">
          {loading && results.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 text-center italic">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-slate-400 text-center italic">No matching results found</div>
          ) : (
            <ul className="overflow-y-auto divide-y divide-slate-100 flex-1 list-none m-0 p-0 text-left">
              {results.map((item) => (
                <li
                  key={item.id}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-sm transition-colors duration-150 flex flex-col justify-start items-start gap-1"
                  onClick={() => handleItemClick(item)}
                >
                  {formatItem ? (
                    formatItem(item)
                  ) : (
                    <span className="font-semibold text-slate-800">{getLabel(item)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Dynamic Dropdown Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || loading}
                >
                  &lt; Prev
                </button>
                <button
                  type="button"
                  className="px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || loading}
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
