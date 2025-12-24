import express from "express";
import aiRoute from "./ai.route.js";
import authRoute from "./auth.route.js";
import oauthRoute from "./oauth.route.js";
import userRoute from "./user.route.js";

const router = express.Router();

router.use("/ai", aiRoute);
router.use("/auth", authRoute);
router.use("/oauth", oauthRoute);
router.use("/user", userRoute);

export default router;
