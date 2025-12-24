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
