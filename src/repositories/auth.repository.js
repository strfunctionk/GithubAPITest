import { prisma } from "../configs/db.config.js";

export const getUserSignIn = async (data) => {
  const user = await prisma.user.findFirstOrThrow({
    where: {
      email: data.email,
    },
  });
  return user;
};

export const updateUserRefresh = async (userId, refreshToken) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: refreshToken },
  });
  return user;
};

export const getUserRefresh = async (data) => {
  const user = await prisma.user.findFirst({
    where: {
      refreshToken: data.refreshToken,
    },
  });
  return user;
};
