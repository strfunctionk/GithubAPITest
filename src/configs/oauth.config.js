import dotenv from "dotenv";

dotenv.config();

export const githubOAuthConfig = () => {
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const scopes = ["repo", "user"];
  return { CLIENT_ID, CLIENT_SECRET, scopes };
};
