import express from "express";
import {
  handleTestGit,
  handleAnalyzeRepository,
  handleAnalyzeRepositoryDetail,
  handleAnalyzeContribution,
  handleDetailedReport,
} from "../controllers/git.controller.js";

const route = express.Router();

route.get("/", handleTestGit);

// POST /git/analyze - 레포지토리 분석 및 AI 주석 추가
route.post("/analyze", handleAnalyzeRepository);

// POST /git/analyze/detail - 레포지토리 분석 (파일 히스토리 상세 포함)
route.post("/analyze/detail", handleAnalyzeRepositoryDetail);

// POST /git/analyze/contribution - AI 기반 기여도 분석 리포트
route.post("/analyze/contribution", handleAnalyzeContribution);

// POST /git/analyze/report - 상세 기여도 리포트 (10가지 항목 포함)
route.post("/analyze/report", handleDetailedReport);

export default route;
