import dotenv from "dotenv";
import { githubClient } from "../utils/github.util.js";

dotenv.config();

export const getAccessToken = (req, res, next) => {
  req.accessToken = process.env.GITHUB_BEARER_TOKEN; // 임시용 토큰
  if (!req.accessToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};

/* Example GitHub User Data Response:
  {
    "login": "strfunctionk",
    "id": 84651690,
    "node_id": "MDQ6VXNlcjg0NjUxNjkw",
    "avatar_url": "https://avatars.githubusercontent.com/u/84651690?v=4",
    "gravatar_id": "",
    "url": "https://api.github.com/users/strfunctionk",
    "html_url": "https://github.com/strfunctionk",
    "followers_url": "https://api.github.com/users/strfunctionk/followers",
    "following_url": "https://api.github.com/users/strfunctionk/following{/other_user}",
    "gists_url": "https://api.github.com/users/strfunctionk/gists{/gist_id}",
    "starred_url": "https://api.github.com/users/strfunctionk/starred{/owner}{/repo}",
    "subscriptions_url": "https://api.github.com/users/strfunctionk/subscriptions",
    "organizations_url": "https://api.github.com/users/strfunctionk/orgs",
    "repos_url": "https://api.github.com/users/strfunctionk/repos",
    "events_url": "https://api.github.com/users/strfunctionk/events{/privacy}",
    "received_events_url": "https://api.github.com/users/strfunctionk/received_events",
    "type": "User",
    "user_view_type": "private",
    "site_admin": false,
    "name": null,
    "company": null,
    "blog": "",
    "location": null,
    "email": null,
    "hireable": null,
    "bio": null,
    "twitter_username": null,
    "notification_email": null,
    "public_repos": 10,
    "public_gists": 0,
    "followers": 4,
    "following": 5,
    "created_at": "2021-05-23T03:16:51Z",
    "updated_at": "2025-12-20T07:29:46Z",
    "private_gists": 0,
    "total_private_repos": 9,
    "owned_private_repos": 9,
    "disk_usage": 3335,
    "collaborators": 0,
    "two_factor_authentication": true,
    "plan": {
      "name": "pro",
      "space": 976562499,
      "collaborators": 0,
      "private_repos": 9999
    }
  }
*/
export const githubUserData = async (req, res, next) => {
  const accessToken = req.accessToken;
  const userData = await githubClient("/user", accessToken);
  if (!userData || userData.message === "Not Found") {
    return res.status(404).json({ message: "GitHub user not found" });
  }
  req.user = userData;
  return next();
};

/* Example GitHub Repositories Data Response:
  [
    {
      "id": 1053805557,
      "node_id": "R_kgDOPs_L9Q",
      "name": "temp",
      "full_name": "parksoohyeon/temp",
      "private": true,
      "owner": {
        "login": "parksoohyeon",
        "id": 33175025,
        "node_id": "MDQ6VXNlcjMzMTc1MDI1",
        "avatar_url": "https://avatars.githubusercontent.com/u/33175025?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/parksoohyeon",
        "html_url": "https://github.com/parksoohyeon",
        "followers_url": "https://api.github.com/users/parksoohyeon/followers",
        "following_url": "https://api.github.com/users/parksoohyeon/following{/other_user}",
        "gists_url": "https://api.github.com/users/parksoohyeon/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/parksoohyeon/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/parksoohyeon/subscriptions",
        "organizations_url": "https://api.github.com/users/parksoohyeon/orgs",
        "repos_url": "https://api.github.com/users/parksoohyeon/repos",
        "events_url": "https://api.github.com/users/parksoohyeon/events{/privacy}",
        "received_events_url": "https://api.github.com/users/parksoohyeon/received_events",
        "type": "User",
        "user_view_type": "public",
        "site_admin": false
      },
      "html_url": "https://github.com/parksoohyeon/temp",
      "description": null,
      "fork": false,
      "url": "https://api.github.com/repos/parksoohyeon/temp",
      "forks_url": "https://api.github.com/repos/parksoohyeon/temp/forks",
      "keys_url": "https://api.github.com/repos/parksoohyeon/temp/keys{/key_id}",
      "collaborators_url": "https://api.github.com/repos/parksoohyeon/temp/collaborators{/collaborator}",
      "teams_url": "https://api.github.com/repos/parksoohyeon/temp/teams",
      "hooks_url": "https://api.github.com/repos/parksoohyeon/temp/hooks",
      "issue_events_url": "https://api.github.com/repos/parksoohyeon/temp/issues/events{/number}",
      "events_url": "https://api.github.com/repos/parksoohyeon/temp/events",
      "assignees_url": "https://api.github.com/repos/parksoohyeon/temp/assignees{/user}",
      "branches_url": "https://api.github.com/repos/parksoohyeon/temp/branches{/branch}",
      "tags_url": "https://api.github.com/repos/parksoohyeon/temp/tags",
      "blobs_url": "https://api.github.com/repos/parksoohyeon/temp/git/blobs{/sha}",
      "git_tags_url": "https://api.github.com/repos/parksoohyeon/temp/git/tags{/sha}",
      "git_refs_url": "https://api.github.com/repos/parksoohyeon/temp/git/refs{/sha}",
      "trees_url": "https://api.github.com/repos/parksoohyeon/temp/git/trees{/sha}",
      "statuses_url": "https://api.github.com/repos/parksoohyeon/temp/statuses/{sha}",
      "languages_url": "https://api.github.com/repos/parksoohyeon/temp/languages",
      "stargazers_url": "https://api.github.com/repos/parksoohyeon/temp/stargazers",
      "contributors_url": "https://api.github.com/repos/parksoohyeon/temp/contributors",
      "subscribers_url": "https://api.github.com/repos/parksoohyeon/temp/subscribers",
      "subscription_url": "https://api.github.com/repos/parksoohyeon/temp/subscription",
      "commits_url": "https://api.github.com/repos/parksoohyeon/temp/commits{/sha}",
      "git_commits_url": "https://api.github.com/repos/parksoohyeon/temp/git/commits{/sha}",
      "comments_url": "https://api.github.com/repos/parksoohyeon/temp/comments{/number}",
      "issue_comment_url": "https://api.github.com/repos/parksoohyeon/temp/issues/comments{/number}",
      "contents_url": "https://api.github.com/repos/parksoohyeon/temp/contents/{+path}",
      "compare_url": "https://api.github.com/repos/parksoohyeon/temp/compare/{base}...{head}",
      "merges_url": "https://api.github.com/repos/parksoohyeon/temp/merges",
      "archive_url": "https://api.github.com/repos/parksoohyeon/temp/{archive_format}{/ref}",
      "downloads_url": "https://api.github.com/repos/parksoohyeon/temp/downloads",
      "issues_url": "https://api.github.com/repos/parksoohyeon/temp/issues{/number}",
      "pulls_url": "https://api.github.com/repos/parksoohyeon/temp/pulls{/number}",
      "milestones_url": "https://api.github.com/repos/parksoohyeon/temp/milestones{/number}",
      "notifications_url": "https://api.github.com/repos/parksoohyeon/temp/notifications{?since,all,participating}",
      "labels_url": "https://api.github.com/repos/parksoohyeon/temp/labels{/name}",
      "releases_url": "https://api.github.com/repos/parksoohyeon/temp/releases{/id}",
      "deployments_url": "https://api.github.com/repos/parksoohyeon/temp/deployments",
      "created_at": "2025-09-10T00:49:42Z",
      "updated_at": "2025-09-10T00:56:34Z",
      "pushed_at": "2025-09-10T00:55:51Z",
      "git_url": "git://github.com/parksoohyeon/temp.git",
      "ssh_url": "git@github.com:parksoohyeon/temp.git",
      "clone_url": "https://github.com/parksoohyeon/temp.git",
      "svn_url": "https://github.com/parksoohyeon/temp",
      "homepage": null,
      "size": 5,
      "stargazers_count": 0,
      "watchers_count": 0,
      "language": null,
      "has_issues": true,
      "has_projects": true,
      "has_downloads": true,
      "has_wiki": false,
      "has_pages": false,
      "has_discussions": false,
      "forks_count": 0,
      "mirror_url": null,
      "archived": false,
      "disabled": false,
      "open_issues_count": 0,
      "license": null,
      "allow_forking": true,
      "is_template": false,
      "web_commit_signoff_required": false,
      "topics": [],
      "visibility": "private",
      "forks": 0,
      "open_issues": 0,
      "watchers": 0,
      "default_branch": "main",
      "permissions": {
        "admin": false,
        "maintain": false,
        "push": true,
        "triage": true,
        "pull": true
      }
    },
  ]
*/
export const githubUserRepos = async (req, res, next) => {
  const accessToken = req.accessToken;
  const repoData = await githubClient("/user/repos", accessToken);
  if (!repoData || repoData.message === "Not Found") {
    return res.status(404).json({ message: "GitHub repositories not found" });
  }
  req.user.repos = repoData;
  return next();
};
