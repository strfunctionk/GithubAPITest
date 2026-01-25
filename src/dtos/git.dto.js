export const bodyToAnalyzeRepository = (body) => {
  return {
    repoUrl: body.repoUrl,
    authorEmail: body.authorEmail || null,
    cleanup: body.cleanup ?? true,
  };
};

export const bodyToAnalyzeRepositoryDetail = (body) => {
  return {
    repoUrl: body.repoUrl,
    authorEmail: body.authorEmail || null,
  };
};

export const bodyToAnalyzeContribution = (body) => {
  return {
    repoUrl: body.repoUrl,
    authorName: body.authorName,
    authorEmail: body.authorEmail || null,
    depth: body.depth || null,
  };
};

export const responseFromAnalyzeRepository = (result) => {
  return {
    message: "Repository analyzed successfully",
    repository: result.repository,
    summary: result.summary,
    processedFiles: result.processedFiles,
    analysisPath: result.analysisPath || null,
  };
};

export const responseFromAnalyzeRepositoryDetail = (result) => {
  return {
    message: "Repository analyzed with full details",
    repository: result.repository,
    summary: result.summary,
    processedFiles: result.processedFiles,
    fileHistory: result.fileHistory,
  };
};

export const responseFromAnalyzeContribution = (result, elapsedTime) => {
  return {
    message: "Contribution analysis completed",
    repository: result.repository,
    contributor: result.contributor,
    stats: result.stats,
    aiReport: result.aiReport,
    generatedAt: new Date().toISOString(),
    elapsedTimeSeconds: elapsedTime,
  };
};

export const bodyToDetailedReport = (body) => {
  return {
    repoUrl: body.repoUrl,
    authorName: body.authorName,
    authorEmail: body.authorEmail || null,
    depth: body.depth || null,
  };
};

export const responseFromDetailedReport = (result, elapsedTime) => {
  return {
    message: "Detailed contribution report generated",
    repository: result.repository,
    contributor: result.contributor,
    stats: result.stats,
    techStack: result.techStack,
    projectScale: result.projectScale,
    architecture: result.architecture,
    report: result.aiReport,
    summary: result.summary,
    generatedAt: new Date().toISOString(),
    elapsedTimeSeconds: elapsedTime,
  };
};
