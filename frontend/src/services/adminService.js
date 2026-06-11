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
  // 1. Register user
  const userResponse = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userPayload),
  });
  const userData = await handleResponse(userResponse);

  // 2. Link member profile
  const memberPayload = {
    userId: userData.id,
    memberCode: memberCode
  };
  return createMember(memberPayload, token);
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
