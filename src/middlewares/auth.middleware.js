import {
  AuthError,
  ExpirationAccessTokenError,
  NotAccessTokenError,
} from "../errors/auth.error.js";
import { parseBearerToken, verifyJwt } from "../utils/jwt.util.js";

export const verifyAccessToken = (req, res, next) => {
  const token = parseBearerToken(req.headers.authorization);
  if (!token) {
    return next(new AuthError("Access Token이 없습니다."));
  }
  try {
    const decoded = verifyJwt(token);

    if (decoded.payload.type !== "AT") {
      return next(new NotAccessTokenError("Access Token이 아닙니다."));
    }

    req.user = req.user || {};
    req.user.userId = decoded.payload.userId;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(ExpirationAccessTokenError("Access Token이 만료되었습니다."));
    }
    return next(new NotAccessTokenError("유효하지 않은 토큰입니다."));
  }
};
