import git from "isomorphic-git";
import fs from "fs";
import path from "path";
import { genaiDetectCodeExtensions } from "./genai.util.js";

/**
 * Git이 추적하는 파일 목록 조회
 * @param {string} dir - 레포지토리 디렉토리
 * @returns {Promise<Array<string>>} - 파일 경로 목록
 */
export const getTrackedFiles = async (dir) => {
  try {
    const files = await git.listFiles({ fs, dir, ref: "HEAD" });
    return files;
  } catch (error) {
    console.error("Error listing files:", error.message);
    return [];
  }
};

/**
 * 프로젝트의 확장자별 파일 분포 분석
 * @param {string} dir - 레포지토리 디렉토리
 * @returns {Promise<Object>} - 확장자별 파일 목록 및 샘플
 */
export const analyzeFileExtensions = async (dir) => {
  const files = await getTrackedFiles(dir);
  const extensionMap = {};

  for (const file of files) {
    // node_modules, vendor 등 제외
    if (file.includes("node_modules/") || file.includes("vendor/") ||
        file.includes("dist/") || file.includes("build/") ||
        file.includes(".git/")) {
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    if (!ext) continue; // 확장자 없는 파일 제외

    if (!extensionMap[ext]) {
      extensionMap[ext] = {
        count: 0,
        samples: [],
      };
    }
    extensionMap[ext].count++;

    // 각 확장자당 최대 3개 샘플 저장
    if (extensionMap[ext].samples.length < 3) {
      extensionMap[ext].samples.push(file);
    }
  }

  return extensionMap;
};

/**
 * AI를 사용하여 코드 파일 확장자 감지
 * @param {string} dir - 레포지토리 디렉토리
 * @returns {Promise<Array<string>>} - 코드 파일 확장자 목록
 */
export const detectCodeExtensions = async (dir) => {
  const extensionMap = await analyzeFileExtensions(dir);
  const extensions = Object.keys(extensionMap);

  if (extensions.length === 0) {
    return [];
  }

  // 확장자별 샘플 파일 내용 읽기 (AI 분석용)
  const extensionSamples = {};
  for (const [ext, data] of Object.entries(extensionMap)) {
    const sampleFile = data.samples[0];
    if (sampleFile) {
      try {
        const fullPath = path.join(dir, sampleFile);
        const content = fs.readFileSync(fullPath, "utf-8");
        // 처음 20줄만 샘플로 사용
        const preview = content.split("\n").slice(0, 20).join("\n");
        extensionSamples[ext] = {
          count: data.count,
          sampleFile: sampleFile,
          preview: preview.substring(0, 500), // 최대 500자
        };
      } catch {
        extensionSamples[ext] = {
          count: data.count,
          sampleFile: sampleFile,
          preview: "(읽기 실패)",
        };
      }
    }
  }

  // AI에게 코드 파일 확장자 판단 요청
  try {
    const codeExtensions = await genaiDetectCodeExtensions(extensionSamples);
    return codeExtensions;
  } catch (error) {
    console.error("AI 코드 확장자 감지 실패, 기본값 사용:", error.message);
    // 폴백: 일반적인 코드 확장자
    const defaultCodeExts = [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs", ".rb", ".php", ".vue", ".svelte"];
    return extensions.filter((ext) => defaultCodeExts.includes(ext));
  }
};

/**
 * 디렉토리 트리 구조를 재귀적으로 생성
 * @param {string} dirPath - 디렉토리 경로
 * @param {string} basePath - 기준 경로 (상대 경로 계산용)
 * @param {number} depth - 현재 깊이
 * @param {number} maxDepth - 최대 깊이
 * @returns {Object} - 트리 구조
 */
export const buildDirectoryTree = (dirPath, basePath, depth = 0, maxDepth = 4) => {
  const skipDirs = ["node_modules", "vendor", "dist", "build", ".git", "__pycache__", ".next", "coverage"];
  const tree = {
    name: path.basename(dirPath),
    path: path.relative(basePath, dirPath) || ".",
    type: "directory",
    children: [],
  };

  if (depth >= maxDepth) {
    tree.children = ["..."];
    return tree;
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // 디렉토리 먼저, 그 다음 파일
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
      if (entry.name.startsWith(".") && entry.name !== ".env.example") {
        continue;
      }

      if (entry.isDirectory()) {
        if (skipDirs.includes(entry.name)) {
          continue;
        }
        const childPath = path.join(dirPath, entry.name);
        const childTree = buildDirectoryTree(childPath, basePath, depth + 1, maxDepth);
        tree.children.push(childTree);
      } else {
        // 주요 파일만 포함 (설정 파일, 코드 파일)
        const ext = path.extname(entry.name).toLowerCase();
        const importantFiles = [
          "package.json", "tsconfig.json", "next.config.js", "next.config.mjs",
          "vite.config.js", "vite.config.ts", "webpack.config.js",
          "dockerfile", "docker-compose.yml", "docker-compose.yaml",
          ".env.example", "readme.md", "readme.txt",
        ];
        const codeExtensions = [
          ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs",
          ".vue", ".svelte", ".html", ".css", ".scss",
        ];

        if (depth <= 1 || importantFiles.includes(entry.name.toLowerCase()) || codeExtensions.includes(ext)) {
          tree.children.push({
            name: entry.name,
            path: path.relative(basePath, path.join(dirPath, entry.name)),
            type: "file",
          });
        }
      }
    }
  } catch (error) {
    // 권한 오류 등 무시
  }

  return tree;
};

/**
 * 트리 구조를 텍스트로 변환
 * @param {Object} tree - 트리 구조
 * @param {string} prefix - 들여쓰기 접두사
 * @param {boolean} isLast - 마지막 항목 여부
 * @returns {string} - 텍스트 트리
 */
export const treeToText = (tree, prefix = "", isLast = true) => {
  const connector = isLast ? "└── " : "├── ";
  const extension = isLast ? "    " : "│   ";

  let result = prefix + connector + tree.name + (tree.type === "directory" ? "/" : "") + "\n";

  if (tree.children && Array.isArray(tree.children)) {
    const filteredChildren = tree.children.filter((c) => typeof c !== "string");
    const hasMore = tree.children.some((c) => c === "...");

    filteredChildren.forEach((child, index) => {
      const childIsLast = index === filteredChildren.length - 1 && !hasMore;
      result += treeToText(child, prefix + extension, childIsLast);
    });

    if (hasMore) {
      result += prefix + extension + "└── ...\n";
    }
  }

  return result;
};

/**
 * 디렉토리 트리 구조 생성 (AI 분석용)
 * @param {string} dir - 레포지토리 디렉토리
 * @returns {Object} - 트리 구조와 텍스트
 */
export const buildProjectTree = (dir) => {
  const tree = buildDirectoryTree(dir, dir, 0, 4);
  const treeText = tree.name + "/\n" + tree.children
    .map((child, index) => treeToText(child, "", index === tree.children.length - 1))
    .join("");

  return { tree, treeText };
};

/**
 * 파일 확장자에 따른 한 줄 주석 prefix 반환
 * @param {string} filePath - 파일 경로
 * @returns {string} - 주석 prefix
 */
export const getCommentPrefix = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();

  const slashComment = "//";
  const hashComment = "#";
  const htmlComment = "<!--";

  const prefixes = {
    ".js": slashComment,
    ".ts": slashComment,
    ".jsx": slashComment,
    ".tsx": slashComment,
    ".java": slashComment,
    ".c": slashComment,
    ".cpp": slashComment,
    ".cs": slashComment,
    ".go": slashComment,
    ".swift": slashComment,
    ".kt": slashComment,
    ".rs": slashComment,
    ".php": slashComment,
    ".css": "/*",
    ".scss": slashComment,
    ".less": slashComment,
    ".py": hashComment,
    ".rb": hashComment,
    ".sh": hashComment,
    ".bash": hashComment,
    ".yml": hashComment,
    ".yaml": hashComment,
    ".toml": hashComment,
    ".html": htmlComment,
    ".xml": htmlComment,
    ".vue": slashComment,
    ".svelte": slashComment,
    ".md": htmlComment,
  };

  return prefixes[ext] || slashComment;
};

/**
 * 커밋 메시지에서 역할(role) 추출
 * @param {Array} history - 파일 수정 이력
 * @returns {string} - 추출된 역할
 */
export const extractRole = (history) => {
  const roleKeywords = {
    feat: "feature",
    fix: "bugfix",
    refactor: "refactoring",
    docs: "documentation",
    style: "styling",
    test: "testing",
    chore: "maintenance",
    perf: "performance",
    ci: "ci/cd",
    build: "build",
    init: "initialization",
    add: "feature",
    update: "update",
    remove: "cleanup",
    delete: "cleanup",
  };

  const roleCounts = {};

  for (const entry of history) {
    const msg = entry.message.toLowerCase();
    for (const [keyword, role] of Object.entries(roleKeywords)) {
      if (msg.startsWith(keyword) || msg.includes(`${keyword}:`)) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : "general";
};

/**
 * 커밋 메시지에서 목적(purpose) 요약 추출
 * @param {Array} history - 파일 수정 이력
 * @returns {string} - 목적 요약
 */
export const extractPurpose = (history) => {
  const messages = history
    .slice(0, 5)
    .map((h) => {
      let msg = h.message.split("\n")[0].trim();
      msg = msg.replace(/^(feat|fix|refactor|docs|style|test|chore|perf|ci|build)(\(.+?\))?:\s*/i, "");
      return msg;
    })
    .filter((m) => m.length > 0);

  if (messages.length === 0) return "unknown";

  const unique = [...new Set(messages)];
  return unique.slice(0, 2).join("; ").substring(0, 80);
};

/**
 * AI 분석용 한 줄 주석 생성
 * @param {Array} history - 파일 수정 이력
 * @param {string} filePath - 파일 경로
 * @returns {string} - 생성된 주석
 */
export const generateAIComment = (history, filePath) => {
  const prefix = getCommentPrefix(filePath);
  const ext = path.extname(filePath).toLowerCase();

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const oldestHistory = [...history].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  // 주요 기여자 계산
  const contributors = {};
  for (const entry of history) {
    contributors[entry.author] = (contributors[entry.author] || 0) + 1;
  }
  const mainContributor = Object.entries(contributors)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "unknown";

  const role = extractRole(history);
  const purpose = extractPurpose(history);
  const created = oldestHistory[0]?.date.split("T")[0] || "unknown";
  const lastTouch = sortedHistory[0]?.author || "unknown";
  const changes = history.length;

  // CSS는 /* */ 스타일 사용
  if (ext === ".css") {
    return `/* @AI: file=${path.basename(filePath)} role=${role} created=${created} by=${mainContributor} lastTouch=${lastTouch} changes=${changes} purpose="${purpose}" */`;
  }

  // HTML/XML은 <!-- --> 스타일 사용
  if (prefix === "<!--") {
    return `<!-- @AI: file=${path.basename(filePath)} role=${role} created=${created} by=${mainContributor} lastTouch=${lastTouch} changes=${changes} purpose="${purpose}" -->`;
  }

  return `${prefix} @AI: file=${path.basename(filePath)} role=${role} created=${created} by=${mainContributor} lastTouch=${lastTouch} changes=${changes} purpose="${purpose}"`;
};
