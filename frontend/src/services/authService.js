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

export async function getMemberProfile(userId) {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/member-profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(response);
}