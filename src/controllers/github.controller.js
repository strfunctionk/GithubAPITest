import { StatusCodes } from "http-status-codes";
import {
  getRepoContent,
  getRepoTreeRecursive,
  getRepoZipball,
} from "../services/github.service.js";
import { sendZipResponse } from "../utils/buffer.util.js";

export const handleTestGithubData = async (req, res) => {
  const accessToken = req.accessToken;
  const user = req.user;
  const repos = req.user.repos;
  // const repoData = await getRepoContent(
  //   accessToken,
  //   user.login,
  //   repos[1].name,
  //   "" // 루트 디렉토리
  // );
  // const repoData = await getRepoTreeRecursive(
  //   accessToken,
  //   user.login,
  //   repos[1].name,
  //   "main",
  //   1
  // );
  const repoData = await getRepoZipball(
    accessToken,
    user.login,
    repos[1].name,
    "main"
  );
  if (repoData) {
    return sendZipResponse(res, repoData, repos[1].name);
  }
  res.status(StatusCodes.OK).success(repoData ? true : false);
};
