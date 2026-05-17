const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const token = localStorage.getItem('life:token');
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      message = JSON.parse(text).error || text;
    } catch {
      // Keep raw response text.
    }
    throw new ApiError(message || 'Request failed', response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  login: (username, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  weather: (city) => request(`/life/weather?city=${encodeURIComponent(city || '')}`),
  quote: () => request('/life/quote'),
  joke: () => request('/life/joke'),
  music: (query, provider) => request(`/life/music/search?q=${encodeURIComponent(query)}&provider=${provider}`),
  googleAuthUrl: () => request('/life/google/auth-url'),
  googleExchange: (code, redirectUri) => request('/life/google/exchange', {
    method: 'POST',
    body: JSON.stringify({ code, redirectUri })
  }),
  googleEvents: () => request('/life/google/events'),
  createGoogleEvent: (event) => request('/life/google/events', {
    method: 'POST',
    body: JSON.stringify(event)
  }),
  trelloBoards: () => request('/life/trello/boards'),
  trelloTasks: (boardId) => request(`/life/trello/tasks?boardId=${boardId}`),
  moveTrelloCard: (cardId, listId) => request(`/life/trello/cards/${cardId}/move`, {
    method: 'PUT',
    body: JSON.stringify({ listId })
  }),
  assistant: (messages) => request('/life/assistant', {
    method: 'POST',
    body: JSON.stringify({ messages })
  })
};
