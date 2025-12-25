import { githubClient } from "../utils/github.util.js";

/*
  GitHub 저장소의 특정 경로에 있는 데이터를 가져옵니다.
  @param {string} accessToken - GitHub 액세스 토큰
  @param {string} owner - 저장소 소유자 이름
  @param {string} repo - 저장소 이름
  @param {string} path - 저장소 내 경로
  @returns {Promise<Object>} - 경로에 있는 데이터
*/
export const getRepoContent = async (accessToken, owner, repo, path) => {
  const repoData = await githubClient(
    `/repos/${owner}/${repo}/contents/${path}`,
    accessToken
  );
  return repoData;
};

/*
  GitHub 저장소의 트리를 재귀적으로 가져옵니다.
  @param {string} accessToken - GitHub 액세스 토큰
  @param {string} owner - 저장소 소유자 이름
  @param {string} repo - 저장소 이름
  @param {string} branch - 브랜치 이름 (기본값: "main")
  @param {number} recursive - 재귀적 깊이 (1이면 모든 하위 디렉토리 포함)
  @returns {Promise<Array>} - 저장소 트리 데이터
*/
export const getRepoTreeRecursive = async (
  accessToken,
  owner,
  repo,
  branch = "main",
  recursive = 1
) => {
  const treeData = await githubClient(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=${recursive}`,
    accessToken
  );
  if (treeData.truncated) {
    throw new Error("트리 데이터가 너무 커서 잘렸습니다.");
  }
  return treeData.tree;
};

export const getRepoZipball = async (
  accessToken,
  owner,
  repo,
  ref = "main"
) => {
  const zipballData = await githubClient(
    `/repos/${owner}/${repo}/zipball/${ref}`,
    accessToken,
    {
      method: "GET",
      responseType: "arraybuffer",
    }
  );
  return zipballData;
};

export const getGitHubGrass = async (accessToken, userName, year) => {
  let queryVariables = { login: userName };
  let queryArgs = "$login:String!";
  let collectionArgs = "";

  if (year) {
    const from = `${year}-01-01T00:00:00Z`;
    const to = `${year}-12-31T23:59:59Z`;
    queryVariables.from = from;
    queryVariables.to = to;
    queryArgs += ", $from:DateTime, $to:DateTime";
    collectionArgs = "(from: $from, to: $to)";
  }

  const query = `
    query(${queryArgs}) {
      user(login:$login) {
        contributionsCollection${collectionArgs} {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;
  const grass = await githubClient("/graphql", accessToken, {
    method: "POST",
    data: {
      query,
      variables: queryVariables,
    },
  });
  return grass;
};

/*
  GitHub 저장소의 특정 파일에 대한 Blame(수정 기록) 정보를 가져옵니다.
  @param {string} accessToken - GitHub 액세스 토큰
  @param {string} owner - 저장소 소유자 이름
  @param {string} repo - 저장소 이름
  @param {string} path - 파일 경로 (예: "src/index.js")
  @param {string} branch - 브랜치 이름 (기본값: "main")
  @returns {Promise<Object>} - Blame 데이터 (라인 범위별 커밋 정보)
*/
export const getRepoFileBlame = async (
  accessToken,
  owner,
  repo,
  path,
  branch = "main"
) => {
  const query = `
    query($owner: String!, $repo: String!, $branch: String!, $path: String!) {
      repository(owner: $owner, name: $repo) {
        ref(qualifiedName: $branch) {
          target {
            ... on Commit {
              blame(path: $path) {
                ranges {
                  startingLine
                  endingLine
                  commit {
                    oid
                    message
                    committedDate
                    author {
                      name
                      avatarUrl
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner,
    repo,
    branch,
    path,
  };

  const response = await githubClient("/graphql", accessToken, {
    method: "POST",
    data: {
      query,
      variables,
    },
  });

  if (response.errors) {
    console.error("GitHub GraphQL Errors:", response.errors);
    const errorDetails = JSON.stringify(response.errors, null, 2);
    throw new Error(`GitHub GraphQL Error:\n${errorDetails}`);
  }

  const repoData = response.data?.repository;
  if (!repoData) {
    throw new Error(`Repository not found or access denied: ${owner}/${repo}.`);
  }

  const refData = repoData.ref;
  if (!refData) {
    throw new Error(`Branch not found: ${branch}`);
  }

  const blameData = refData.target?.blame;
  if (!blameData) {
    throw new Error(`No blame data found for file: ${path}`);
  }

  return blameData.ranges || [];
};

/*
  GitHub 저장소의 전체 커밋 내역을 가져옵니다.
  @param {string} accessToken - GitHub 액세스 토큰
  @param {string} owner - 저장소 소유자 이름
  @param {string} repo - 저장소 이름
  @param {Object} params - 필터 옵션 (sha, path, author, since, until 등)
  @returns {Promise<Array>} - 커밋 객체 배열
*/
export const getRepoCommits = async (accessToken, owner, repo, params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const url = `/repos/${owner}/${repo}/commits${
    queryParams ? `?${queryParams}` : ""
  }`;

  const commits = await githubClient(url, accessToken, {
    method: "GET",
  });

  return commits;
};

/*
  특정 커밋의 상세 정보(변경 사항, 통계 등)를 가져옵니다.
  @param {string} accessToken - GitHub 액세스 토큰
  @param {string} owner - 저장소 소유자 이름
  @param {string} repo - 저장소 이름
  @param {string} commitSha - 커밋 SHA
  @returns {Promise<Object>} - 커밋 상세 객체 (stats, files 포함)
*/
export const getCommitDetail = async (accessToken, owner, repo, commitSha) => {
  const url = `/repos/${owner}/${repo}/commits/${commitSha}`;
  const commitDetail = await githubClient(url, accessToken, {
    method: "GET",
  });
  return commitDetail;
};
