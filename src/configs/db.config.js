import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";

const url = new URL(process.env.DATABASE_URL);
const pool = mariadb.createPool({
  host: url.hostname,
  port: parseInt(url.port) || 3306,
  user: url.username,
  password: decodeURIComponent(url.password),
  database: url.pathname.slice(1),
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});
const adapter = new PrismaMariaDb(pool);

export const prisma = new PrismaClient({ adapter });
