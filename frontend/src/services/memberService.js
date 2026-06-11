const API_BASE_URL = 'http://localhost:5117';

async function handleResponse(response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detailedError ||
      data?.message ||
      data?.error ||
      'Request failed. Please try again.';

    throw new Error(message);
  }

  return data;
}

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Fetch all active books in the library catalog
export async function fetchCatalogBooks(token) {
  const response = await fetch(`${API_BASE_URL}/books/catalog`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

// Fetch active checkouts for the logged-in member
export async function fetchMyLoans(memberId, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/my-loans/${memberId}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

// Submit a borrow REQUEST (pending admin approval)
export async function requestBorrow(bookId, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/request`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ bookId }),
  });
  return handleResponse(response);
}

// Submit a direct self-checkout (legacy endpoint, kept for reference)
export async function borrowBook(bookId, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/borrow`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ bookId }),
  });
  return handleResponse(response);
}
