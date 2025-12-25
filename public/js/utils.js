// GitHub API Helper

const API_BASE = "/v1/api/github";

const getAuthToken = () => localStorage.getItem("github_token");

const setAuthToken = (token) => {
  localStorage.setItem("github_token", token);
  console.log("Token saved:", token);
};

const clearAuthToken = () => localStorage.removeItem("github_token");

const requireAuth = () => {
  if (!getAuthToken()) {
    window.location.href = "/login";
  }
};

const fetchAPI = async (endpoint, params = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No access token");

  const url = new URL(endpoint, window.location.origin);
  Object.keys(params).forEach((key) => {
    if (params[key]) url.searchParams.append(key, params[key]);
  });

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.reason || data.message || "API Request Failed");
  }
  return data;
};

// Common User Fetch
const fetchUser = async () => {
  try {
    const data = await fetchAPI(`${API_BASE}/test/user`);
    return data.success.user;
  } catch (e) {
    console.error("Failed to fetch user", e);
    if (e.message.includes("401") || e.message.includes("Unauthorized")) {
      clearAuthToken();
      window.location.href = "/login";
    }
    return null;
  }
};

// Render Header User Info
const renderHeader = async () => {
  const user = await fetchUser();
  if (user) {
    const userEl = document.getElementById("headerUser");
    if (userEl) {
      userEl.innerHTML = `
                <img src="${user.avatar_url}" width="20" height="20" style="border-radius:50%; vertical-align:middle; margin-right:8px;">
                ${user.login}
                <button class="btn-logout" onclick="logout()">Sign out</button>
            `;
    }
  }
};

const logout = () => {
  clearAuthToken();
  window.location.href = "/login";
};

// Helper to format date
const timeAgo = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};
