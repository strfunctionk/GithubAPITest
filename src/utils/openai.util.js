import ai from "../configs/openai.config.js";

export const openaiModels = Object.freeze({
  GPT_5_NANO: "gpt-5-nano",
  GPT_4: "gpt-4",
  GPT_4_TURBO: "gpt-4-turbo",
  GPT_3_5_TURBO: "gpt-3.5-turbo",
  GPT_3_5_TURBO_16K: "gpt-3.5-turbo-16k",
  GPT_3_5_TURBO_0613: "gpt-3.5-turbo-0613",
  GPT_4_0314: "gpt-4-0314",
  GPT_4_0613: "gpt-4-0613",
  GPT_4_TURBO_0613: "gpt-4-turbo-0613",
  CODEX_DAVINCI_002: "code-davinci-002",
  CODEX_CUSHMAN_002: "code-cushman-002",
});

export const openaiClient = async (model, messages) => {
  try {
    const response = await ai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        {
          role: "user",
          content: messages,
        },
      ],
    });
    return response;
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
};
