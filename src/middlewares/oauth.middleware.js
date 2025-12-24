import axios from "axios";
import { githubOAuthConfig } from "../configs/oauth.config.js";

export const exchangeGitHubCodeForToken = async (req, res, next) => {
  const { CLIENT_ID, CLIENT_SECRET } = githubOAuthConfig();
  const { code } = req.query;
  if (!code) {
    return next(new Error("코드가 없습니다."));
  }
  const response = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
    },
    {
      headers: { Accept: "application/json" },
    }
  );
  const accessToken = response.data.access_token;
  req.accessToken = accessToken;
  return next();
};
