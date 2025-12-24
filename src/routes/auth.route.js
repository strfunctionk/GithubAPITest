import express from "express";
import {
  handleSignUp,
  handleSignIn,
  handleSignOut,
  handleRefresh,
  handleProtect,
} from "../controllers/auth.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
const route = express.Router();

route.post("/signup", handleSignUp);
route.post("/signin", handleSignIn);
route.post("/signout", verifyAccessToken, handleSignOut);
route.post("/refresh", handleRefresh);
route.get("/protected", verifyAccessToken, handleProtect);

export default route;
