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
  handleGetGitHubGrass,
  handleGetRepoCommits,
  handleGetRepoBlame,
  handleGetCommitDetail,
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

route.get("/test/grass", getAccessToken, githubUserData, handleGetGitHubGrass);

route.get(
  "/test/blame",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleGetRepoBlame
);

route.get(
  "/test/commits",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleGetRepoCommits
);

route.get(
  "/test/commit-detail",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleGetCommitDetail
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
