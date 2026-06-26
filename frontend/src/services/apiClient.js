const hostname = typeof window !== 'undefined' && window.location ? window.location.hostname : 'localhost';
export const API_BASE_URL = `http://${hostname}:5117`;

export async function handleResponse(response) {
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

export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
