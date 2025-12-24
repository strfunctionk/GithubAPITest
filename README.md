# DeVine Node.js Test Backend

### Execution Guide

0. **Node.js 설치**

   - [Node.js 공식 홈페이지](https://nodejs.org/)에서 LTS 버전을 설치합니다. (npm은 Node.js 설치 시 함께 포함되어 있습니다.)
   - **주의**: 설치 후 `npm` 명령어가 인식되지 않는 경우, 터미널(CMD, PowerShell 등)을 완전히 종료한 후 다시 실행해 주세요. 시스템 환경 변수(PATH)가 자동으로 업데이트되지 않았다면 PC를 재부팅해야 할 수도 있습니다.

1. **의존성 설치**

   ```bash
   npm install
   ```

2. **환경 변수 설정**
   `.env` 파일을 생성하고 다음 항목을 입력합니다.

   - GITHUB_CLIENT_ID와 GITHUB_CLIENT_SECRET은 [GitHub Settings](https://github.com/settings/profile) > **Developer settings** > **OAuth Apps** > **New OAuth App**에서 발급받을 수 있습니다.

   ```env
   PORT=3000
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   ```

3. **서버 실행**

   ```bash
   npm start
   ```

4. **테스트 페이지 접속**
   - 브라우저에서 `http://localhost:3000` 접속

---

### 📂 Project Structure

```markdown
📦 project
┣ 📂prisma
┃ ┗ 📜schema.prisma
┣ 📂public
┃ ┣ 📜index.html
┃ ┗ 📜script.js
┣ 📂src
┃ ┣ 📂configs
┃ ┃ ┣ 📜cors.config.js
┃ ┃ ┣ 📜db.config.js
┃ ┃ ┣ 📜genai.config.js
┃ ┃ ┣ 📜oauth.config.js
┃ ┃ ┣ 📜openai.config.js
┃ ┃ ┗ 📜swagger.config.js
┃ ┣ 📂controllers
┃ ┃ ┣ 📜ai.controller.js
┃ ┃ ┣ 📜auth.controller.js
┃ ┃ ┣ 📜github.controller.js
┃ ┃ ┣ 📜oauth.controller.js
┃ ┃ ┗ 📜user.controller.js
┃ ┣ 📂dtos
┃ ┃ ┣ 📜ai.dto.js
┃ ┃ ┣ 📜auth.dto.js
┃ ┃ ┗ 📜user.dto.js
┃ ┣ 📂errors
┃ ┃ ┣ 📜auth.error.js
┃ ┃ ┗ 📜github.error.js
┃ ┣ 📂middlewares
┃ ┃ ┣ 📜auth.middleware.js
┃ ┃ ┣ 📜error.middleware.js
┃ ┃ ┣ 📜github.middleware.js
┃ ┃ ┣ 📜oauth.middleware.js
┃ ┃ ┣ 📜state.middleware.js
┃ ┃ ┗ 📜swagger.middleware.js
┃ ┣ 📂repositories
┃ ┃ ┣ 📜auth.repository.js
┃ ┃ ┗ 📜user.repository.js
┃ ┣ 📂routes
┃ ┃ ┣ 📜ai.route.js
┃ ┃ ┣ 📜auth.route.js
┃ ┃ ┣ 📜github.route.js
┃ ┃ ┣ 📜index.route.js
┃ ┃ ┣ 📜oauth.route.js
┃ ┃ ┗ 📜user.route.js
┃ ┣ 📂services
┃ ┃ ┣ 📜ai.service.js
┃ ┃ ┣ 📜auth.service.js
┃ ┃ ┣ 📜github.service.js
┃ ┃ ┗ 📜user.service.js
┃ ┣ 📂utils
┃ ┃ ┣ 📜buffer.util.js
┃ ┃ ┣ 📜crypto.util.js
┃ ┃ ┣ 📜genai.util.js
┃ ┃ ┣ 📜github.util.js
┃ ┃ ┣ 📜jwt.util.js
┃ ┃ ┗ 📜openai.util.js
┃ ┗ 📜index.js
┣ 📜.env
┣ 📜.gitignore
┣ 📜package-lock.json
┣ 📜package.json
┗ 📜README.md
```
