const API_BASE_URL = 'http://localhost:5117';

async function handleResponse(response) {
  let data = null;
  let text = '';
  try {
    text = await response.text();
    data = JSON.parse(text);
  } catch (e) {
    // If it's not valid JSON, we treat it as raw text
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detailedError ||
      data?.message ||
      data?.error ||
      text ||
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

// ─── DASHBOARD STATS ───
export async function getDashboardStats(token) {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

// ─── TRANSACTIONS ───
export async function getTransactions(token) {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function issueBook(payload, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/issue`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function returnBook(payload, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/return`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// ─── BOOKS ───
export async function getBooks(token) {
  const response = await fetch(`${API_BASE_URL}/books`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function createBook(payload, token) {
  const response = await fetch(`${API_BASE_URL}/books`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// ─── MEMBERS ───
export async function getMembers(token) {
  const response = await fetch(`${API_BASE_URL}/members`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function createMember(payload, token) {
  const response = await fetch(`${API_BASE_URL}/members`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// ─── USERS ───
export async function getUsers(token) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function registerUser(userPayload) {
  const response = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload),
  });
  return handleResponse(response);
}

// Helper to register a member completely (User creation + Member linking)
export async function registerAndCreateMember(userPayload, memberCode, token) {
  // Register user - the backend automatically creates and links the member profile record
  const userResponse = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload),
  });
  return handleResponse(userResponse);
}

export async function updateBook(id, payload, token) {
  const response = await fetch(`${API_BASE_URL}/books/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteBook(id, token) {
  const response = await fetch(`${API_BASE_URL}/books/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function updateMember(id, payload, token) {
  const response = await fetch(`${API_BASE_URL}/members/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

export async function deleteMember(id, token) {
  const response = await fetch(`${API_BASE_URL}/members/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

// ─── SEARCH & ASYNC FLOWS ───
export async function searchMembers(query, page, pageSize, token) {
  const q = encodeURIComponent(query || '');
  const response = await fetch(`${API_BASE_URL}/members/search?q=${q}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function searchBooks(query, status, page, pageSize, token) {
  const q = encodeURIComponent(query || '');
  const s = status ? `&status=${encodeURIComponent(status)}` : '';
  const response = await fetch(`${API_BASE_URL}/books/search?q=${q}${s}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function searchActiveTransactions(query, page, pageSize, token) {
  const q = encodeURIComponent(query || '');
  const response = await fetch(`${API_BASE_URL}/transactions/active/search?q=${q}&page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function returnTransaction(transactionId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/return`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
}

// ─── CIRCULATION REQUEST QUEUE ───
export async function getPendingRequests(page = 1, pageSize = 10, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/pending?page=${page}&pageSize=${pageSize}`, {
    method: 'GET',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function approveRequest(transactionId, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}

export async function rejectRequest(transactionId, token) {
  const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse(response);
}
