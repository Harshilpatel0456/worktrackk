// WorkTrack API Client with JWT Auth, Mutex Refresh, and Proactive Session Management

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('worktrack_access_token'),
  getRefreshToken: () => localStorage.getItem('worktrack_refresh_token'),
  setTokens: (access, refresh) => {
    if (access) localStorage.setItem('worktrack_access_token', access);
    if (refresh) localStorage.setItem('worktrack_refresh_token', refresh);
  },
  clearTokens: () => {
    localStorage.removeItem('worktrack_access_token');
    localStorage.removeItem('worktrack_refresh_token');
  },
};

// Safe JWT payload parser without external libraries
export function parseJwt(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Mutex promise to handle multiple simultaneous 401s without triggering conflicting refresh requests
let inFlightRefreshPromise = null;

export async function refreshAccessToken() {
  if (inFlightRefreshPromise) {
    return inFlightRefreshPromise;
  }

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    tokenStorage.clearTokens();
    window.dispatchEvent(new CustomEvent('worktrack:session-expired'));
    return null;
  }

  // Check if refresh token itself has expired
  const refreshPayload = parseJwt(refreshToken);
  if (refreshPayload && refreshPayload.exp && refreshPayload.exp * 1000 < Date.now()) {
    tokenStorage.clearTokens();
    window.dispatchEvent(new CustomEvent('worktrack:session-expired'));
    return null;
  }

  inFlightRefreshPromise = (async () => {
    try {
      const refreshRes = await fetch(`${BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccess = refreshData.access;
        const newRefresh = refreshData.refresh || refreshToken;
        tokenStorage.setTokens(newAccess, newRefresh);

        // Check if refresh token is nearing expiration (e.g., within 24 hours) to emit warning
        const newRefreshPayload = parseJwt(newRefresh);
        if (newRefreshPayload?.exp) {
          const timeLeftMs = newRefreshPayload.exp * 1000 - Date.now();
          if (timeLeftMs > 0 && timeLeftMs < 24 * 60 * 60 * 1000) {
            window.dispatchEvent(
              new CustomEvent('worktrack:session-expiring', {
                detail: { minutesRemaining: Math.round(timeLeftMs / 60000) },
              })
            );
          }
        }

        return newAccess;
      } else {
        tokenStorage.clearTokens();
        window.dispatchEvent(new CustomEvent('worktrack:session-expired'));
        return null;
      }
    } catch {
      // Network glitch - do not immediately clear tokens to avoid logout during temporary disconnection
      return null;
    } finally {
      inFlightRefreshPromise = null;
    }
  })();

  return inFlightRefreshPromise;
}

// Proactive refresh: if access token has less than 2 minutes left, refresh before request
async function ensureFreshAccessToken() {
  const accessToken = tokenStorage.getAccessToken();
  if (!accessToken) return null;

  const payload = parseJwt(accessToken);
  if (payload && payload.exp) {
    const timeUntilExpMs = payload.exp * 1000 - Date.now();
    // Less than 2 minutes remaining
    if (timeUntilExpMs < 120000) {
      const freshToken = await refreshAccessToken();
      if (freshToken) return freshToken;
    }
  }
  return accessToken;
}

// Generic fetch with auth and auto-refresh on 401
export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isFormData = options.body instanceof FormData;
  const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/refresh');

  // Proactively ensure fresh access token unless hitting login or refresh directly
  let accessToken = isAuthEndpoint ? null : await ensureFreshAccessToken();
  if (!accessToken && !isAuthEndpoint) {
    accessToken = tokenStorage.getAccessToken();
  }

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new Error('Unable to connect to WorkTrack backend server. Please verify Django is running on ' + BASE_URL);
  }

  // Handle Token Refresh on 401 Unauthorized via the shared mutex
  if (response.status === 401 && !isAuthEndpoint) {
    const newAccessToken = await refreshAccessToken();
    if (newAccessToken) {
      // Retry initial request with new access token
      headers.Authorization = `Bearer ${newAccessToken}`;
      const retryRes = await fetch(url, { ...config, headers });
      if (!retryRes.ok) {
        const errData = await retryRes.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `Request failed with status ${retryRes.status}`);
      }
      if (retryRes.status === 204) {
        return null;
      }
      return retryRes.json();
    }
  }

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = errJson.detail;
      } else if (errJson.message) {
        errorDetail = errJson.message;
      } else if (typeof errJson === 'object') {
        const fieldErrors = Object.entries(errJson)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join('; ');
        if (fieldErrors) errorDetail = fieldErrors;
      }
    } catch {
      // not JSON
    }
    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Authentication API methods
export const authApi = {
  login: async ({ email, password }) => {
    return apiClient('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register: async (userData) => {
    return apiClient('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh: refreshToken }),
        });
      }
    } finally {
      tokenStorage.clearTokens();
    }
  },

  getCurrentUser: async () => {
    return apiClient('/auth/me/', {
      method: 'GET',
    });
  },

  changePassword: async ({ oldPassword, newPassword, confirmNewPassword, confirmPassword }) => {
    return apiClient('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword || confirmNewPassword,
      }),
    });
  },

  requestPasswordReset: async ({ email }) => {
    return apiClient('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  confirmPasswordReset: async ({ uid, token, newPassword, confirmNewPassword, confirmPassword }) => {
    return apiClient('/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword || confirmNewPassword,
      }),
    });
  },
};
