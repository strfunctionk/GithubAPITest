export class GitHubAuthError extends Error {
  errorCode = "AUTH001";

  constructor(reason, data) {
    super(reason);
    this.reason = reason;
    this.data = data;
    this.statusCode = 401;
  }
}

export class GitHubUserNotFoundError extends Error {
  errorCode = "USER001";

  constructor(reason, data) {
    super(reason);
    this.reason = reason;
    this.data = data;
    this.statusCode = 404;
  }
}

export class GitHubRepoNotFoundError extends Error {
  errorCode = "REPO001";

  constructor(reason, data) {
    super(reason);
    this.reason = reason;
    this.data = data;
    this.statusCode = 404;
  }
}

export class GitHubApiError extends Error {
  errorCode = "GITHUB_API_ERROR";

  constructor(reason, data) {
    super(reason);
    this.reason = reason;
    this.data = data;
    this.statusCode = 500;
  }
}
