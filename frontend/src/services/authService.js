import { API_BASE_URL, handleResponse } from './apiClient';

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