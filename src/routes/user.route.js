import express from "express";
import { handleUserProfile } from "../controllers/user.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";

const route = express.Router();

route.get("/", verifyAccessToken, handleUserProfile);

export default route;
