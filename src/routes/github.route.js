import express from "express";
import {
  getAccessToken,
  githubUserData,
  githubUserRepos,
} from "../middlewares/github.middleware.js";
import {
  handleTestGithubRepoData,
  handleTestGithubUserData,
  handleDownloadRepoZip,
  handleGetRepoTree,
  handleGetRepoContent,
} from "../controllers/github.controller.js";
const route = express.Router();

route.get(
  "/test",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleTestGithubRepoData
);

route.get(
  "/test/user",
  getAccessToken,
  githubUserData,
  handleTestGithubUserData
);

route.get(
  "/test/content",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleGetRepoContent
);

route.get(
  "/test/tree",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleGetRepoTree
);

route.get(
  "/test/zip",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleDownloadRepoZip
);

export default route;
