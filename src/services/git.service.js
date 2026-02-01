import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import fs from "fs";
import path from "path";
import os from "os";
import {
  genaiContributionReport,
  genaiDetailedContributionReport,
  genaiAnalyzeArchitecture,
} from "../utils/genai.util.js";
import { InvalidRequestError, NotFoundError } from "../errors/auth.error.js";
import {
  GitHubAuthError,
  GitHubRepoNotFoundError,
} from "../errors/github.error.js";
import {
  getTrackedFiles,
  detectCodeExtensions,
  buildProjectTree,
  generateAIComment,
} from "../utils/git.util.js";

const GITHUB_TOKEN = process.env.GITHUB_BEARER_TOKEN;

/**
 * GitHub 레포지토리 URL을 파싱하여 owner와 repo 추출
 * @param {string} repoUrl - GitHub 레포지토리 URL (예: https://github.com/owner/repo)
 * @returns {{owner: string, repo: string}}
 */
export const parseRepoUrl = (repoUrl) => {
  if (!repoUrl) {
    throw new InvalidRequestError("repoUrl is required");
  }

  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new InvalidRequestError(
      "Invalid GitHub repository URL format. Expected: https://github.com/owner/repo",
    );
  }
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
};

/**
 * GitHub 레포지토리를 임시 디렉토리에 클론
 * @param {string} repoUrl - GitHub 레포지토리 URL
 * @param {number|null} [depth] - 클론 깊이 (null이면 전체 히스토리)
 * @returns {Promise<string>} - 클론된 디렉토리 경로
 */
export const cloneRepository = async (repoUrl, depth = null) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const tempDir = path.join(
    os.tmpdir(),
    `git-analysis-${owner}-${repo}-${Date.now()}`,
  );

  fs.mkdirSync(tempDir, { recursive: true });

  const cloneUrl = `https://github.com/${owner}/${repo}.git`;

  const cloneOptions = {
    fs,
    http,
    dir: tempDir,
    url: cloneUrl,
    ref: "main",
    singleBranch: true,
    onAuth: () => ({
      username: "x-access-token",
      password: GITHUB_TOKEN,
    }),
  };

  // depth가 지정된 경우에만 추가 (null이면 전체 히스토리)
  if (depth !== null && depth > 0) {
    cloneOptions.depth = depth;
  }

  try {
    await git.clone(cloneOptions);
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true, force: true });

    if (
      error.message.includes("Authentication") ||
      error.message.includes("401")
    ) {
      throw new GitHubAuthError(
        "GitHub authentication failed. Please check GITHUB_BEARER_TOKEN",
      );
    }

    if (error.message.includes("not found") || error.message.includes("404")) {
      throw new GitHubRepoNotFoundError(
        "Repository not found or access denied",
      );
    }

    throw error;
  }

  return tempDir;
};

/**
 * 특정 사용자의 커밋 내역 조회
 * @param {string} dir - 레포지토리 디렉토리
 * @param {string} [authorEmail] - 필터링할 작성자 이메일 (선택)
 * @returns {Promise<Array>} - 커밋 목록
 */
export const getCommitHistory = async (dir, authorEmail = null) => {
  const commits = await git.log({
    fs,
    dir,
    ref: "main",
  });

  if (authorEmail) {
    return commits.filter(
      (commit) => commit.commit.author.email === authorEmail,
    );
  }

  return commits;
};

/**
 * 두 커밋 간의 변경된 파일 목록 조회
 * @param {string} dir - 레포지토리 디렉토리
 * @param {string} commitHash1 - 이전 커밋 해시
 * @param {string} commitHash2 - 현재 커밋 해시
 * @returns {Promise<Array>} - 변경된 파일 목록
 */
export const getChangedFiles = async (dir, commitHash1, commitHash2) => {
  const changes = [];

  const tree1 = commitHash1
    ? await git.readTree({ fs, dir, oid: commitHash1 })
    : { tree: [] };
  const tree2 = await git.readTree({ fs, dir, oid: commitHash2 });

  const getTreeEntries = async (treeResult, prefix = "") => {
    const entries = {};
    for (const entry of treeResult.tree) {
      const fullPath = prefix ? `${prefix}/${entry.path}` : entry.path;
      if (entry.type === "blob") {
        entries[fullPath] = entry.oid;
      } else if (entry.type === "tree") {
        const subTree = await git.readTree({ fs, dir, oid: entry.oid });
        const subEntries = await getTreeEntries(
          { tree: subTree.tree },
          fullPath,
        );
        Object.assign(entries, subEntries);
      }
    }
    return entries;
  };

  const entries1 = commitHash1 ? await getTreeEntries(tree1) : {};
  const entries2 = await getTreeEntries(tree2);

  const allPaths = new Set([
    ...Object.keys(entries1),
    ...Object.keys(entries2),
  ]);

  for (const filePath of allPaths) {
    const oid1 = entries1[filePath];
    const oid2 = entries2[filePath];

    if (!oid1 && oid2) {
      changes.push({ path: filePath, status: "added" });
    } else if (oid1 && !oid2) {
      changes.push({ path: filePath, status: "deleted" });
    } else if (oid1 !== oid2) {
      changes.push({ path: filePath, status: "modified" });
    }
  }

  return changes;
};

/**
 * 두 커밋 간의 파일 diff(실제 코드 변경 내용) 조회
 * @param {string} dir - 레포지토리 디렉토리
 * @param {string} commitHash1 - 이전 커밋 해시 (null이면 빈 상태)
 * @param {string} commitHash2 - 현재 커밋 해시
 * @param {string} filePath - 파일 경로
 * @returns {Promise<Object>} - diff 정보 (added, removed 라인)
 */
export const getFileDiff = async (dir, commitHash1, commitHash2, filePath) => {
  try {
    let oldContent = "";
    let newContent = "";

    // 이전 커밋의 파일 내용
    if (commitHash1) {
      try {
        const { blob } = await git.readBlob({
          fs,
          dir,
          oid: commitHash1,
          filepath: filePath,
        });
        oldContent = new TextDecoder().decode(blob);
      } catch {
        oldContent = "";
      }
    }

    // 현재 커밋의 파일 내용
    try {
      const { blob } = await git.readBlob({
        fs,
        dir,
        oid: commitHash2,
        filepath: filePath,
      });
      newContent = new TextDecoder().decode(blob);
    } catch {
      newContent = "";
    }

    const oldLines = oldContent.split("\n");
    const newLines = newContent.split("\n");

    // 간단한 diff: 추가/삭제된 라인 추출
    const oldSet = new Set(oldLines);
    const newSet = new Set(newLines);

    const added = newLines.filter((line) => !oldSet.has(line) && line.trim());
    const removed = oldLines.filter((line) => !newSet.has(line) && line.trim());

    return {
      added,
      removed,
      totalAdded: added.length,
      totalRemoved: removed.length,
    };
  } catch (error) {
    return { added: [], removed: [], totalAdded: 0, totalRemoved: 0 };
  }
};

/**
 * 파일별 수정 이력 분석 (diff 포함)
 * @param {string} dir - 레포지토리 디렉토리
 * @param {string} [authorEmail] - 필터링할 작성자 이메일 (선택)
 * @param {boolean} [includeDiff] - diff 포함 여부 (기본 false)
 * @returns {Promise<Object>} - 파일별 수정 이력
 */
export const analyzeFileHistory = async (
  dir,
  authorEmail = null,
  includeDiff = false,
) => {
  const commits = await getCommitHistory(dir, authorEmail);
  const fileHistory = {};

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const parentCommit = commits[i + 1];

    try {
      const changedFiles = await getChangedFiles(
        dir,
        parentCommit?.oid || null,
        commit.oid,
      );

      for (const file of changedFiles) {
        if (!fileHistory[file.path]) {
          fileHistory[file.path] = [];
        }

        const entry = {
          commitHash: commit.oid.substring(0, 7),
          message: commit.commit.message.trim(),
          author: commit.commit.author.name,
          email: commit.commit.author.email,
          date: new Date(commit.commit.author.timestamp * 1000).toISOString(),
          status: file.status,
        };

        // diff 포함 옵션이 활성화된 경우
        if (includeDiff) {
          const diff = await getFileDiff(
            dir,
            parentCommit?.oid || null,
            commit.oid,
            file.path,
          );
          entry.diff = diff;
        }

        fileHistory[file.path].push(entry);
      }
    } catch (error) {
      console.error(`Error processing commit ${commit.oid}:`, error.message);
    }
  }

  return fileHistory;
};

/**
 * 파일 상단에 AI 분석용 주석 추가
 * @param {string} dir - 레포지토리 디렉토리
 * @param {Object} fileHistory - 파일별 수정 이력
 * @returns {Promise<Object>} - 처리된 파일 정보
 */
export const addCommentsToFiles = async (dir, fileHistory) => {
  const processedFiles = {};
  const skipExtensions = [
    ".json",
    ".lock",
    ".png",
    ".jpg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".ttf",
    ".eot",
  ];

  for (const [filePath, history] of Object.entries(fileHistory)) {
    const ext = path.extname(filePath).toLowerCase();

    if (skipExtensions.includes(ext)) {
      continue;
    }

    const fullPath = path.join(dir, filePath);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const comment = generateAIComment(history, filePath);
      const newContent = comment + "\n\n" + content;

      fs.writeFileSync(fullPath, newContent, "utf-8");

      processedFiles[filePath] = {
        modificationsCount: history.length,
        commentAdded: true,
      };
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
      processedFiles[filePath] = {
        modificationsCount: history.length,
        commentAdded: false,
        error: error.message,
      };
    }
  }

  return processedFiles;
};

/**
 * 레포지토리 분석 요약 생성
 * @param {Object} fileHistory - 파일별 수정 이력
 * @param {Array} commits - 커밋 목록
 * @returns {Object} - 분석 요약
 */
export const generateAnalysisSummary = (fileHistory, commits) => {
  const contributors = {};
  const fileTypes = {};

  for (const [filePath, history] of Object.entries(fileHistory)) {
    const ext = path.extname(filePath).toLowerCase() || "no-extension";
    fileTypes[ext] = (fileTypes[ext] || 0) + history.length;

    for (const entry of history) {
      if (!contributors[entry.author]) {
        contributors[entry.author] = {
          email: entry.email,
          commits: 0,
          filesModified: new Set(),
        };
      }
      contributors[entry.author].commits++;
      contributors[entry.author].filesModified.add(filePath);
    }
  }

  const contributorSummary = Object.entries(contributors)
    .map(([name, data]) => ({
      name,
      email: data.email,
      commits: data.commits,
      filesModified: data.filesModified.size,
    }))
    .sort((a, b) => b.commits - a.commits);

  return {
    totalCommits: commits.length,
    totalFilesAnalyzed: Object.keys(fileHistory).length,
    contributors: contributorSummary,
    fileTypeDistribution: fileTypes,
    dateRange: {
      oldest: commits[commits.length - 1]?.commit.author.timestamp
        ? new Date(
            commits[commits.length - 1].commit.author.timestamp * 1000,
          ).toISOString()
        : null,
      newest: commits[0]?.commit.author.timestamp
        ? new Date(commits[0].commit.author.timestamp * 1000).toISOString()
        : null,
    },
  };
};

/**
 * 임시 디렉토리 정리
 * @param {string} dir - 삭제할 디렉토리
 */
export const cleanupDirectory = (dir) => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * 전체 레포지토리 분석 프로세스 실행
 * @param {string} repoUrl - GitHub 레포지토리 URL
 * @param {string} [authorEmail] - 필터링할 작성자 이메일 (선택)
 * @param {number|null} [depth] - 클론 깊이 (null이면 전체 히스토리)
 * @returns {Promise<Object>} - 분석 결과
 */
export const analyzeRepository = async (
  repoUrl,
  authorEmail = null,
  depth = null,
) => {
  let tempDir = null;

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    tempDir = await cloneRepository(repoUrl, depth);

    const commits = await getCommitHistory(tempDir, authorEmail);

    const fileHistory = await analyzeFileHistory(tempDir, authorEmail);

    const processedFiles = await addCommentsToFiles(tempDir, fileHistory);

    const summary = generateAnalysisSummary(fileHistory, commits);

    return {
      repository: { owner, repo },
      analysisPath: tempDir,
      summary,
      processedFiles,
      fileHistory,
    };
  } catch (error) {
    if (tempDir) {
      cleanupDirectory(tempDir);
    }
    throw error;
  }
};

/**
 * 기여자별 코드 변경 정보를 수집
 * @param {Object} fileHistory - 파일별 수정 이력 (diff 포함)
 * @param {string} authorName - 분석할 기여자 이름
 * @returns {Object} - 기여자의 코드 변경 정보
 */
const collectContributorChanges = (fileHistory, authorName) => {
  const changes = {
    files: {},
    totalAdded: 0,
    totalRemoved: 0,
    commitMessages: [],
  };

  for (const [filePath, history] of Object.entries(fileHistory)) {
    const authorEntries = history.filter((h) => h.author === authorName);

    if (authorEntries.length > 0) {
      changes.files[filePath] = {
        commits: authorEntries.length,
        changes: authorEntries.map((e) => ({
          message: e.message.split("\n")[0],
          date: e.date.split("T")[0],
          status: e.status,
          added: e.diff?.added || [],
          removed: e.diff?.removed || [],
        })),
      };

      for (const entry of authorEntries) {
        changes.totalAdded += entry.diff?.totalAdded || 0;
        changes.totalRemoved += entry.diff?.totalRemoved || 0;
        changes.commitMessages.push(entry.message.split("\n")[0]);
      }
    }
  }

  return changes;
};

/**
 * GenAI를 사용하여 기여도 분석 리포트 생성
 * @param {Object} contributorChanges - 기여자의 코드 변경 정보
 * @param {string} authorName - 기여자 이름
 * @param {Object} repoInfo - 레포지토리 정보
 * @returns {Promise<Object>} - AI 분석 리포트
 */
export const generateContributionReport = async (
  contributorChanges,
  authorName,
  repoInfo,
) => {
  return genaiContributionReport(contributorChanges, authorName, repoInfo);
};

/**
 * AI 기반 전체 레포지토리 기여도 분석
 * @param {string} repoUrl - GitHub 레포지토리 URL
 * @param {string} authorName - 분석할 기여자 이름
 * @param {string} [authorEmail] - 기여자 이메일 (선택)
 * @param {number|null} [depth] - 클론 깊이 (null이면 전체 히스토리)
 * @returns {Promise<Object>} - AI 분석 결과
 */
export const analyzeContributorWithAI = async (
  repoUrl,
  authorName,
  authorEmail = null,
  depth = null,
) => {
  if (!authorName) {
    throw new InvalidRequestError("authorName is required");
  }

  let tempDir = null;

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    tempDir = await cloneRepository(repoUrl, depth);

    const commits = await getCommitHistory(tempDir, authorEmail);

    // diff 포함하여 파일 히스토리 분석
    const fileHistory = await analyzeFileHistory(tempDir, authorEmail, true);

    // 기여자의 코드 변경 정보 수집
    const contributorChanges = collectContributorChanges(
      fileHistory,
      authorName,
    );

    if (Object.keys(contributorChanges.files).length === 0) {
      cleanupDirectory(tempDir);
      throw new NotFoundError(
        `"${authorName}"의 기여 내역을 찾을 수 없습니다.`,
      );
    }

    // AI 분석 리포트 생성
    const aiReport = await generateContributionReport(
      contributorChanges,
      authorName,
      { owner, repo },
    );

    const summary = generateAnalysisSummary(fileHistory, commits);

    cleanupDirectory(tempDir);

    return {
      repository: { owner, repo },
      contributor: authorName,
      stats: {
        totalCommits: commits.length,
        filesModified: Object.keys(contributorChanges.files).length,
        linesAdded: contributorChanges.totalAdded,
        linesRemoved: contributorChanges.totalRemoved,
      },
      aiReport,
      summary,
    };
  } catch (error) {
    if (tempDir) {
      cleanupDirectory(tempDir);
    }
    throw error;
  }
};

/**
 * 기술 스택 자동 감지
 * @param {string} dir - 레포지토리 디렉토리
 * @returns {Promise<Object>} - 감지된 기술 스택
 */
export const detectTechStack = async (dir) => {
  const techStack = {
    languages: [],
    frameworks: [],
    libraries: [],
    tools: [],
    databases: [],
  };

  const extensionToLanguage = {
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".py": "Python",
    ".java": "Java",
    ".kt": "Kotlin",
    ".swift": "Swift",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cs": "C#",
    ".cpp": "C++",
    ".c": "C",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sass": "Sass",
    ".less": "Less",
    ".vue": "Vue.js",
    ".svelte": "Svelte",
  };

  // 파일 확장자 기반 언어 감지
  const languageCounts = {};
  const scanDir = (dirPath) => {
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "vendor"
        ) {
          continue;
        }
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensionToLanguage[ext]) {
            languageCounts[extensionToLanguage[ext]] =
              (languageCounts[extensionToLanguage[ext]] || 0) + 1;
          }
        }
      }
    } catch (error) {
      // 권한 오류 등 무시
    }
  };
  scanDir(dir);

  techStack.languages = Object.entries(languageCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  // package.json 분석 (Node.js 프로젝트)
  const packageJsonPath = path.join(dir, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const frameworkMap = {
        next: "Next.js",
        react: "React",
        vue: "Vue.js",
        nuxt: "Nuxt.js",
        express: "Express.js",
        fastify: "Fastify",
        koa: "Koa",
        nestjs: "NestJS",
        "@nestjs/core": "NestJS",
        angular: "Angular",
        "@angular/core": "Angular",
        svelte: "Svelte",
        gatsby: "Gatsby",
        remix: "Remix",
        electron: "Electron",
      };

      const libraryMap = {
        axios: "Axios",
        lodash: "Lodash",
        moment: "Moment.js",
        dayjs: "Day.js",
        redux: "Redux",
        zustand: "Zustand",
        recoil: "Recoil",
        prisma: "Prisma",
        "@prisma/client": "Prisma",
        mongoose: "Mongoose",
        sequelize: "Sequelize",
        typeorm: "TypeORM",
        tailwindcss: "Tailwind CSS",
        "styled-components": "Styled Components",
        "@emotion/react": "Emotion",
        jest: "Jest",
        mocha: "Mocha",
        vitest: "Vitest",
        cypress: "Cypress",
        playwright: "Playwright",
      };

      const dbMap = {
        pg: "PostgreSQL",
        mysql: "MySQL",
        mysql2: "MySQL",
        mongodb: "MongoDB",
        redis: "Redis",
        sqlite3: "SQLite",
        "better-sqlite3": "SQLite",
      };

      for (const dep of Object.keys(allDeps)) {
        if (frameworkMap[dep]) {
          techStack.frameworks.push(frameworkMap[dep]);
        }
        if (libraryMap[dep]) {
          techStack.libraries.push(libraryMap[dep]);
        }
        if (dbMap[dep]) {
          techStack.databases.push(dbMap[dep]);
        }
      }
    } catch (error) {
      // JSON 파싱 오류 무시
    }
  }

  // requirements.txt 분석 (Python 프로젝트)
  const requirementsPath = path.join(dir, "requirements.txt");
  if (fs.existsSync(requirementsPath)) {
    try {
      const content = fs.readFileSync(requirementsPath, "utf-8");
      const pythonFrameworks = {
        django: "Django",
        flask: "Flask",
        fastapi: "FastAPI",
        tornado: "Tornado",
        pyramid: "Pyramid",
      };
      const pythonLibs = {
        pandas: "Pandas",
        numpy: "NumPy",
        tensorflow: "TensorFlow",
        pytorch: "PyTorch",
        "scikit-learn": "Scikit-learn",
        sqlalchemy: "SQLAlchemy",
      };

      const lines = content.toLowerCase().split("\n");
      for (const line of lines) {
        const pkg = line.split("==")[0].split(">=")[0].trim();
        if (pythonFrameworks[pkg]) {
          techStack.frameworks.push(pythonFrameworks[pkg]);
        }
        if (pythonLibs[pkg]) {
          techStack.libraries.push(pythonLibs[pkg]);
        }
      }
    } catch (error) {
      // 파일 읽기 오류 무시
    }
  }

  // Docker, CI/CD 도구 감지
  if (
    fs.existsSync(path.join(dir, "Dockerfile")) ||
    fs.existsSync(path.join(dir, "docker-compose.yml"))
  ) {
    techStack.tools.push("Docker");
  }
  if (fs.existsSync(path.join(dir, ".github/workflows"))) {
    techStack.tools.push("GitHub Actions");
  }
  if (fs.existsSync(path.join(dir, ".gitlab-ci.yml"))) {
    techStack.tools.push("GitLab CI");
  }
  if (fs.existsSync(path.join(dir, "Jenkinsfile"))) {
    techStack.tools.push("Jenkins");
  }

  // 중복 제거
  techStack.languages = [...new Set(techStack.languages)];
  techStack.frameworks = [...new Set(techStack.frameworks)];
  techStack.libraries = [...new Set(techStack.libraries)];
  techStack.tools = [...new Set(techStack.tools)];
  techStack.databases = [...new Set(techStack.databases)];

  return techStack;
};

/**
 * 프로젝트 규모 분석 (동적 코드 확장자 감지)
 * @param {string} dir - 레포지토리 디렉토리
 * @param {Array} commits - 커밋 목록
 * @param {Array<string>} [codeExtensions] - 코드 파일 확장자 목록 (없으면 자동 감지)
 * @returns {Promise<Object>} - 프로젝트 규모 정보
 */
export const analyzeProjectScale = async (
  dir,
  commits,
  codeExtensions = null,
) => {
  // 코드 확장자가 제공되지 않으면 AI로 감지
  const extensions = codeExtensions || (await detectCodeExtensions(dir));

  let totalLines = 0;
  let totalFiles = 0;
  const fileTypeCounts = {};

  // Git이 추적하는 파일 기반으로 분석
  const trackedFiles = await getTrackedFiles(dir);

  for (const file of trackedFiles) {
    // 불필요한 디렉토리 제외
    if (
      file.includes("node_modules/") ||
      file.includes("vendor/") ||
      file.includes("dist/") ||
      file.includes("build/")
    ) {
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    if (extensions.includes(ext)) {
      totalFiles++;
      fileTypeCounts[ext] = (fileTypeCounts[ext] || 0) + 1;

      try {
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, "utf-8");
        totalLines += content.split("\n").length;
      } catch {
        // 파일 읽기 오류 무시
      }
    }
  }

  // 개발 기간 계산
  let developmentPeriod = null;
  if (commits.length > 0) {
    const oldestTimestamp =
      commits[commits.length - 1]?.commit.author.timestamp * 1000;
    const newestTimestamp = commits[0]?.commit.author.timestamp * 1000;
    const diffDays = Math.ceil(
      (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24),
    );
    developmentPeriod = {
      startDate: new Date(oldestTimestamp).toISOString().split("T")[0],
      endDate: new Date(newestTimestamp).toISOString().split("T")[0],
      totalDays: diffDays,
      totalWeeks: Math.ceil(diffDays / 7),
    };
  }

  return {
    totalCodeLines: totalLines,
    totalCodeFiles: totalFiles,
    fileTypeDistribution: fileTypeCounts,
    detectedCodeExtensions: extensions,
    developmentPeriod,
  };
};

/**
 * 프로젝트 아키텍처 구조 분석 (AI 기반)
 * @param {string} dir - 레포지토리 디렉토리
 * @returns {Promise<Object>} - 아키텍처 정보
 */
export const analyzeArchitecture = async (dir) => {
  // 루트 디렉토리 스캔
  let directories = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    directories = entries
      .filter(
        (e) =>
          e.isDirectory() &&
          !e.name.startsWith(".") &&
          e.name !== "node_modules",
      )
      .map((e) => e.name);
  } catch (error) {
    // 디렉토리 읽기 오류 무시
  }

  // 전체 트리 구조 생성
  const { tree, treeText } = buildProjectTree(dir);

  // AI에게 트리 구조를 분석하도록 요청
  try {
    const aiAnalysis = await genaiAnalyzeArchitecture(treeText, directories);

    return {
      pattern: aiAnalysis.pattern,
      patternDescription: aiAnalysis.patternDescription,
      directories,
      structure: aiAnalysis.structure,
      layers: aiAnalysis.layers,
      keyDirectories: aiAnalysis.keyDirectories,
      treeText,
    };
  } catch (error) {
    console.error("AI 아키텍처 분석 실패:", error.message);
    // 폴백: 기본 분석
    return {
      pattern: "unknown",
      patternDescription: "아키텍처 패턴을 분석할 수 없습니다.",
      directories,
      structure: {},
      layers: [],
      keyDirectories: [],
      treeText,
    };
  }
};

/**
 * 기여자별 기능 분류
 * @param {Object} fileHistory - 파일별 수정 이력
 * @param {string} targetAuthor - 분석할 기여자 이름
 * @returns {Object} - 기여한/기여하지 않은 기능 분류
 */
export const classifyContributions = (fileHistory, targetAuthor) => {
  const myContributions = {
    files: {},
    features: [],
  };
  const othersContributions = {
    files: {},
    contributors: {},
  };

  for (const [filePath, history] of Object.entries(fileHistory)) {
    const myEntries = history.filter((h) => h.author === targetAuthor);
    const othersEntries = history.filter((h) => h.author !== targetAuthor);

    if (myEntries.length > 0) {
      myContributions.files[filePath] = {
        commits: myEntries.length,
        messages: myEntries.map((e) => e.message.split("\n")[0]),
        dates: myEntries.map((e) => e.date.split("T")[0]),
      };
    }

    if (othersEntries.length > 0) {
      othersContributions.files[filePath] = {
        commits: othersEntries.length,
        authors: [...new Set(othersEntries.map((e) => e.author))],
        messages: othersEntries.map((e) => e.message.split("\n")[0]),
      };

      for (const entry of othersEntries) {
        if (!othersContributions.contributors[entry.author]) {
          othersContributions.contributors[entry.author] = {
            files: new Set(),
            commits: 0,
          };
        }
        othersContributions.contributors[entry.author].files.add(filePath);
        othersContributions.contributors[entry.author].commits++;
      }
    }
  }

  // Set을 배열로 변환
  for (const author of Object.keys(othersContributions.contributors)) {
    othersContributions.contributors[author].files = [
      ...othersContributions.contributors[author].files,
    ];
  }

  return { myContributions, othersContributions };
};

/**
 * 상세 기여도 리포트 생성 (10가지 항목 포함)
 * @param {string} repoUrl - GitHub 레포지토리 URL
 * @param {string} authorName - 분석할 기여자 이름
 * @param {string} [authorEmail] - 기여자 이메일 (선택)
 * @param {number|null} [depth] - 클론 깊이 (null이면 전체 히스토리)
 * @returns {Promise<Object>} - 상세 AI 분석 결과
 */
export const generateDetailedContributionReport = async (
  repoUrl,
  authorName,
  authorEmail = null,
  depth = null,
) => {
  if (!authorName) {
    throw new InvalidRequestError("authorName is required");
  }

  let tempDir = null;

  try {
    const { owner, repo } = parseRepoUrl(repoUrl);

    tempDir = await cloneRepository(repoUrl, depth);

    // 전체 커밋 히스토리 (모든 기여자)
    const allCommits = await getCommitHistory(tempDir, null);

    // 특정 기여자 커밋 히스토리
    const userCommits = authorEmail
      ? await getCommitHistory(tempDir, authorEmail)
      : allCommits.filter((c) => c.commit.author.name === authorName);

    // 전체 파일 히스토리 (diff 포함)
    const allFileHistory = await analyzeFileHistory(tempDir, null, true);

    // 기술 스택 감지
    const techStack = await detectTechStack(tempDir);

    // 프로젝트 규모 분석 (AI를 사용하여 코드 확장자 자동 감지)
    const projectScale = await analyzeProjectScale(tempDir, allCommits);

    // 아키텍처 분석 (AI 기반)
    const architecture = await analyzeArchitecture(tempDir);

    // 기여 분류 (내가 한 것 vs 다른 사람이 한 것)
    const { myContributions, othersContributions } = classifyContributions(
      allFileHistory,
      authorName,
    );

    if (Object.keys(myContributions.files).length === 0) {
      cleanupDirectory(tempDir);
      throw new NotFoundError(
        `"${authorName}"의 기여 내역을 찾을 수 없습니다.`,
      );
    }

    // 기여자의 코드 변경 정보 수집 (상세)
    const contributorChanges = collectContributorChanges(
      allFileHistory,
      authorName,
    );

    // AI 상세 분석 리포트 생성
    const aiReport = await genaiDetailedContributionReport({
      repoInfo: { owner, repo },
      authorName,
      techStack,
      projectScale,
      architecture,
      myContributions,
      othersContributions,
      contributorChanges,
      allCommits: allCommits.length,
      userCommits: userCommits.length,
    });

    const summary = generateAnalysisSummary(allFileHistory, allCommits);

    cleanupDirectory(tempDir);

    return {
      repository: { owner, repo },
      contributor: authorName,
      stats: {
        totalCommits: allCommits.length,
        userCommits: userCommits.length,
        filesModified: Object.keys(myContributions.files).length,
        linesAdded: contributorChanges.totalAdded,
        linesRemoved: contributorChanges.totalRemoved,
      },
      techStack,
      projectScale,
      architecture,
      aiReport,
      summary,
    };
  } catch (error) {
    if (tempDir) {
      cleanupDirectory(tempDir);
    }
    throw error;
  }
};
