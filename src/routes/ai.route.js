import express from "express";
import { handleGenAI, handleOpenAI } from "../controllers/ai.controller.js";
import { verifyAccessToken } from "../middlewares/auth.middleware.js";
const route = express.Router();

route.post("/genai", verifyAccessToken, handleGenAI);
route.post("/openai", verifyAccessToken, handleOpenAI);

export default route;
