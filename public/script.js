document.getElementById("loginBtn").addEventListener("click", () => {
  // 현재 페이지를 유지하기 위해 새 창에서 로그인 진행
  // width/height 등을 지정하여 팝업 형태로 띄움
  const width = 600;
  const height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;

  window.open(
    "/v1/api/oauth/github",
    "GitHubLogin",
    `width=${width},height=${height},top=${top},left=${left}`
  );
});

// 팝업 창으로부터 토큰 수신
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "GITHUB_TOKEN") {
    const tokenInput = document.getElementById("tokenInput");
    tokenInput.value = event.data.token;

    // 시각적 피드백
    tokenInput.style.backgroundColor = "#e6fffa";
    setTimeout(() => (tokenInput.style.backgroundColor = ""), 1000);

    alert("토큰이 자동으로 입력되었습니다! 이제 Test 버튼을 눌러보세요.");
  }
});

document.getElementById("testContentBtn").addEventListener("click", () => {
  fetchGitHubData("/v1/api/github/test/content");
});

document.getElementById("testTreeBtn").addEventListener("click", () => {
  fetchGitHubData("/v1/api/github/test/tree");
});

document
  .getElementById("downloadZipBtn")
  .addEventListener("click", async () => {
    const tokenInput = document.getElementById("tokenInput");
    const token = tokenInput.value.trim();
    const resultArea = document.getElementById("resultArea");

    if (!token) {
      alert("Access Token을 입력해주세요.");
      tokenInput.focus();
      return;
    }

    resultArea.innerHTML =
      "<p>다운로드 요청 중... (시간이 걸릴 수 있습니다)</p>";

    try {
      const response = await fetch("/v1/api/github/test/zip", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // 에러 시 텍스트/JSON 읽기
        const errText = await response.text();
        throw new Error(`Download failed: ${response.status} ${errText}`);
      }

      // Blob 형태로 데이터 받기
      const blob = await response.blob();

      // 다운로드 링크 생성 및 클릭
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      // 파일명 추출 시도 (Content-Disposition 헤더)
      const disposition = response.headers.get("Content-Disposition");
      let fileName = "repo.zip";
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, "");
        }
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      resultArea.innerHTML = `
            <h3>Success!</h3>
            <p>파일 다운로드가 시작되었습니다: <strong>${fileName}</strong></p>
        `;
    } catch (error) {
      console.error("Download Error:", error);
      resultArea.innerHTML = `
            <div style="color: #cb2431; background: #ffeef0; padding: 1rem; border-radius: 6px; border: 1px solid #f5c6cb;">
                <strong>다운로드 오류:</strong> ${error.message}<br><br>
                토큰 권한, 레포지토리 존재 여부 등을 확인해주세요.
            </div>
        `;
    }
  });

// 공통 Fetch 함수
async function fetchGitHubData(endpoint) {
  const tokenInput = document.getElementById("tokenInput");
  const token = tokenInput.value.trim();
  const resultArea = document.getElementById("resultArea");

  if (!token) {
    alert("Access Token을 입력해주세요.");
    tokenInput.focus();
    return;
  }

  resultArea.innerHTML = "<p>데이터를 불러오는 중...</p>";

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();
    console.log(`Raw Response (${endpoint}):`, responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      // HTML 에러 페이지 등 JSON이 아닌 경우
      throw new Error(
        `Invalid JSON response:\n${responseText.substring(0, 500)}...`
      );
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    resultArea.innerHTML = `
            <h3>Result (Status: ${response.status})</h3>
            <p><strong>Endpoint:</strong> ${endpoint}</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
  } catch (error) {
    console.error("Error:", error);
    resultArea.innerHTML = `
            <div style="color: #cb2431; background: #ffeef0; padding: 1rem; border-radius: 6px; border: 1px solid #f5c6cb;">
                <strong>오류 발생:</strong> ${error.message}<br><br>
                토큰이 올바른지 확인하거나, 콘솔 로그(Raw Response)를 확인해보세요.
            </div>
        `;
  }
}

document.getElementById("testUserBtn").addEventListener("click", () => {
  fetchGitHubData("/v1/api/github/test/user");
});

document.getElementById("testBtn").addEventListener("click", () => {
  fetchGitHubData("/v1/api/github/test");
});
