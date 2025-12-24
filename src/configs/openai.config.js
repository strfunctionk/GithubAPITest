import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const ai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
export default ai;
