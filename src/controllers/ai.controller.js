import { StatusCodes } from "http-status-codes";
import {
  sendMessageForGenAI,
  sendMessageForOpenAI,
} from "../services/ai.service.js";
import { bodyToAI } from "../dtos/ai.dto.js";

export const handleGenAI = async (req, res, next) => {
  /*
  #swagger.tags = ['AI']
  #swagger.summary = 'GenAI 메시지 전송'
  #swagger.description = 'GenAI 메시지를 전송하기 위한 API입니다.'
  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Hello, AI' },
          },
          required: ['message']
        }
      }
    }
  }
  */
  try {
    const ai = await sendMessageForGenAI(
      req.user.userId,
      bodyToAI(req.body).message
    );
    res.status(StatusCodes.OK).success(ai);
  } catch (err) {
    return next(err);
  }
};

export const handleOpenAI = async (req, res, next) => {
  /*
  #swagger.tags = ['AI']
  #swagger.summary = 'OpenAI 메시지 전송'
  #swagger.description = 'OpenAI 메시지를 전송하기 위한 API입니다.'
  #swagger.requestBody = {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Hello, AI' },
          },
          required: ['message']
        }
      }
    }
  }
  */
  try {
    const ai = await sendMessageForOpenAI(
      req.user.userId,
      bodyToAI(req.body).message
    );
    res.status(StatusCodes.OK).success(ai);
  } catch (err) {
    return next(err);
  }
};
