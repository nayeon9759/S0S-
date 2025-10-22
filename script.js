document.addEventListener("DOMContentLoaded", () => {
  // Google Apps Script URL (고객님의 기존 URL 유지)
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';
  
  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");
  // ⭐️ 새로운 통계 요소 추가
  const regionStatsDiv = document.getElementById("regionStats");
  const priceStatsDiv = document.getElementById("priceStats");


  // 로컬 배열에 서버 데이터를 저장 (이 배열을 기반으로 목록과 그래프를 그림)
  let localSubmissions = [];

  // Key map (라벨)
  const keyMap = {
    hasPet: "반려동물 보유",
    region: "지역",
    regionOther: "직접 입력 지역",
    priorityCriteria: "병원 선택 기준",
    concernAndFeature: "불만/필요 기능",
    priority1: "1순위 정보",
    priority2: "2순위 정보",
    priceRange: "최대 지불 의향"
  };

  /**
   * 1. 서버에서 최신 데이터를 가져와 localSubmissions를 갱신하고, 화면을 다시 그리는 핵심 함수
   */
  const fetchSubmissions = async () => {
    try {
      // 캐시를 강제로 우회하는 쿼리 파라미터를 추가합니다.
      const uniqueApiUrl = `${API_URL}?t=${new Date().getTime()}`;
      submissionsList.innerHTML = '<div class="placeholder">제출된 기록을 불러오는 중입니다...</div>'; // 로딩 메시지
      regionStatsDiv.innerHTML = '<div class="stat-placeholder">데이터 분석 중...</div>';
      priceStatsDiv.innerHTML = '<div class="stat-placeholder">데이터 분석 중...</div>';

      const res = await fetch(uniqueApiUrl);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        localSubmissions = data; // ⭐️ 서버의 전체 데이터로 로컬 배열 갱신
        renderSubmissions(); // 목록 갱신
        renderStats();      // ⭐️ 통계 시각화 갱신
      } else {
        submissionsList.innerHTML = '<div class="placeholder">데이터 로딩 실패. 서버 응답을 확인하세요.</div>';
        regionStatsDiv.innerHTML = '<div class="stat-placeholder">로딩 오류</div>';
        priceStatsDiv.innerHTML = '<div class="stat-placeholder">로딩 오류</div>';
      }
    } catch (error) {
      console.error("서버 데이터 로딩 오류:", error);
      submissionsList.innerHTML = '<div class="placeholder">네트워크 오류로 데이터를 불러올 수 없습니다.</div>';
      regionStatsDiv.innerHTML = '<div class="stat-placeholder">네트워크 오류</div>';
      priceStatsDiv.innerHTML = '<div class="stat-placeholder">네트워크 오류</div>';
    }
  };

  // 2. "기타" 입력 토글 (기존 유지)
  document.querySelectorAll('input[name="region"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === "기타") {
        regionOtherInput.style.display = "block";
        regionOtherInput.required = true;
      } else {
        regionOtherInput.style.display = "none";
        regionOtherInput.required = false;
      }
    });
  });

  // 3. 폼 제출 (기존 로직 유지)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "✅ 제출 중...";

    const data = new FormData(form);
    const payload = {};
    for (const [k, v] of data.entries()) payload[k] = v;

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      msg.textContent = "💌 제출이 완료되었습니다! 데이터 갱신 중...";
      form.reset();
      regionOtherInput.style.display = "none";

      await fetchSubmissions(); 

      // '다른 사람 의견 보기' 탭으로 전환
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      document.querySelector('.tab-btn[data-target="submissions"]').classList.add("active");
      document.getElementById("submissions").classList.add("active");

    } catch (error) {
      msg.textContent = "⚠️ 서버 응답 오류 발생. 데이터 갱신을 시도합니다.";
      await fetchSubmissions(); 
      // 탭 활성화 로직 유지
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      document.querySelector('.tab-btn[data-target="submissions"]').classList.add("active");
      document.getElementById("submissions").classList.add("active");
    }
  });

  // 4. submissions 렌더링 (기존 로직 유지)
  const renderSubmissions = () => {
    submissionsList.innerHTML = "";
    
    if (localSubmissions.length === 0) {
        submissionsList.innerHTML = '<div class="placeholder">제출된 기록이 없습니다.</div>';
        return;
    }
    
    // 목록을 최신순으로 렌더링
    localSubmissions.slice().reverse().forEach((sub) => {
      const card = document.createElement("div");
      card.className = "record";
      let html = Object.entries(sub)
        // 불필요한 값 필터링
        .filter(([k,v]) => !(k === "regionOther" && sub.region !== "기타") && v !== "")
        .map(([k,v]) => `<div class="record-item"><strong>${keyMap[k]||k}:</strong> ${v}</div>`)
        .join("");
      if (!html) html = "<div>제출된 정보 없음</div>";
      card.innerHTML = html;
      submissionsList.appendChild(card);
    });
  };
  
  // ⭐️ 5. 새로운 통계 시각화 렌더링 함수
  const renderStats = () => {
    // 데이터 집계
    const regionCount = {};
    const priceCount = {};
    const totalCount = localSubmissions.length;

    localSubmissions.forEach(sub => {
      // 지역 집계 (기타 처리 포함)
      const reg = sub.region === "기타" && sub.regionOther ? sub.regionOther : sub.region;
      if (reg) regionCount[reg] = (regionCount[reg] || 0) + 1;
      // 금액 집계
      if (sub.priceRange) priceCount[sub.priceRange] = (priceCount[sub.priceRange] || 0) + 1;
    });

    if (totalCount === 0) {
      regionStatsDiv.innerHTML = '<div class="stat-placeholder">데이터가 충분하지 않습니다.</div>';
      priceStatsDiv.innerHTML = '<div class="stat-placeholder">데이터가 충분하지 않습니다.</div>';
      return;
    }

    // 5-1. 지역 통계 렌더링
    const sortedRegions = Object.entries(regionCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3); // Top 3 지역만 표시

    regionStatsDiv.innerHTML = sortedRegions.map(([region, count], index) => {
      const percentage = ((count / totalCount) * 100).toFixed(1);
      const rankEmoji = ['🥇', '🥈', '🥉'][index] || '🔹';
      return `
        <div class="stat-item">
          <div class="stat-label">${rankEmoji} ${region} (${count}명)</div>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width:${percentage}%;" data-label="${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
    
    // 5-2. 지불 의향 금액 통계 렌더링
    const priceLabelsOrdered = ["50만원 미만", "50만원 ~ 100만원", "100만원 ~ 200만원", "200만원 이상"];
    
    priceStatsDiv.innerHTML = priceLabelsOrdered.map(label => {
      const count = priceCount[label] || 0;
      const percentage = ((count / totalCount) * 100).toFixed(1);
      const icon = '💵';
      return `
        <div class="stat-item">
          <div class="stat-label">${icon} ${label} (${count}명)</div>
          <div class="progress-bar-container">
            <div class="progress-bar accent" style="width:${percentage}%;" data-label="${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');
  };
  // ⭐️ /새로운 통계 시각화 렌더링 함수

  // 6. 탭 클릭 이벤트 (기존 로직 유지)
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");

      if (btn.dataset.target === "submissions") {
        // submissions 탭을 누를 때마다 서버에서 최신 데이터를 가져옵니다.
        fetchSubmissions(); 
      }
    });
  });

  // 초기 서버 데이터 로드 (페이지 로드 시 데이터 한번 가져오기)
  fetchSubmissions();
});
