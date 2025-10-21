document.addEventListener("DOMContentLoaded", () => {
  const API_URL = 'https://script.google.com/macros/s/AKfycbwfqm6JLNMXqL1MTumvEMuCp_IeBnddDMmIKocbQaMqOzXXayFz9DzdUWHnyt4LZEZ6AA/exec';
  
  const form = document.getElementById("petSurveyForm");
  const msg = document.getElementById("msg");
  const submissionsList = document.getElementById("submissionsList");
  const regionOtherInput = document.querySelector('input[name="regionOther"]');
  const tabBtns = document.querySelectorAll(".tab-btn");

  // 로컬 배열에 서버 데이터를 저장
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

  // 1. 서버 데이터 가져오기
  const fetchSubmissions = async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (Array.isArray(data)) {
        localSubmissions = data;
      }
    } catch (error) {
      console.error("서버 데이터 로딩 오류:", error);
    }
  };

  // 2. "기타" 입력 토글
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

  // 3. 폼 제출
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

      // 로컬 배열에 추가
      localSubmissions.push(payload);

      msg.textContent = "💌 제출이 완료되었습니다!";
      form.reset();
      regionOtherInput.style.display = "none";

      // 제출 후 바로 submissions 탭 업데이트
      renderSubmissions();
      renderCharts();
      document.querySelector('.tab-btn[data-target="submissions"]').classList.add("active");
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove("active"));
      document.getElementById("submissions").classList.add("active");
    } catch (error) {
      msg.textContent = "❌ 제출 오류. 콘솔 확인.";
      console.error(error);
    }
  });

  // 4. submissions 렌더링
  const renderSubmissions = () => {
    submissionsList.innerHTML = "";
    localSubmissions.slice().reverse().forEach((sub, idx) => {
      const card = document.createElement("div");
      card.className = "record";
      let html = Object.entries(sub)
        .filter(([k,v]) => !(k === "regionOther" && sub.region !== "기타") && v !== "")
        .map(([k,v]) => `<div><strong>${keyMap[k]||k}:</strong> ${v}</div>`)
        .join("");
      if (!html) html = "<div>제출된 정보 없음</div>";
      card.innerHTML = html;
      submissionsList.appendChild(card);
    });
  };

  // 5. 그래프 렌더링
  const renderCharts = () => {
    const regionCount = {};
    const priceCount = {};

    localSubmissions.forEach(sub => {
      const reg = sub.region === "기타" ? sub.regionOther : sub.region;
      if (reg) regionCount[reg] = (regionCount[reg] || 0) + 1;
      if (sub.priceRange) priceCount[sub.priceRange] = (priceCount[sub.priceRange] || 0) + 1;
    });

    const renderBarChart = (ctxId, labels, data, color) => {
      const ctx = document.getElementById(ctxId).getContext("2d");
      if (window[ctxId]) window[ctxId].destroy();
      window[ctxId] = new Chart(ctx, {
        type: "bar",
        data: { labels: labels, datasets: [{ label: "응답 수", data: data, backgroundColor: color }] },
        options: { responsive: true, plugins: { legend: { display: false } } }
      });
    };

    renderBarChart("regionChart", Object.keys(regionCount), Object.values(regionCount), "rgba(255,77,79,0.7)");
    renderBarChart("priceChart", Object.keys(priceCount), Object.values(priceCount), "rgba(255,159,67,0.7)");
  };

  // 6. 탭 클릭 이벤트
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");

      if (btn.dataset.target === "submissions") {
        renderSubmissions();
        renderCharts();
      }
    });
  });

  // 초기 서버 데이터 로드
  fetchSubmissions();
});
