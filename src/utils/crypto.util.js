import crypto from "crypto";
export const createHashedPassword = (data, hashingAlgorithm = "sha512") => {
  return crypto.createHash(hashingAlgorithm).update(data).digest("hex");
};
