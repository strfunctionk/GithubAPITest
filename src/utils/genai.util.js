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

/**
 * AI를 사용하여 코드 파일 확장자 판별
 * @param {Object} extensionSamples - 확장자별 샘플 정보
 * @returns {Promise<Array<string>>} - 코드 파일로 판단된 확장자 목록
 */
export const genaiDetectCodeExtensions = async (extensionSamples) => {
  const extensionList = Object.entries(extensionSamples)
    .map(([ext, data]) => {
      return `확장자: ${ext}
파일 수: ${data.count}
샘플 파일: ${data.sampleFile}
내용 미리보기:
\`\`\`
${data.preview}
\`\`\``;
    })
    .join("\n\n---\n\n");

  const prompt = `
당신은 소프트웨어 프로젝트의 파일 유형을 분석하는 전문가입니다.

다음은 프로젝트에 있는 파일 확장자와 각 확장자의 샘플 파일 내용입니다.
각 확장자가 "코드 파일"인지 판단해주세요.

코드 파일의 기준:
- 프로그래밍 언어로 작성된 소스 코드 (JavaScript, Python, Java, Go, Rust 등)
- 마크업/스타일시트 (HTML, CSS, SCSS, Vue, Svelte 등)
- 설정 파일 중 코드와 밀접한 것 (webpack.config.js 등)

코드 파일이 아닌 것:
- 순수 데이터 파일 (JSON, YAML, XML - 설정용은 제외)
- 문서 파일 (MD, TXT, PDF)
- 이미지, 폰트, 바이너리 파일
- 락 파일 (package-lock.json, yarn.lock)
- 환경 변수 파일 (.env)

=== 확장자 목록 ===
${extensionList}

위 확장자들 중에서 코드 파일로 판단되는 확장자만 JSON 배열로 반환해주세요.
예: [".js", ".ts", ".py", ".vue"]

중요: JSON 배열만 반환하세요. 다른 설명은 필요 없습니다.
`;

  const response = await ai.models.generateContent({
    model: genaiModels.GEMINI_2_5_FLASH,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.candidates[0].content.parts[0].text;
  const result = JSON.parse(text);

  // 배열인지 확인
  if (Array.isArray(result)) {
    return result;
  }

  // 객체에서 배열 추출 시도
  if (result.extensions) {
    return result.extensions;
  }
  if (result.codeExtensions) {
    return result.codeExtensions;
  }

  throw new Error("Invalid response format from AI");
};

/**
 * AI를 사용하여 프로젝트 아키텍처 분석
 * @param {string} treeText - 디렉토리 트리 텍스트
 * @param {Array<string>} directories - 루트 디렉토리 목록
 * @returns {Promise<Object>} - 아키텍처 분석 결과
 */
export const genaiAnalyzeArchitecture = async (treeText, directories) => {
  const prompt = `
당신은 소프트웨어 아키텍처 분석 전문가입니다.

다음은 프로젝트의 디렉토리 트리 구조입니다:

\`\`\`
${treeText}
\`\`\`

루트 디렉토리 목록: ${directories.join(", ")}

위 트리 구조를 분석하여 프로젝트의 아키텍처 패턴을 판단해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "pattern": "아키텍처 패턴 이름 (예: MVC, Layered Architecture, Clean Architecture, Component-based Architecture, Next.js App Router, Monorepo, Feature-based Architecture 등)",
  "patternDescription": "이 아키텍처 패턴에 대한 1-2문장 설명",
  "structure": {
    "설명": "각 주요 디렉토리의 역할을 key-value로 설명"
  },
  "layers": ["레이어1", "레이어2", "레이어3"],
  "keyDirectories": [
    {
      "name": "디렉토리 이름",
      "role": "이 디렉토리의 역할",
      "contains": "포함된 주요 파일/폴더 유형"
    }
  ]
}

아키텍처 패턴 판단 기준:
- MVC: controllers, models, views 폴더가 있음
- Layered Architecture: controllers, services, repositories 폴더가 있음
- Clean Architecture: domain, application, infrastructure 폴더가 있음
- Component-based Architecture: components, pages 폴더 위주 (React, Vue 등)
- Next.js App Router: app 폴더와 next.config.js가 있음
- Next.js Pages Router: pages 폴더와 next.config.js가 있음
- Monorepo: packages 또는 apps 폴더가 있음
- Feature-based Architecture: features 폴더가 있음
- Modular Architecture: modules 폴더가 있음
- Standard: 위 패턴에 해당하지 않는 일반적인 구조

중요: JSON 형식으로만 응답해주세요.
`;

  const response = await ai.models.generateContent({
    model: genaiModels.GEMINI_2_5_FLASH,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};

export const genaiContributionReport = async (contributorChanges, authorName, repoInfo) => {
  const filesList = Object.entries(contributorChanges.files)
    .map(([filePath, data]) => {
      const codeSnippets = data.changes
        .map((c) => {
          const added = c.added.join("\n");
          const removed = c.removed.join("\n");
          return `[${c.date}] ${c.message}\n추가된 코드:\n${added || "(없음)"}\n삭제된 코드:\n${removed || "(없음)"}`;
        })
        .join("\n---\n");

      return `파일: ${filePath}\n커밋 수: ${data.commits}\n${codeSnippets}`;
    })
    .join("\n\n===\n\n");

  const prompt = `
당신은 소프트웨어 개발 기여도를 분석하는 전문가입니다.

다음은 "${authorName}"이(가) "${repoInfo.owner}/${repoInfo.repo}" 레포지토리에서 수정한 파일과 코드 변경 내용입니다.

=== 변경 정보 ===
총 추가 라인: ${contributorChanges.totalAdded}
총 삭제 라인: ${contributorChanges.totalRemoved}
수정한 파일 수: ${Object.keys(contributorChanges.files).length}

커밋 메시지 목록:
${contributorChanges.commitMessages.join("\n")}

=== 파일별 코드 변경 ===
${filesList}

위 정보를 바탕으로 "${authorName}"의 기여도를 분석해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "summary": "이 개발자의 전체적인 기여 요약 (2-3문장)",
  "mainContributions": ["주요 기여 1", "주요 기여 2", "주요 기여 3"],
  "technicalAreas": ["담당 기술 영역 1", "담당 기술 영역 2"],
  "codeQuality": "코드 품질에 대한 평가 (1문장)",
  "impactLevel": "high/medium/low 중 하나",
  "recommendations": "이 개발자에게 추천하는 개선점 (1문장)"
}
`;

  const response = await ai.models.generateContent({
    model: genaiModels.GEMINI_2_5_FLASH,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};

/**
 * 상세 기여도 리포트 생성 (10가지 항목 포함)
 * @param {Object} data - 분석 데이터
 * @returns {Promise<Object>} - AI 분석 리포트
 */
export const genaiDetailedContributionReport = async (data) => {
  const {
    repoInfo,
    authorName,
    techStack,
    projectScale,
    architecture,
    myContributions,
    othersContributions,
    contributorChanges,
    allCommits,
    userCommits,
  } = data;

  // 내가 기여한 파일 목록 (코드 변경 내용 포함)
  const myFilesList = Object.entries(contributorChanges.files)
    .slice(0, 30) // 토큰 제한을 위해 30개로 제한
    .map(([filePath, fileData]) => {
      const codeSnippets = fileData.changes
        .slice(0, 3) // 파일당 최대 3개 커밋
        .map((c) => {
          const addedPreview = c.added.slice(0, 10).join("\n");
          const removedPreview = c.removed.slice(0, 5).join("\n");
          return `[${c.date}] ${c.message}\n+추가:\n${addedPreview || "(없음)"}\n-삭제:\n${removedPreview || "(없음)"}`;
        })
        .join("\n---\n");

      return `파일: ${filePath}\n커밋 수: ${fileData.commits}\n${codeSnippets}`;
    })
    .join("\n\n===\n\n");

  // 다른 사람이 기여한 파일 요약
  const othersFilesList = Object.entries(othersContributions.files)
    .slice(0, 20)
    .map(([filePath, data]) => `${filePath} (작성자: ${data.authors.join(", ")}, 커밋: ${data.commits})`)
    .join("\n");

  // 다른 기여자들의 기여 요약
  const otherContributorsSummary = Object.entries(othersContributions.contributors)
    .map(([name, data]) => `${name}: ${data.commits}커밋, ${data.files.length}파일`)
    .join("\n");

  const prompt = `
당신은 소프트웨어 개발 프로젝트의 기여도를 분석하고 상세한 리포트를 작성하는 전문가입니다.

다음은 "${authorName}"이(가) "${repoInfo.owner}/${repoInfo.repo}" 레포지토리에서 기여한 내용과 프로젝트 정보입니다.

=== 프로젝트 정보 ===
- 레포지토리: ${repoInfo.owner}/${repoInfo.repo}
- 전체 커밋 수: ${allCommits}
- ${authorName}의 커밋 수: ${userCommits}
- 기여 비율: ${((userCommits / allCommits) * 100).toFixed(1)}%

=== 기술 스택 ===
- 언어: ${techStack.languages.join(", ") || "감지 안됨"}
- 프레임워크: ${techStack.frameworks.join(", ") || "감지 안됨"}
- 라이브러리: ${techStack.libraries.join(", ") || "감지 안됨"}
- 데이터베이스: ${techStack.databases.join(", ") || "감지 안됨"}
- 도구: ${techStack.tools.join(", ") || "감지 안됨"}

=== 프로젝트 규모 ===
- 총 코드 라인: ${projectScale.totalCodeLines}
- 총 코드 파일 수: ${projectScale.totalCodeFiles}
- 개발 기간: ${projectScale.developmentPeriod?.startDate || "N/A"} ~ ${projectScale.developmentPeriod?.endDate || "N/A"} (${projectScale.developmentPeriod?.totalDays || 0}일)

=== 아키텍처 ===
- 패턴: ${architecture.pattern}
- 주요 디렉토리: ${architecture.directories.join(", ")}

=== 프로젝트 디렉토리 트리 구조 ===
\`\`\`
${architecture.treeText || "트리 구조를 생성할 수 없습니다."}
\`\`\`

=== ${authorName}의 코드 변경 통계 ===
- 총 추가 라인: ${contributorChanges.totalAdded}
- 총 삭제 라인: ${contributorChanges.totalRemoved}
- 수정한 파일 수: ${Object.keys(contributorChanges.files).length}

=== ${authorName}의 커밋 메시지 ===
${contributorChanges.commitMessages.slice(0, 30).join("\n")}

=== ${authorName}이(가) 수정한 파일 및 코드 변경 ===
${myFilesList}

=== 다른 기여자들이 작업한 파일 ===
${othersFilesList}

=== 다른 기여자들의 기여 요약 ===
${otherContributorsSummary}

위 정보를 바탕으로 "${authorName}"의 기여도를 분석하여 다음 10가지 항목을 포함한 상세 리포트를 JSON 형식으로 작성해주세요.

{
  "reportTitle": "리포트 제목 (레포지토리 이름을 포함한 제목)",
  "projectGoal": "프로젝트 목표 (3줄 정도의 프로젝트 요약. 코드를 분석하여 이 프로젝트가 무엇을 하는 프로젝트인지 설명)",
  "techStack": {
    "framework": ["사용된 프레임워크들"],
    "language": ["사용된 언어들"],
    "library": ["사용된 라이브러리들"],
    "database": ["사용된 데이터베이스들"],
    "tools": ["사용된 도구들"]
  },
  "projectScale": {
    "totalCodeLines": 총코드라인수,
    "mainCodeFiles": 주요코드파일수,
    "developmentPeriod": "개발 기간 (예: 2024.01.01 ~ 2024.03.15, 총 74일)",
    "architecturePattern": "아키텍처 패턴 설명"
  },
  "implementedFeatures": [
    {
      "feature": "구현한 기능 이름",
      "description": "구현 내용 설명",
      "codeLocation": ["관련 파일 경로들"],
      "implementationMethod": "구현 방식 설명 (어떤 기술/패턴을 사용했는지)"
    }
  ],
  "myContributions": ["${authorName}이(가) 담당한 주요 기능/역할 목록"],
  "othersContributions": ["${authorName}이(가) 구현하지 않은, 다른 팀원이 담당한 기능/역할 목록"],
  "codeAnalysisInsights": {
    "codeQuality": "코드 품질에 대한 분석",
    "patterns": ["사용된 디자인 패턴이나 코딩 패턴"],
    "strengths": ["코드의 강점"],
    "concerns": ["우려되는 점"]
  },
  "improvementAreas": [
    {
      "area": "개선 가능한 영역",
      "currentState": "현재 상태",
      "suggestion": "개선 제안"
    }
  ],
  "recommendationsForNextProject": [
    {
      "technology": "다음 프로젝트에서 시도해볼 기술/방법",
      "reason": "추천 이유",
      "usedBy": "이 프로젝트에서 누가 사용했는지 (해당되는 경우)"
    }
  ]
}

중요:
- 실제 코드 변경 내용을 분석하여 구체적인 기능과 구현 방식을 파악해주세요.
- 커밋 메시지와 파일 경로를 분석하여 어떤 기능을 담당했는지 정확히 파악해주세요.
- 다른 기여자들이 사용한 기술 중 ${authorName}이(가) 사용하지 않은 것을 추천해주세요.
- JSON 형식으로만 응답해주세요.
`;

  const response = await ai.models.generateContent({
    model: genaiModels.GEMINI_2_5_FLASH,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};
