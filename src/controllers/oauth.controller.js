import dotenv from "dotenv";
import { githubOAuthConfig } from "../configs/oauth.config.js";
import { StatusCodes } from "http-status-codes";

dotenv.config();

export const handleLoginWithGitHub = (req, res) => {
  const { CLIENT_ID, scopes } = githubOAuthConfig();
  const githubUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=${scopes.join(
    ","
  )}`;
  res.redirect(githubUrl);
};

export const handleCallbackFromGitHub = async (req, res) => {
  const accessToken = req.accessToken;
  // res.status(StatusCodes.OK).success(accessToken); // 기존 JSON 응답

  // HTML 응답을 통해 부모 창으로 토큰 전달
  const htmlScript = `
    <html>
      <body>
        <p>인증 완료. 토큰을 전달하고 창을 닫습니다...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GITHUB_TOKEN', token: '${accessToken}' }, '*');
            window.close();
          } else {
            document.body.innerHTML = '<p>부모 창을 찾을 수 없습니다. 아래 토큰을 복사하세요.</p><pre>${accessToken}</pre>';
          }
        </script>
      </body>
    </html>
  `;
  res.send(htmlScript);
};
