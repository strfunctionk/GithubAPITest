import dotenv from "dotenv";
import { githubClient } from "../utils/github.util.js";
import {
  GitHubAuthError,
  GitHubUserNotFoundError,
  GitHubRepoNotFoundError,
  GitHubApiError,
} from "../errors/github.error.js";

dotenv.config();

export const getAccessToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    req.accessToken = authHeader.split(" ")[1];
    return next();
  }
  if (!req.accessToken) {
    return next(
      new GitHubAuthError(
        "Unauthorized: Missing or invalid Authorization header"
      )
    );
  }
};

export const githubUserData = async (req, res, next) => {
  const accessToken = req.accessToken;
  console.log("GitHub User Data Request - Token:", accessToken);

  try {
    const userData = await githubClient("/user", accessToken);
    console.log("GitHub User Data Response:", userData);

    if (!userData || userData.message === "Not Found") {
      return next(new GitHubUserNotFoundError("GitHub user not found"));
    }
    req.user = userData;
    return next();
  } catch (err) {
    console.error("GitHub API Error (User):", err);
    return next(
      new GitHubApiError("Failed to fetch GitHub user data", err.toString())
    );
  }
};

export const githubUserRepos = async (req, res, next) => {
  const accessToken = req.accessToken;
  console.log("GitHub Repos Request");

  try {
    const repoData = await githubClient("/user/repos", accessToken);

    if (!repoData || repoData.message === "Not Found") {
      return next(new GitHubRepoNotFoundError("GitHub repositories not found"));
    }
    req.repos = repoData;
    return next();
  } catch (err) {
    console.error("GitHub API Error (Repos):", err);
    return next(
      new GitHubApiError("Failed to fetch GitHub repos", err.toString())
    );
  }
};
