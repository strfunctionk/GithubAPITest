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

document.getElementById('testGrassBtn').addEventListener('click', () => {
    fetchGitHubData('/v1/api/github/test/grass');
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

// 잔디 렌더링 함수
function renderGrass(data) {
    const resultArea = document.getElementById('resultArea');
    
    // 데이터 구조 안전하게 탐색
    const weeks = data?.success?.grass?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
    
    if (!weeks || !Array.isArray(weeks)) {
        console.warn("잔디 데이터를 찾을 수 없습니다.");
        return;
    }

    const container = document.createElement('div');
    container.className = 'graph-container';
    container.innerHTML = '<h4>Contribution Graph</h4>';
    
    const grid = document.createElement('div');
    grid.style.display = 'flex';
    
    weeks.forEach(week => {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'week';
        
        week.contributionDays.forEach(day => {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day';
            
            // 기여도에 따른 레벨 설정 (단순화)
            let level = 0;
            if (day.contributionCount > 0) level = 1;
            if (day.contributionCount > 3) level = 2;
            if (day.contributionCount > 6) level = 3;
            if (day.contributionCount > 10) level = 4;
            
            dayDiv.setAttribute('data-level', level);
            dayDiv.setAttribute('title', `${day.date}: ${day.contributionCount} contributions`);
            
            // 툴팁 이벤트
            dayDiv.addEventListener('mouseover', (e) => {
                const tooltip = document.getElementById('tooltip');
                tooltip.innerText = `${day.date}: ${day.contributionCount}`;
                tooltip.style.display = 'block';
                tooltip.style.left = e.pageX + 10 + 'px';
                tooltip.style.top = e.pageY + 10 + 'px';
            });
            dayDiv.addEventListener('mouseout', () => {
                document.getElementById('tooltip').style.display = 'none';
            });

            weekDiv.appendChild(dayDiv);
        });
        
        grid.appendChild(weekDiv);
    });
    
    container.appendChild(grid);
    resultArea.prepend(container); // JSON 결과 위에 그래프 추가
}

// 공통 Fetch 함수
async function fetchGitHubData(endpoint) {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput.value.trim();
    const resultArea = document.getElementById('resultArea');

    if (!token) {
        alert('Access Token을 입력해주세요.');
        tokenInput.focus();
        return;
    }

    resultArea.innerHTML = '<p>데이터를 불러오는 중...</p>';

    try {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const responseText = await response.text();
        console.log(`Raw Response (${endpoint}):`, responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response:\n${responseText.substring(0, 500)}...`);
        }
        
        if (!response.ok) {
            throw new Error(data.error?.reason || data.message || `HTTP error! status: ${response.status}`);
        }
        
        resultArea.innerHTML = `
            <h3>Result (Status: ${response.status})</h3>
            <p><strong>Endpoint:</strong> ${endpoint}</p>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;

        if (endpoint.includes('/test/grass')) {
            renderGrass(data);
        }

    } catch (error) {
        console.error('Error:', error);
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
