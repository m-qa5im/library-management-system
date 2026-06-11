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

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE_URL}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

export async function getMemberProfile(userId, token) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/users/${userId}/member-profile`, {
    method: 'GET',
    headers,
  });

  return handleResponse(response);
}

export async function getUserProfile(userId, token) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'GET',
    headers,
  });

  return handleResponse(response);
}

export async function updateUserProfile(userId, payload, token) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}