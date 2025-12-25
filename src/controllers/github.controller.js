import { StatusCodes } from "http-status-codes";
import {
  getRepoContent,
  getRepoTreeRecursive,
  getRepoZipball,
  getGitHubGrass,
  getRepoCommits,
  getRepoFileBlame,
  getCommitDetail,
} from "../services/github.service.js";
import { sendZipResponse } from "../utils/buffer.util.js";
import { getRepoContext } from "../utils/github.util.js";

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
  const { year } = req.query;
  const grassData = await getGitHubGrass(req.accessToken, req.user.login, year);

  return res.status(StatusCodes.OK).success({
    message: "GitHub Grass Data",
    userName: req.user.login,
    grass: grassData,
  });
};

export const handleGetRepoBlame = async (req, res) => {
  const { owner, repo, branch } = getRepoContext(req);
  const { path } = req.query;
  const targetPath = path || "package.json";

  const blameData = await getRepoFileBlame(
    req.accessToken,
    owner,
    repo,
    targetPath,
    branch
  );

  return res.status(StatusCodes.OK).success({
    message: "Repository File Blame Data",
    owner,
    repo,
    branch,
    path: targetPath,
    blame: blameData,
  });
};

export const handleGetCommitDetail = async (req, res) => {
  const { owner, repo } = getRepoContext(req);
  const { sha } = req.query;

  if (!sha)
    return res
      .status(StatusCodes.BAD_REQUEST)
      .error({ errorCode: "INVALID_REQUEST", reason: "SHA is required" });

  const detail = await getCommitDetail(req.accessToken, owner, repo, sha);
  return res
    .status(StatusCodes.OK)
    .success({ message: "Commit Detail Data", owner, repo, sha, detail });
};

export const handleGetRepoCommits = async (req, res) => {
  const { owner, repo } = getRepoContext(req);
  const { author } = req.query;

  const commits = await getRepoCommits(
    req.accessToken,
    owner,
    repo,
    author ? { author } : {}
  );
  return res
    .status(StatusCodes.OK)
    .success({ message: "Repository Commits Data", owner, repo, commits });
};

export const handleGetRepoContent = async (req, res) => {
  const { owner, repo } = getRepoContext(req);
  const content = await getRepoContent(req.accessToken, owner, repo, "");

  return res
    .status(StatusCodes.OK)
    .success({
      message: "Repository Content Data (Root)",
      owner,
      repo,
      content,
    });
};

export const handleGetRepoTree = async (req, res) => {
  const { owner, repo, branch } = getRepoContext(req);
  const tree = await getRepoTreeRecursive(req.accessToken, owner, repo, branch);

  return res
    .status(StatusCodes.OK)
    .success({ message: "Repository Tree Data", owner, repo, branch, tree });
};

export const handleDownloadRepoZip = async (req, res) => {
  const { owner, repo, branch } = getRepoContext(req);
  const repoData = await getRepoZipball(req.accessToken, owner, repo, branch);

  if (repoData) return sendZipResponse(res, repoData, repo);
  return res
    .status(StatusCodes.INTERNAL_SERVER_ERROR)
    .error({
      errorCode: "DOWNLOAD_FAILED",
      reason: "Failed to download zipball",
    });
};
