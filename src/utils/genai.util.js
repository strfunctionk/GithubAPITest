import ai from "../configs/genai.config.js";

export const genaiModels = Object.freeze({
  GEMINI_1_5_PRO: "gemini-1.5-pro",
  GEMINI_1_5_FLASH: "gemini-1.5-flash",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_PRO: "gemini-pro",
  GEMINI_PRO_VISION: "gemini-pro-vision",
  GEMINI_PRO_LATEST: "gemini-pro-latest",
  GEMINI_1_0_PRO: "gemini-1.0-pro",
  GEMINI_1_0_PRO_VISION: "gemini-1.0-pro-vision",
  GEMINI_ULTRA: "gemini-ultra",
  IMAGINE_2: "imagine-2",
});

export const genaiClient = async (model, contents) => {
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
    });
    return response;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};
