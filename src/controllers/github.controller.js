import { StatusCodes } from "http-status-codes";
import {
  getRepoContent,
  getRepoTreeRecursive,
  getRepoZipball,
  getGitHubGrass,
} from "../services/github.service.js";
import { sendZipResponse } from "../utils/buffer.util.js";

export const handleTestGithubRepoData = (req, res) => {
  res.status(StatusCodes.OK).success({
    message: "GitHub data retrieved successfully",
    user: req.user,
    repos: req.repos,
  });
};

export const handleTestGithubUserData = (req, res) => {
  res.status(StatusCodes.OK).success({
    message: "GitHub User Data Only",
    user: req.user,
  });
};

export const handleGetGitHubGrass = async (req, res) => {
  const user = req.user;

  const grassData = await getGitHubGrass(req.accessToken, user.login);

  return res.status(StatusCodes.OK).success({
    message: "GitHub Grass (Contributions) Data",
    userName: user.login,
    grass: grassData,
  });
};

export const handleGetRepoContent = async (req, res) => {
  const user = req.user;
  const repos = req.repos;
  const targetRepo = repos.length > 1 ? repos[1] : repos[0];

  // 루트(/) 경로의 콘텐츠를 가져옵니다.
  const content = await getRepoContent(
    req.accessToken,
    user.login,
    targetRepo.name,
    ""
  );

  return res.status(StatusCodes.OK).success({
    message: "Repository Content Data (Root)",
    repo: targetRepo.name,
    content: content,
  });
};

export const handleGetRepoTree = async (req, res) => {
  const user = req.user;
  const repos = req.repos;

  const targetRepo = repos.length > 1 ? repos[1] : repos[0];

  const treeData = await getRepoTreeRecursive(
    req.accessToken,
    user.login,
    targetRepo.name,
    targetRepo.default_branch || "main"
  );

  return res.status(StatusCodes.OK).success({
    message: "Repository Tree Data",
    repo: targetRepo.name,
    tree: treeData,
  });
};

export const handleDownloadRepoZip = async (req, res) => {
  const user = req.user;
  const repos = req.repos;

  const targetRepo = repos.length > 1 ? repos[1] : repos[0];

  console.log(`Downloading zip for repo: ${targetRepo.name}`);

  const repoData = await getRepoZipball(
    req.accessToken,
    user.login,
    targetRepo.name,
    targetRepo.default_branch || "main"
  );

  if (repoData) {
    return sendZipResponse(res, repoData, targetRepo.name);
  }

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).error({
    errorCode: "DOWNLOAD_FAILED",
    reason: "Failed to download zipball",
  });
};
