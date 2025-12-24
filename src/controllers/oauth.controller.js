import dotenv from "dotenv";
import { githubOAuthConfig } from "../configs/oauth.config.js";
import { StatusCodes } from "http-status-codes";

dotenv.config();

export const handleLoginWithGitHub = (req, res) => {
  const { CLIENT_ID, scopes } = githubOAuthConfig();
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${scopes.join(
    ","
  )}`;
  res.redirect(githubUrl);
};

export const handleCallbackFromGitHub = async (req, res) => {
  const accessToken = req.accessToken;
  res.status(StatusCodes.OK).success(accessToken);
};
