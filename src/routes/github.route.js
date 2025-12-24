import express from "express";
import {
  getAccessToken,
  githubUserData,
  githubUserRepos,
} from "../middlewares/github.middleware.js";
import { handleTestGithubData } from "../controllers/github.controller.js";
const route = express.Router();

route.get(
  "/",
  getAccessToken,
  githubUserData,
  githubUserRepos,
  handleTestGithubData
);

export default route;
