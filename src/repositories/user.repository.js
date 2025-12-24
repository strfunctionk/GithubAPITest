import { prisma } from "../configs/db.config.js";
export const addUser = async (data) => {
  const user = await prisma.user.findFirst({ where: { email: data.email } });
  if (user) {
    return null;
  }
  const created = await prisma.user.create({ data: data });
  return created.id;
};
export const getUser = async (userId) => {
  const user = await prisma.user.findFirstOrThrow({ where: { id: userId } });
  return user;
};
