import { responseFromUser } from "../dtos/user.dto.js";
import { addUser, getUser } from "../repositories/user.repository.js";
import {
  getUserSignIn,
  updateUserRefresh,
  getUserRefresh,
} from "../repositories/auth.repository.js";
import {
  DuplicateEmailError,
  InvalidRequestError,
  NotRefreshTokenError,
} from "../errors/auth.error.js";
import { responseFromAuth } from "../dtos/auth.dto.js";
import { createJwt } from "../utils/jwt.util.js";
import { createHashedPassword } from "../utils/crypto.util.js";

export const signUp = async (data) => {
  const hashedPassword = createHashedPassword(data.password);
  const userId = await addUser({
    email: data.email,
    name: data.name,
    username: data.username,
    avatar: data.avatar || null,
    password: hashedPassword,
  });

  if (userId === null) {
    throw new DuplicateEmailError("이미 존재하는 이메일입니다.", data);
  }

  const user = await getUser(userId);
  return responseFromUser({
    user,
  });
};

export const signIn = async (data) => {
  const hashedPassword = createHashedPassword(data.password);
  const user = await getUserSignIn({
    email: data.email,
  });
  if (user === null || user.password !== hashedPassword) {
    throw new InvalidRequestError("이메일 또는 비밀번호가 일치하지 않습니다.");
  }
  const accecsToken = createJwt({ userId: user.id, type: "AT" });
  const refreshToken = createJwt({ userId: user.id, type: "RT" });

  const updateUser = await updateUserRefresh(user.id, refreshToken);
  if (!updateUser) {
    throw new InvalidRequestError("로그인에 실패했습니다.");
  }
  const auth = {
    id: user.id,
    accessToken: accecsToken,
    refreshToken: refreshToken,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return responseFromAuth({
    auth,
  });
};

export const signOut = async (userId) => {
  const user = await updateUserRefresh(userId, null);
  if (user === null) {
    throw new InvalidRequestError("로그아웃에 실패했습니다.");
  }
  return {};
};

export const refresh = async (data) => {
  const user = await getUserRefresh({
    refreshToken: data.refreshToken,
  });
  if (user === null) {
    throw new NotRefreshTokenError("유효하지 않은 리프레시 토큰입니다.");
  }
  const accessToken = createJwt({ userId: user.id, type: "AT" });
  const refreshToken = createJwt({ userId: user.id, type: "RT" });
  await updateUserRefresh(user.id, refreshToken);
  const auth = {
    id: user.id,
    name: user.name,
    accessToken: accessToken,
    refreshToken: refreshToken,
  };
  return responseFromAuth({
    auth,
  });
};
