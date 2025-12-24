import axios from "axios";
export const githubClient = async (endpoint, token, options = {}) => {
  const { method = "GET", data, params } = options;
  const url = endpoint.startsWith("http")
    ? endpoint
    : `https://api.github.com${
        endpoint.startsWith("/") ? endpoint : "/" + endpoint
      }`;

  try {
    const response = await axios({
      url,
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      data,
      params,
      ...options,
    });
    return response.data;
  } catch (error) {
    console.error(
      `GitHub API Error (${endpoint}):`,
      error.response?.data || error.message
    );
    throw error;
  }
};
