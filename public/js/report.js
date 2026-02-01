document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('analysisForm');
  const reportContainer = document.getElementById('reportPaper');
  const loadingOverlay = document.getElementById('loadingOverlay');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const repoUrl = document.getElementById('repoUrl').value;
    const authorName = document.getElementById('authorName').value;
    const authorEmail = document.getElementById('authorEmail').value;

    if (!repoUrl || !authorName) {
      alert('레포지토리 URL과 작성자 이름을 모두 입력해주세요.');
      return;
    }

    try {
      showLoading(true);
      
      const response = await fetch('/v1/api/git/analyze/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repoUrl,
          authorName,
          authorEmail: authorEmail || undefined
        })
      });

      const data = await response.json();
      console.log('Backend Response Data:', data);

      if (data.resultType === 'SUCCESS') {
        renderReport(data.success.report);
        reportContainer.classList.add('visible');
        // 스크롤을 리포트 시작 부분으로 이동
        reportContainer.scrollIntoView({ behavior: 'smooth' });
      } else {
        alert('분석에 실패했습니다: ' + (data.error?.reason || '알 수 없는 오류'));
      }

    } catch (error) {
      console.error('Error:', error);
      alert('서버 통신 중 오류가 발생했습니다.');
    } finally {
      showLoading(false);
    }
  });

  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }

  function renderReport(report) {
    // 1. 헤더
    document.getElementById('reportTitle').textContent = report.reportTitle;
    document.getElementById('reportDate').textContent = `생성일: ${new Date().toLocaleDateString()}`; // API에 생성일이 없다면 현재 날짜

    // 2. 프로젝트 개요
    document.getElementById('projectGoal').textContent = report.projectGoal;
    
    // 기술 스택 테이블
    renderTechStack(report.techStack);
    
    // 프로젝트 규모 테이블
    renderProjectScale(report.projectScale);

    // 3. 구현 기능 상세
    renderFeatures(report.implementedFeatures);

    // 4. 프로젝트 분석 요약
    renderContributions(report.myContributions, report.othersContributions);

    // 5. 코드 분석 인사이트
    renderInsights(report.codeAnalysisInsights);

    // 6. 개선 가능한 영역
    renderImprovements(report.improvementAreas);

    // 7. 다음 프로젝트 추천
    renderRecommendations(report.recommendationsForNextProject);
  }

  function renderTechStack(techStack) {
    const tbody = document.getElementById('techStackBody');
    tbody.innerHTML = '';
    
    const categories = [
      { key: 'language', label: '언어' },
      { key: 'framework', label: '프레임워크' },
      { key: 'library', label: '라이브러리' },
      { key: 'database', label: '데이터베이스' },
      { key: 'tools', label: '도구/인프라' }
    ];

    categories.forEach(cat => {
      const items = techStack[cat.key];
      if (items && items.length > 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <th>${cat.label}</th>
          <td>${items.join(', ')}</td>
        `;
        tbody.appendChild(tr);
      }
    });
  }

  function renderProjectScale(scale) {
    const tbody = document.getElementById('scaleBody');
    tbody.innerHTML = '';

    const fields = [
      { key: 'totalCodeLines', label: '총 코드 라인', format: val => `${val.toLocaleString()}줄` },
      { key: 'mainCodeFiles', label: '주요 코드 파일', format: val => `${val}개` },
      { key: 'developmentPeriod', label: '개발 기간' },
      { key: 'architecturePattern', label: '아키텍처 패턴' }
    ];

    fields.forEach(field => {
      if (scale[field.key]) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <th>${field.label}</th>
          <td>${field.format ? field.format(scale[field.key]) : scale[field.key]}</td>
        `;
        tbody.appendChild(tr);
      }
    });
  }

  function renderFeatures(features) {
    const container = document.getElementById('featuresContainer');
    container.innerHTML = '';

    features.forEach(feature => {
      const div = document.createElement('div');
      div.className = 'feature-box';
      div.innerHTML = `
        <div class="feature-header">
          <i class="fas fa-check-circle"></i> ${feature.feature}
        </div>
        <div class="feature-content">
          <p><strong>구현 내용:</strong> ${feature.description}</p>
          <p><strong>구현 방식:</strong> ${feature.implementationMethod}</p>
          <div class="code-location">
            <i class="fas fa-code"></i> <strong>코드 위치:</strong><br>
            ${feature.codeLocation.map(loc => `• ${loc}`).join('<br>')}
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function renderContributions(my, others) {
    const myContainer = document.getElementById('myContributions');
    const othersContainer = document.getElementById('othersContributions');
    
    myContainer.innerHTML = my.map(item => `<li>${item}</li>`).join('');
    othersContainer.innerHTML = others.map(item => `<li>${item}</li>`).join('');
  }

  function renderInsights(insights) {
    const container = document.getElementById('insightsContainer');
    container.innerHTML = '';

    const items = [
      { title: '코드 품질', content: insights.codeQuality },
      { title: '주요 패턴', content: insights.patterns.join(', ') },
      { title: '강점', content: insights.strengths.join(', ') },
      { title: '우려 사항', content: insights.concerns.join(', ') }
    ];

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'insight-card';
      div.innerHTML = `
        <div class="insight-title">${item.title}</div>
        <div>${item.content}</div>
      `;
      container.appendChild(div);
    });
  }

  function renderImprovements(improvements) {
    const container = document.getElementById('improvementsContainer');
    container.innerHTML = '';

    improvements.forEach(imp => {
      const div = document.createElement('div');
      div.className = 'insight-card'; // 재사용
      div.style.borderLeftColor = '#f39c12'; // 색상 변경
      div.innerHTML = `
        <div class="insight-title">${imp.area}</div>
        <p><strong>현재 상태:</strong> ${imp.currentState}</p>
        <p><strong>제안:</strong> ${imp.suggestion}</p>
      `;
      container.appendChild(div);
    });
  }

  function renderRecommendations(recommendations) {
    const container = document.getElementById('recommendationsContainer');
    container.innerHTML = '';

    const ul = document.createElement('ul');
    recommendations.forEach(rec => {
      const li = document.createElement('li');
      li.style.marginBottom = '10px';
      li.innerHTML = `<strong>${rec.technology}</strong>: ${rec.reason}`;
      ul.appendChild(li);
    });
    container.appendChild(ul);
  }
});
