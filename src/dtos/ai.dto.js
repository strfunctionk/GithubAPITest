export const bodyToAI = (body) => {
  return {
    message: body.message,
  };
};

export const responseFromAI = ({ ai }) => {
  return {
    type: ai.type,
    reply: ai.reply,
  };
};
