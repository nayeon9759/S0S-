document.addEventListener("DOMContentLoaded", () => {
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';
  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");
  const regionStatsDiv = document.getElementById("regionStats");
  const priceStatsDiv = document.getElementById("priceStats");

  let localSubmissions = [];

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

  const fetchSubmissions = async () => {
    try {
      const uniqueApiUrl = `${API_URL}?t=${Date.now()}`;
      if (submissionsList) submissionsList.innerHTML = '<div class="placeholder">제출된 기록을 불러오는 중입니다...</div>';
      if (regionStatsDiv) regionStatsDiv.innerHTML = '<div class="stat-placeholder">데이터 분석 중...</div>';
      if (priceStatsDiv) priceStatsDiv.innerHTML = '<div class="stat-placeholder">데이터 분석 중...</div>';

      const res = await fetch(uniqueApiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (Array.isArray(data)) {
        localSubmissions = data;
        renderSubmissions();
        renderStats();
      } else {
        if (submissionsList) submissionsList.innerHTML = '<div class="placeholder">데이터 로딩 실패: 서버 응답 형식 오류</div>';
        if (regionStatsDiv) regionStatsDiv.innerHTML = '<div class="stat-placeholder">로딩 오류</div>';
        if (priceStatsDiv) priceStatsDiv.innerHTML = '<div class="stat-placeholder">로딩 오류</div>';
      }
    } catch (err) {
      console.error("fetchSubmissions error:", err);
      if (submissionsList) submissionsList.innerHTML = '<div class="placeholder">네트워크 오류로 데이터를 불러올 수 없습니다.</div>';
      if (regionStatsDiv) regionStatsDiv.innerHTML = '<div class="stat-placeholder">네트워크 오류</div>';
      if (priceStatsDiv) priceStatsDiv.innerHTML = '<div class="stat-placeholder">네트워크 오류</div>';
    }
  };

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (msg) msg.textContent = "✅ 제출 중...";

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

      if (msg) msg.textContent = "💌 제출이 완료되었습니다! 데이터 갱신 중...";
      form.reset();
      regionOtherInput.style.display = "none";

      await fetchSubmissions();

      // 탭 전환
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      const btn = document.querySelector('.tab-btn[data-target="submissions"]');
      if (btn) {
        btn.classList.add("active");
        const panel = document.getElementById("submissions");
        if (panel) panel.classList.add("active");
      }
    } catch (err) {
      console.error("submit error:", err);
      if (msg) msg.textContent = "⚠️ 서버 응답 오류 발생. 데이터 갱신을 시도합니다.";
      await fetchSubmissions();
    }
  });

  const renderSubmissions = () => {
    if (!submissionsList) return;
    submissionsList.innerHTML = "";
    if (!localSubmissions || localSubmissions.length === 0) {
      submissionsList.innerHTML = '<div class="placeholder">제출된 기록이 없습니다.</div>';
      return;
    }
    localSubmissions.slice().reverse().forEach(sub => {
      const card = document.createElement("div");
      card.className = "record";
      const html = Object.entries(sub)
        .filter(([k, v]) => !(k === "regionOther" && sub.region !== "기타") && v !== "")
        .map(([k, v]) => `<div class="record-item"><strong>${keyMap[k] || k}:</strong> ${v}</div>`)
        .join("");
      card.innerHTML = html || "<div>제출된 정보 없음</div>";
      submissionsList.appendChild(card);
    });
  };

  const renderStats = () => {
    if (!localSubmissions) return;
    const regionCount = {};
    const priceCount = {};
    const total = localSubmissions.length;

    localSubmissions.forEach(sub => {
      const reg = (sub.region === "기타" && sub.regionOther) ? sub.regionOther : sub.region;
      if (reg) regionCount[reg] = (regionCount[reg] || 0) + 1;
      if (sub.priceRange) priceCount[sub.priceRange] = (priceCount[sub.priceRange] || 0) + 1;
    });

    if (total === 0) {
      if (regionStatsDiv) regionStatsDiv.innerHTML = '<div class="stat-placeholder">데이터가 충분하지 않습니다.</div>';
      if (priceStatsDiv) priceStatsDiv.innerHTML = '<div class="stat-placeholder">데이터가 충분하지 않습니다.</div>';
      return;
    }

    // region top3
    const sortedRegions = Object.entries(regionCount).sort((a,b) => b[1]-a[1]).slice(0,3);
    if (regionStatsDiv) {
      regionStatsDiv.innerHTML = sortedRegions.map(([r,c], i) => {
        const pct = ((c/total)*100).toFixed(1);
        const emoji = ['🥇','🥈','🥉'][i] || '🔹';
        return `<div class="stat-item"><div class="stat-label">${emoji} ${r} (${c}명)</div>
                <div class="progress-bar-container"><div class="progress-bar" style="width:${pct}%;" data-label="${pct}%"></div></div></div>`;
      }).join('');
    }

    // price
    const priceLabelsOrdered = ["50만원 미만","50만원 ~ 100만원","100만원 ~ 200만원","200만원 이상"];
    if (priceStatsDiv) {
      priceStatsDiv.innerHTML = priceLabelsOrdered.map(lbl => {
        const c = priceCount[lbl] || 0;
        const pct = ((c/total)*100).toFixed(1);
        return `<div class="stat-item"><div class="stat-label">💵 ${lbl} (${c}명)</div>
                <div class="progress-bar-container"><div class="progress-bar accent" style="width:${pct}%;" data-label="${pct}%"></div></div></div>`;
      }).join('');
    }
  };

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById(btn.dataset.target);
      if (panel) panel.classList.add("active");
      if (btn.dataset.target === "submissions") fetchSubmissions();
    });
  });

  // 초기 로드
  fetchSubmissions();
});
