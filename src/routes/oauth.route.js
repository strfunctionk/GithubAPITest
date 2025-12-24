import express from "express";
import { exchangeGitHubCodeForToken } from "../middlewares/oauth.middleware.js";
import {
  handleLoginWithGitHub,
  handleCallbackFromGitHub,
} from "../controllers/oauth.controller.js";
const route = express.Router();

route.get("/github", handleLoginWithGitHub);
route.get(
  "/callback/github",
  exchangeGitHubCodeForToken,
  handleCallbackFromGitHub
);

export default route;
