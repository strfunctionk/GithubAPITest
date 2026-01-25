import { StatusCodes } from "http-status-codes";
import {
  analyzeRepository,
  analyzeContributorWithAI,
  generateDetailedContributionReport,
  cleanupDirectory,
} from "../services/git.service.js";
import {
  bodyToAnalyzeRepository,
  bodyToAnalyzeRepositoryDetail,
  bodyToAnalyzeContribution,
  bodyToDetailedReport,
  responseFromAnalyzeRepository,
  responseFromAnalyzeRepositoryDetail,
  responseFromAnalyzeContribution,
  responseFromDetailedReport,
} from "../dtos/git.dto.js";

export const handleTestGit = async (req, res) => {
  /*
    #swagger.tags = ['Git']
    #swagger.summary = 'Git API 테스트'
    #swagger.description = 'Git API가 정상 동작하는지 테스트합니다.'

    #swagger.responses[200] = {
      description: '성공',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'SUCCESS' },
              error: { type: 'object', example: null },
              success: {
                type: 'object',
                properties: {
                  temp: { type: 'boolean', example: true }
                }
              }
            }
          }
        }
      }
    }
  */
  const result = {
    temp: true,
  };
  res.status(StatusCodes.OK).success(result);
};

export const handleAnalyzeRepository = async (req, res) => {
  /*
    #swagger.tags = ['Git']
    #swagger.summary = '레포지토리 분석'
    #swagger.description = 'GitHub 레포지토리를 클론하여 분석하고 파일에 AI 분석용 주석을 추가합니다.'

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              repoUrl: { type: 'string', example: 'https://github.com/owner/repo', description: 'GitHub 레포지토리 URL' },
              authorEmail: { type: 'string', example: 'user@email.com', description: '필터링할 작성자 이메일 (선택)' },
              cleanup: { type: 'boolean', example: true, description: '분석 후 임시 디렉토리 삭제 여부 (기본: true)' }
            },
            required: ['repoUrl']
          }
        }
      }
    }

    #swagger.responses[200] = {
      description: '분석 성공',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'SUCCESS' },
              error: { type: 'object', example: null },
              success: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Repository analyzed successfully' },
                  repository: {
                    type: 'object',
                    properties: {
                      owner: { type: 'string', example: 'owner' },
                      repo: { type: 'string', example: 'repo' }
                    }
                  },
                  summary: { type: 'object' },
                  processedFiles: { type: 'object' },
                  analysisPath: { type: 'string', nullable: true }
                }
              }
            }
          }
        }
      }
    }

    #swagger.responses[400] = {
      description: '잘못된 요청',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'FAIL' },
              error: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string', example: 'INVALID_REQUEST' },
                  reason: { type: 'string', example: 'repoUrl is required' },
                  data: { type: 'object', example: null }
                }
              },
              success: { type: 'object', example: null }
            }
          }
        }
      }
    }
  */
  const { repoUrl, authorEmail, cleanup } = bodyToAnalyzeRepository(req.body);

  const result = await analyzeRepository(repoUrl, authorEmail);

  if (cleanup) {
    cleanupDirectory(result.analysisPath);
    result.analysisPath = null;
  }

  res.status(StatusCodes.OK).success(responseFromAnalyzeRepository(result));
};

export const handleAnalyzeRepositoryDetail = async (req, res) => {
  /*
    #swagger.tags = ['Git']
    #swagger.summary = '레포지토리 상세 분석'
    #swagger.description = '레포지토리를 분석하고 파일 히스토리 상세 정보를 반환합니다.'

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              repoUrl: { type: 'string', example: 'https://github.com/owner/repo', description: 'GitHub 레포지토리 URL' },
              authorEmail: { type: 'string', example: 'user@email.com', description: '필터링할 작성자 이메일 (선택)' }
            },
            required: ['repoUrl']
          }
        }
      }
    }

    #swagger.responses[200] = {
      description: '분석 성공',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'SUCCESS' },
              error: { type: 'object', example: null },
              success: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Repository analyzed with full details' },
                  repository: { type: 'object' },
                  summary: { type: 'object' },
                  processedFiles: { type: 'object' },
                  fileHistory: { type: 'object', description: '파일별 수정 이력' }
                }
              }
            }
          }
        }
      }
    }

    #swagger.responses[400] = {
      description: '잘못된 요청',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'FAIL' },
              error: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string', example: 'INVALID_REQUEST' },
                  reason: { type: 'string', example: 'repoUrl is required' },
                  data: { type: 'object', example: null }
                }
              },
              success: { type: 'object', example: null }
            }
          }
        }
      }
    }
  */
  const { repoUrl, authorEmail } = bodyToAnalyzeRepositoryDetail(req.body);

  const result = await analyzeRepository(repoUrl, authorEmail);

  cleanupDirectory(result.analysisPath);

  res
    .status(StatusCodes.OK)
    .success(responseFromAnalyzeRepositoryDetail(result));
};

export const handleAnalyzeContribution = async (req, res) => {
  /*
    #swagger.tags = ['Git']
    #swagger.summary = 'AI 기여도 분석'
    #swagger.description = 'AI를 사용하여 특정 기여자의 기여도를 분석합니다.'

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              repoUrl: { type: 'string', example: 'https://github.com/owner/repo', description: 'GitHub 레포지토리 URL' },
              authorName: { type: 'string', example: 'John Doe', description: '분석할 기여자 이름' },
              authorEmail: { type: 'string', example: 'user@email.com', description: '기여자 이메일 (선택)' },
              depth: { type: 'integer', example: null, description: '클론 깊이 (null이면 전체 히스토리)' }
            },
            required: ['repoUrl', 'authorName']
          }
        }
      }
    }

    #swagger.responses[200] = {
      description: '분석 성공',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'SUCCESS' },
              error: { type: 'object', example: null },
              success: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Contribution analysis completed' },
                  repository: {
                    type: 'object',
                    properties: {
                      owner: { type: 'string', example: 'owner' },
                      repo: { type: 'string', example: 'repo' }
                    }
                  },
                  contributor: { type: 'string', example: 'John Doe' },
                  stats: {
                    type: 'object',
                    properties: {
                      totalCommits: { type: 'integer', example: 50 },
                      filesModified: { type: 'integer', example: 25 },
                      linesAdded: { type: 'integer', example: 1500 },
                      linesRemoved: { type: 'integer', example: 300 }
                    }
                  },
                  aiReport: {
                    type: 'object',
                    properties: {
                      summary: { type: 'string', example: '이 개발자는 백엔드 API 개발에 주력했습니다.' },
                      mainContributions: { type: 'array', items: { type: 'string' }, example: ['API 엔드포인트 구현', '데이터베이스 스키마 설계'] },
                      technicalAreas: { type: 'array', items: { type: 'string' }, example: ['Backend', 'Database'] },
                      codeQuality: { type: 'string', example: '코드 품질이 우수합니다.' },
                      impactLevel: { type: 'string', enum: ['high', 'medium', 'low'], example: 'high' },
                      recommendations: { type: 'string', example: '테스트 코드 작성을 권장합니다.' }
                    }
                  },
                  generatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
                  elapsedTimeSeconds: { type: 'number', example: 45.23 }
                }
              }
            }
          }
        }
      }
    }

    #swagger.responses[400] = {
      description: '잘못된 요청',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'FAIL' },
              error: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string', example: 'INVALID_REQUEST' },
                  reason: { type: 'string', example: 'authorName is required' },
                  data: { type: 'object', example: null }
                }
              },
              success: { type: 'object', example: null }
            }
          }
        }
      }
    }

    #swagger.responses[404] = {
      description: '기여 내역 없음',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'FAIL' },
              error: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string', example: 'NOT_FOUND' },
                  reason: { type: 'string', example: '"John Doe"의 기여 내역을 찾을 수 없습니다.' },
                  data: { type: 'object', example: null }
                }
              },
              success: { type: 'object', example: null }
            }
          }
        }
      }
    }
  */
  const { repoUrl, authorName, authorEmail, depth } = bodyToAnalyzeContribution(
    req.body,
  );

  const startTime = Date.now();
  const result = await analyzeContributorWithAI(
    repoUrl,
    authorName,
    authorEmail,
    depth,
  );
  const elapsedTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));

  res
    .status(StatusCodes.OK)
    .success(responseFromAnalyzeContribution(result, elapsedTime));
};

export const handleDetailedReport = async (req, res) => {
  /*
    #swagger.tags = ['Git']
    #swagger.summary = '상세 기여도 리포트 생성'
    #swagger.description = '10가지 항목을 포함한 상세 기여도 리포트를 생성합니다. (리포트 제목, 프로젝트 목표, 기술 스택, 프로젝트 규모, 구현 기능 상세, 내가 구현한 것, 구현하지 않은 것, 코드 분석 인사이트, 개선 가능한 영역, 다음 프로젝트 추천)'

    #swagger.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              repoUrl: { type: 'string', example: 'https://github.com/owner/repo', description: 'GitHub 레포지토리 URL' },
              authorName: { type: 'string', example: 'John Doe', description: '분석할 기여자 이름' },
              authorEmail: { type: 'string', example: 'user@email.com', description: '기여자 이메일 (선택)' },
              depth: { type: 'integer', example: null, description: '클론 깊이 (null이면 전체 히스토리)' }
            },
            required: ['repoUrl', 'authorName']
          }
        }
      }
    }

    #swagger.responses[200] = {
      description: '리포트 생성 성공',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'SUCCESS' },
              error: { type: 'object', example: null },
              success: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Detailed contribution report generated' },
                  repository: {
                    type: 'object',
                    properties: {
                      owner: { type: 'string', example: 'owner' },
                      repo: { type: 'string', example: 'repo' }
                    }
                  },
                  contributor: { type: 'string', example: 'John Doe' },
                  stats: {
                    type: 'object',
                    properties: {
                      totalCommits: { type: 'integer', description: '전체 커밋 수', example: 100 },
                      userCommits: { type: 'integer', description: '사용자 커밋 수', example: 50 },
                      filesModified: { type: 'integer', description: '수정한 파일 수', example: 25 },
                      linesAdded: { type: 'integer', description: '추가한 라인 수', example: 1500 },
                      linesRemoved: { type: 'integer', description: '삭제한 라인 수', example: 300 }
                    }
                  },
                  techStack: {
                    type: 'object',
                    description: '감지된 기술 스택',
                    properties: {
                      languages: { type: 'array', items: { type: 'string' }, example: ['JavaScript', 'TypeScript'] },
                      frameworks: { type: 'array', items: { type: 'string' }, example: ['Express.js', 'React'] },
                      libraries: { type: 'array', items: { type: 'string' }, example: ['Prisma', 'Axios'] },
                      databases: { type: 'array', items: { type: 'string' }, example: ['PostgreSQL'] },
                      tools: { type: 'array', items: { type: 'string' }, example: ['Docker', 'GitHub Actions'] }
                    }
                  },
                  projectScale: {
                    type: 'object',
                    description: '프로젝트 규모',
                    properties: {
                      totalCodeLines: { type: 'integer', example: 15000 },
                      totalCodeFiles: { type: 'integer', example: 120 },
                      fileTypeDistribution: { type: 'object', example: { '.js': 80, '.ts': 30, '.css': 10 } },
                      detectedCodeExtensions: { type: 'array', items: { type: 'string' }, example: ['.js', '.ts', '.jsx', '.css'], description: 'AI가 감지한 코드 파일 확장자 목록' },
                      developmentPeriod: {
                        type: 'object',
                        properties: {
                          startDate: { type: 'string', example: '2024-01-01' },
                          endDate: { type: 'string', example: '2024-03-15' },
                          totalDays: { type: 'integer', example: 74 },
                          totalWeeks: { type: 'integer', example: 11 }
                        }
                      }
                    }
                  },
                  architecture: {
                    type: 'object',
                    description: '아키텍처 정보 (AI 분석)',
                    properties: {
                      pattern: { type: 'string', example: 'Layered Architecture', description: 'AI가 분석한 아키텍처 패턴' },
                      patternDescription: { type: 'string', example: 'Controller-Service-Repository 계층 구조로 관심사를 분리한 아키텍처입니다.', description: '아키텍처 패턴 설명' },
                      directories: { type: 'array', items: { type: 'string' }, example: ['src', 'prisma', 'public'] },
                      structure: { type: 'object', example: { 'src': '소스 코드', 'prisma': '데이터베이스 스키마' }, description: '주요 디렉토리별 역할' },
                      layers: { type: 'array', items: { type: 'string' }, example: ['Controller Layer', 'Service Layer', 'Repository Layer'], description: '아키텍처 레이어' },
                      keyDirectories: {
                        type: 'array',
                        description: '주요 디렉토리 상세 정보',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string', example: 'controllers' },
                            role: { type: 'string', example: 'HTTP 요청 처리 및 응답 반환' },
                            contains: { type: 'string', example: 'Express 라우트 핸들러' }
                          }
                        }
                      },
                      treeText: { type: 'string', description: '디렉토리 트리 구조 텍스트', example: 'repo/\n├── src/\n│   ├── controllers/\n│   └── services/\n└── package.json' }
                    }
                  },
                  report: {
                    type: 'object',
                    description: 'AI 생성 상세 리포트',
                    properties: {
                      reportTitle: { type: 'string', description: '리포트 제목', example: 'owner/repo 프로젝트 기여도 분석 리포트' },
                      projectGoal: { type: 'string', description: '프로젝트 목표 (3줄 요약)', example: '이 프로젝트는 사용자의 GitHub 기여도를 분석하여 시각화하는 웹 애플리케이션입니다. AI를 활용하여 코드 품질과 개발 패턴을 분석합니다. 개발자의 포트폴리오 작성에 도움을 제공합니다.' },
                      techStack: {
                        type: 'object',
                        properties: {
                          framework: { type: 'array', items: { type: 'string' }, example: ['Express.js'] },
                          language: { type: 'array', items: { type: 'string' }, example: ['JavaScript'] },
                          library: { type: 'array', items: { type: 'string' }, example: ['Prisma', 'isomorphic-git'] },
                          database: { type: 'array', items: { type: 'string' }, example: ['PostgreSQL'] },
                          tools: { type: 'array', items: { type: 'string' }, example: ['Docker'] }
                        }
                      },
                      projectScale: {
                        type: 'object',
                        properties: {
                          totalCodeLines: { type: 'integer', example: 15000 },
                          mainCodeFiles: { type: 'integer', example: 45 },
                          developmentPeriod: { type: 'string', example: '2024.01.01 ~ 2024.03.15, 총 74일' },
                          architecturePattern: { type: 'string', example: 'Layered Architecture (Controller-Service-Repository)' }
                        }
                      },
                      implementedFeatures: {
                        type: 'array',
                        description: '구현 기능 상세 분석',
                        items: {
                          type: 'object',
                          properties: {
                            feature: { type: 'string', example: 'GitHub 레포지토리 분석' },
                            description: { type: 'string', example: 'GitHub 레포지토리를 클론하여 커밋 히스토리와 파일 변경 내역을 분석' },
                            codeLocation: { type: 'array', items: { type: 'string' }, example: ['src/services/git.service.js', 'src/controllers/git.controller.js'] },
                            implementationMethod: { type: 'string', example: 'isomorphic-git 라이브러리를 사용하여 서버사이드에서 Git 작업 수행' }
                          }
                        }
                      },
                      myContributions: { type: 'array', items: { type: 'string' }, description: '내가 구현한 것', example: ['Git 분석 서비스 구현', 'AI 리포트 생성 기능', 'API 엔드포인트 설계'] },
                      othersContributions: { type: 'array', items: { type: 'string' }, description: '구현하지 않은 것', example: ['인증 시스템', '프론트엔드 UI', '데이터베이스 스키마 설계'] },
                      codeAnalysisInsights: {
                        type: 'object',
                        description: '코드 분석 인사이트',
                        properties: {
                          codeQuality: { type: 'string', example: '모듈화가 잘 되어있고 함수별 책임이 명확합니다.' },
                          patterns: { type: 'array', items: { type: 'string' }, example: ['DTO 패턴', 'Repository 패턴', '에러 핸들링 미들웨어'] },
                          strengths: { type: 'array', items: { type: 'string' }, example: ['명확한 함수 분리', '일관된 에러 처리', 'JSDoc 주석 활용'] },
                          concerns: { type: 'array', items: { type: 'string' }, example: ['테스트 코드 부족', '일부 함수의 복잡도가 높음'] }
                        }
                      },
                      improvementAreas: {
                        type: 'array',
                        description: '개선 가능한 영역',
                        items: {
                          type: 'object',
                          properties: {
                            area: { type: 'string', example: '테스트 커버리지' },
                            currentState: { type: 'string', example: '테스트 코드가 없음' },
                            suggestion: { type: 'string', example: 'Jest를 사용하여 단위 테스트 추가 권장' }
                          }
                        }
                      },
                      recommendationsForNextProject: {
                        type: 'array',
                        description: '다음 프로젝트에서 시도해볼 것',
                        items: {
                          type: 'object',
                          properties: {
                            technology: { type: 'string', example: 'TypeScript' },
                            reason: { type: 'string', example: '타입 안정성을 통한 버그 예방 및 개발 생산성 향상' },
                            usedBy: { type: 'string', example: '다른 팀원이 일부 모듈에서 사용' }
                          }
                        }
                      }
                    }
                  },
                  summary: { type: 'object', description: '분석 요약' },
                  generatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.000Z' },
                  elapsedTimeSeconds: { type: 'number', example: 120.5 }
                }
              }
            }
          }
        }
      }
    }

    #swagger.responses[400] = {
      description: '잘못된 요청',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'FAIL' },
              error: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string', example: 'INVALID_REQUEST' },
                  reason: { type: 'string', example: 'authorName is required' },
                  data: { type: 'object', example: null }
                }
              },
              success: { type: 'object', example: null }
            }
          }
        }
      }
    }

    #swagger.responses[404] = {
      description: '기여 내역 없음',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              resultType: { type: 'string', example: 'FAIL' },
              error: {
                type: 'object',
                properties: {
                  errorCode: { type: 'string', example: 'NOT_FOUND' },
                  reason: { type: 'string', example: '"John Doe"의 기여 내역을 찾을 수 없습니다.' },
                  data: { type: 'object', example: null }
                }
              },
              success: { type: 'object', example: null }
            }
          }
        }
      }
    }
  */
  const { repoUrl, authorName, authorEmail, depth } = bodyToDetailedReport(
    req.body,
  );

  const startTime = Date.now();
  const result = await generateDetailedContributionReport(
    repoUrl,
    authorName,
    authorEmail,
    depth,
  );
  const elapsedTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));

  res
    .status(StatusCodes.OK)
    .success(responseFromDetailedReport(result, elapsedTime));
};
