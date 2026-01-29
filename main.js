// 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.game}-game`).classList.add('active');

    // petal 탭이 선택되면 자동으로 꽃잎 게임 시작
    if (btn.dataset.game === 'petal') {
      startPetalGame();
    }
  });
});

// ==================== 사다리타기 ====================
let ladderData = {
  count: 0,
  mode: 'number', // 'number', 'name'
  topLabels: [],
  bottomLabels: [],
  bridges: [],
  mappings: [],
  revealedItems: [],
  isAnimating: false
};

// 경로 색상 팔레트
const pathColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#10AC84', '#EE5A24', '#0ABDE3', '#F8B500', '#8395A7'
];

// Step 1: 인원수 확인
document.getElementById('confirm-count').addEventListener('click', () => {
  const count = parseInt(document.getElementById('ladder-count').value);

  if (count < 2 || count > 20 || isNaN(count)) {
    alert('2명에서 20명 사이로 입력해주세요!');
    return;
  }

  ladderData.count = count;
  ladderData.mode = 'number';
  showStep2();
});

// Enter 키로도 확인
document.getElementById('ladder-count').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('confirm-count').click();
  }
});

function showStep2() {
  document.getElementById('ladder-step1').style.display = 'none';
  document.getElementById('ladder-step2').style.display = 'block';
  document.getElementById('ladder-step3').style.display = 'none';

  // 모드 버튼 초기화
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === 'number') btn.classList.add('active');
  });

  // 빠른 입력 기본값 설정
  document.getElementById('win-count').value = 1;
  document.getElementById('lose-count').value = ladderData.count - 1;

  ladderData.mode = 'number';
  renderTopLabels();
  renderBottomLabels();
  drawPreviewLadder();
}

// 모드 선택
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ladderData.mode = btn.dataset.mode;
    renderTopLabels();
  });
});

// 상단 라벨 렌더링
function renderTopLabels() {
  const container = document.getElementById('top-labels');
  container.innerHTML = '';

  for (let i = 0; i < ladderData.count; i++) {
    const item = document.createElement('div');
    item.className = 'label-item';

    if (ladderData.mode === 'number') {
      const label = document.createElement('div');
      label.className = 'number-label';
      label.textContent = i + 1;
      item.appendChild(label);
    } else if (ladderData.mode === 'name') {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `이름 ${i + 1}`;
      input.id = `top-input-${i}`;
      item.appendChild(input);
    }

    container.appendChild(item);
  }
}

// 하단 라벨 (결과) 렌더링
function renderBottomLabels() {
  const container = document.getElementById('bottom-labels');
  container.innerHTML = '';

  for (let i = 0; i < ladderData.count; i++) {
    const item = document.createElement('div');
    item.className = 'label-item';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `결과 ${i + 1}`;
    input.id = `bottom-input-${i}`;
    item.appendChild(input);

    container.appendChild(item);
  }
}

// 빠른 입력 (당첨/꽝) 적용
document.getElementById('apply-quick-fill').addEventListener('click', applyQuickFill);

function applyQuickFill() {
  const winCount = parseInt(document.getElementById('win-count').value) || 0;
  const loseCount = parseInt(document.getElementById('lose-count').value) || 0;
  const total = winCount + loseCount;

  if (total !== ladderData.count) {
    alert(`당첨(${winCount}) + 꽝(${loseCount}) = ${total}개\n인원수(${ladderData.count}명)와 맞지 않습니다!`);
    return;
  }

  // 결과 배열 생성
  const results = [];
  for (let i = 0; i < winCount; i++) {
    results.push('당첨');
  }
  for (let i = 0; i < loseCount; i++) {
    results.push('꽝');
  }

  // 입력 필드에 적용
  for (let i = 0; i < ladderData.count; i++) {
    const input = document.getElementById(`bottom-input-${i}`);
    input.value = results[i];
  }
}

// 미리보기 사다리 그리기 (세로선만)
function drawPreviewLadder() {
  const canvas = document.getElementById('ladder-canvas');
  const ctx = canvas.getContext('2d');

  const count = ladderData.count;
  const colWidth = Math.max(50, Math.min(80, 700 / count));
  const height = 300;
  const padding = 30;

  canvas.width = colWidth * (count - 1) + padding * 2;
  canvas.height = height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 세로선 그리기
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 3;

  for (let i = 0; i < count; i++) {
    const x = padding + i * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, 20);
    ctx.lineTo(x, height - 20);
    ctx.stroke();
  }
}

// Step 1로 돌아가기
document.getElementById('back-to-step1').addEventListener('click', () => {
  document.getElementById('ladder-step1').style.display = 'block';
  document.getElementById('ladder-step2').style.display = 'none';
  document.getElementById('ladder-step3').style.display = 'none';
});

// 사다리타기 시작
document.getElementById('start-ladder').addEventListener('click', startLadderGame);

function startLadderGame() {
  // 상단 라벨 수집
  ladderData.topLabels = [];
  for (let i = 0; i < ladderData.count; i++) {
    if (ladderData.mode === 'name') {
      const input = document.getElementById(`top-input-${i}`);
      ladderData.topLabels.push(input.value.trim() || `${i + 1}`);
    } else {
      ladderData.topLabels.push(`${i + 1}`);
    }
  }

  // 하단 라벨(결과) 수집 및 셔플
  ladderData.bottomLabels = [];
  for (let i = 0; i < ladderData.count; i++) {
    const input = document.getElementById(`bottom-input-${i}`);
    ladderData.bottomLabels.push(input.value.trim() || `결과 ${i + 1}`);
  }
  ladderData.bottomLabels = shuffleArray([...ladderData.bottomLabels]);

  // 다리 생성
  generateBridges();
  calculateMappings();

  // 초기화
  ladderData.revealedItems = [];
  ladderData.isAnimating = false;

  // Step 3로 이동
  document.getElementById('ladder-step2').style.display = 'none';
  document.getElementById('ladder-step3').style.display = 'block';

  renderGameArea();
  document.getElementById('ladder-result-message').textContent = '';
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateBridges() {
  const count = ladderData.count;
  const numRows = Math.max(8, Math.min(12, count + 4));
  ladderData.bridges = [];

  for (let row = 0; row < numRows; row++) {
    const rowBridges = [];
    for (let col = 0; col < count - 1; col++) {
      // 연속된 다리가 생기지 않도록
      if (rowBridges.length > 0 && rowBridges[col - 1]) {
        rowBridges.push(false);
      } else {
        rowBridges.push(Math.random() > 0.5);
      }
    }
    ladderData.bridges.push(rowBridges);
  }
}

function calculateMappings() {
  ladderData.mappings = [];
  const count = ladderData.count;
  const numRows = ladderData.bridges.length;

  for (let start = 0; start < count; start++) {
    let current = start;

    for (let row = 0; row < numRows; row++) {
      if (current > 0 && ladderData.bridges[row][current - 1]) {
        current--;
      } else if (current < count - 1 && ladderData.bridges[row][current]) {
        current++;
      }
    }

    ladderData.mappings.push(current);
  }
}

// 게임 영역 렌더링
function renderGameArea() {
  renderTopLabelsDisplay();
  drawGameLadder();
  renderBottomLabelsDisplay();
}

function renderTopLabelsDisplay() {
  const container = document.getElementById('top-labels-display');
  container.innerHTML = '';

  for (let i = 0; i < ladderData.count; i++) {
    const item = document.createElement('div');
    item.className = 'label-item';
    item.dataset.index = i;

    if (ladderData.mode === 'number') {
      const label = document.createElement('div');
      label.className = 'number-label';
      if (ladderData.revealedItems.includes(i)) {
        label.classList.add('revealed');
        label.style.background = '#aaa';
      }
      label.textContent = ladderData.topLabels[i];
      label.style.cursor = 'pointer';
      label.addEventListener('click', () => runLadder(i));
      item.appendChild(label);
    } else {
      const label = document.createElement('div');
      label.className = 'name-label';
      if (ladderData.revealedItems.includes(i)) {
        label.classList.add('revealed');
      }
      label.textContent = ladderData.topLabels[i];
      label.addEventListener('click', () => runLadder(i));
      item.appendChild(label);
    }

    container.appendChild(item);
  }
}

function renderBottomLabelsDisplay() {
  const container = document.getElementById('bottom-labels-display');
  container.innerHTML = '';

  for (let i = 0; i < ladderData.count; i++) {
    const label = document.createElement('div');
    label.className = 'result-label';
    label.dataset.index = i;

    // 공개된 결과인지 확인
    const revealedIdx = ladderData.revealedItems.find(
      idx => ladderData.mappings[idx] === i
    );

    if (revealedIdx !== undefined) {
      label.textContent = ladderData.bottomLabels[i];
      label.classList.add('revealed');
    } else {
      label.textContent = '?';
    }

    container.appendChild(label);
  }
}

function drawGameLadder() {
  const canvas = document.getElementById('ladder-canvas-game');
  const ctx = canvas.getContext('2d');

  const count = ladderData.count;
  const colWidth = Math.max(50, Math.min(80, 700 / count));
  const rowHeight = 30;
  const padding = 30;
  const numRows = ladderData.bridges.length;

  canvas.width = colWidth * (count - 1) + padding * 2;
  canvas.height = rowHeight * (numRows + 1) + padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 세로선 그리기
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 3;

  for (let i = 0; i < count; i++) {
    const x = padding + i * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvas.height - padding);
    ctx.stroke();
  }

  // 가로선(다리) 그리기
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 3;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < count - 1; col++) {
      if (ladderData.bridges[row][col]) {
        const x1 = padding + col * colWidth;
        const x2 = padding + (col + 1) * colWidth;
        const y = padding + (row + 1) * rowHeight;

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
    }
  }
}

function runLadder(startIndex) {
  if (ladderData.isAnimating) return;
  if (ladderData.revealedItems.includes(startIndex)) return;

  ladderData.isAnimating = true;

  const canvas = document.getElementById('ladder-canvas-game');
  const ctx = canvas.getContext('2d');

  const count = ladderData.count;
  const colWidth = Math.max(50, Math.min(80, 700 / count));
  const rowHeight = 30;
  const padding = 30;
  const numRows = ladderData.bridges.length;

  // 경로 계산
  let current = startIndex;
  const path = [{ x: padding + current * colWidth, y: padding }];

  for (let row = 0; row < numRows; row++) {
    const y = padding + (row + 1) * rowHeight;

    if (current > 0 && ladderData.bridges[row][current - 1]) {
      path.push({ x: padding + current * colWidth, y: y });
      current--;
      path.push({ x: padding + current * colWidth, y: y });
    } else if (current < count - 1 && ladderData.bridges[row][current]) {
      path.push({ x: padding + current * colWidth, y: y });
      current++;
      path.push({ x: padding + current * colWidth, y: y });
    }
  }

  path.push({ x: padding + current * colWidth, y: canvas.height - padding });

  const finalIndex = current;
  const pathColor = '#ff4757';

  // 애니메이션
  let pathIdx = 0;

  function animate() {
    if (pathIdx >= path.length - 1) {
      // 결과 공개
      ladderData.revealedItems.push(startIndex);
      renderTopLabelsDisplay();
      renderBottomLabelsDisplay();

      // 결과 메시지
      const topLabel = ladderData.topLabels[startIndex];
      document.getElementById('ladder-result-message').textContent =
        `${topLabel} → ${ladderData.bottomLabels[finalIndex]}`;

      ladderData.isAnimating = false;
      return;
    }

    ctx.strokeStyle = pathColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(path[pathIdx].x, path[pathIdx].y);
    ctx.lineTo(path[pathIdx + 1].x, path[pathIdx + 1].y);
    ctx.stroke();

    pathIdx++;
    setTimeout(animate, 60);
  }

  animate();
}

// 전체 결과 보기
document.getElementById('show-all-results').addEventListener('click', showAllResults);

function showAllResults() {
  if (ladderData.isAnimating) return;

  const canvas = document.getElementById('ladder-canvas-game');
  const ctx = canvas.getContext('2d');

  const count = ladderData.count;
  const colWidth = Math.max(50, Math.min(80, 700 / count));
  const rowHeight = 30;
  const padding = 30;
  const numRows = ladderData.bridges.length;

  // 모든 경로 그리기
  for (let start = 0; start < count; start++) {
    if (ladderData.revealedItems.includes(start)) continue;

    let current = start;
    const path = [{ x: padding + current * colWidth, y: padding }];

    for (let row = 0; row < numRows; row++) {
      const y = padding + (row + 1) * rowHeight;

      if (current > 0 && ladderData.bridges[row][current - 1]) {
        path.push({ x: padding + current * colWidth, y: y });
        current--;
        path.push({ x: padding + current * colWidth, y: y });
      } else if (current < count - 1 && ladderData.bridges[row][current]) {
        path.push({ x: padding + current * colWidth, y: y });
        current++;
        path.push({ x: padding + current * colWidth, y: y });
      }
    }

    path.push({ x: padding + current * colWidth, y: canvas.height - padding });

    // 경로 색상
    const pathColor = pathColors[start % pathColors.length];

    ctx.strokeStyle = pathColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    for (let i = 0; i < path.length - 1; i++) {
      ctx.beginPath();
      ctx.moveTo(path[i].x, path[i].y);
      ctx.lineTo(path[i + 1].x, path[i + 1].y);
      ctx.stroke();
    }

    ladderData.revealedItems.push(start);
  }

  // 모든 결과 공개
  renderTopLabelsDisplay();
  renderBottomLabelsDisplay();

  // 전체 결과 메시지
  let message = '';
  for (let i = 0; i < count; i++) {
    const resultIdx = ladderData.mappings[i];
    const topLabel = ladderData.topLabels[i];
    message += `${topLabel}→${ladderData.bottomLabels[resultIdx]}  `;
  }
  document.getElementById('ladder-result-message').textContent = message;
}

// 다시하기
document.getElementById('reset-ladder').addEventListener('click', () => {
  document.getElementById('ladder-step1').style.display = 'block';
  document.getElementById('ladder-step2').style.display = 'none';
  document.getElementById('ladder-step3').style.display = 'none';

  ladderData = {
    count: 0,
    mode: 'number',
    topLabels: [],
    bottomLabels: [],
    bridges: [],
    mappings: [],
    revealedItems: [],
    isAnimating: false
  };

  document.getElementById('ladder-result-message').textContent = '';
});

// ==================== 룰렛 돌리기 ====================
let rouletteData = {
  items: [],
  canvas: null,
  ctx: null,
  rotation: 0,
  isSpinning: false
};

const rouletteColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
];

document.getElementById('create-roulette').addEventListener('click', createRoulette);

function createRoulette() {
  const itemsInput = document.getElementById('roulette-items').value;
  const items = itemsInput.split(',').map(i => i.trim()).filter(i => i);

  if (items.length < 2) {
    alert('항목을 2개 이상 입력해주세요!');
    return;
  }

  rouletteData.items = items;
  rouletteData.rotation = 0;
  drawRoulette();

  document.getElementById('spin-roulette').style.display = 'block';
  document.getElementById('roulette-result-message').textContent = '';
}

function drawRoulette() {
  const canvas = document.getElementById('roulette-canvas');
  const ctx = canvas.getContext('2d');
  rouletteData.canvas = canvas;
  rouletteData.ctx = ctx;

  const size = 300;
  canvas.width = size;
  canvas.height = size;

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 10;

  ctx.clearRect(0, 0, size, size);

  const numItems = rouletteData.items.length;
  const anglePerItem = (2 * Math.PI) / numItems;

  for (let i = 0; i < numItems; i++) {
    const startAngle = rouletteData.rotation + i * anglePerItem - Math.PI / 2;
    const endAngle = startAngle + anglePerItem;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = rouletteColors[i % rouletteColors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + anglePerItem / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;

    const text = rouletteData.items[i];
    const maxLength = 8;
    const displayText = text.length > maxLength ? text.substring(0, maxLength) + '..' : text;
    ctx.fillText(displayText, radius - 20, 5);
    ctx.restore();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 3;
  ctx.stroke();
}

document.getElementById('spin-roulette').addEventListener('click', spinRoulette);

function spinRoulette() {
  if (rouletteData.isSpinning) return;

  rouletteData.isSpinning = true;
  document.getElementById('roulette-result-message').textContent = '';

  const totalRotation = Math.PI * 2 * (5 + Math.random() * 5);
  const duration = 4000;
  const startTime = Date.now();
  const startRotation = rouletteData.rotation;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    rouletteData.rotation = startRotation + totalRotation * easeProgress;
    drawRoulette();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rouletteData.isSpinning = false;

      const numItems = rouletteData.items.length;
      const anglePerItem = (2 * Math.PI) / numItems;
      const normalizedRotation = rouletteData.rotation % (2 * Math.PI);
      const pointerAngle = Math.PI / 2;
      let selectedIndex = Math.floor((pointerAngle - normalizedRotation + 2 * Math.PI) % (2 * Math.PI) / anglePerItem);
      selectedIndex = selectedIndex % numItems;

      document.getElementById('roulette-result-message').textContent =
        `${rouletteData.items[selectedIndex]}`;
    }
  }

  animate();
}

// ==================== 랜덤 메뉴 생성기 ====================
const menuData = {
  korean: {
    name: '한식',
    items: ['김치찌개', '된장찌개', '비빔밥', '불고기', '삼겹살', '갈비찜', '제육볶음', '김치볶음밥', '순두부찌개', '부대찌개', '냉면', '칼국수', '삼계탕', '육개장', '갈비탕', '설렁탕', '감자탕', '해장국', '청국장', '쌈밥']
  },
  chinese: {
    name: '중식',
    items: ['짜장면', '짬뽕', '탕수육', '마라탕', '볶음밥', '깐풍기', '유린기', '양장피', '마파두부', '군만두', '팔보채', '울면', '고추잡채', '라조기', '꿔바로우', '마라샹궈', '차돌짬뽕', '삼선짬뽕', '유산슬']
  },
  japanese: {
    name: '일식',
    items: ['초밥', '라멘', '돈카츠', '우동', '소바', '덮밥', '규동', '카레', '사시미', '오코노미야끼', '야키소바', '타코야끼', '가츠동', '오야코동', '텐동', '장어덮밥', '연어덮밥', '치킨난반']
  },
  western: {
    name: '양식',
    items: ['파스타', '피자', '스테이크', '햄버거', '리조또', '오믈렛', '샐러드', '샌드위치', '그라탱', '라자냐', '까르보나라', '봉골레', '알리오올리오', '토마토파스타', '크림파스타', '필라프', '함박스테이크']
  },
  snack: {
    name: '분식',
    items: ['떡볶이', '김밥', '순대', '라면', '튀김', '어묵', '만두', '쫄면', '비빔국수', '잔치국수', '라볶이', '김말이', '핫도그', '치즈볼', '주먹밥', '유부초밥', '컵밥']
  }
};

let menuAnimationId = null;

document.getElementById('pick-menu').addEventListener('click', pickRandomMenu);
document.getElementById('pick-menu-again').addEventListener('click', pickRandomMenu);

function pickRandomMenu() {
  // 선택된 카테고리 수집
  const checkboxes = document.querySelectorAll('.menu-categories input[type="checkbox"]:checked');
  const selectedCategories = Array.from(checkboxes).map(cb => cb.value);

  if (selectedCategories.length === 0) {
    alert('최소 하나의 카테고리를 선택해주세요!');
    return;
  }

  // 선택된 카테고리에서 모든 메뉴 수집
  let allMenus = [];
  selectedCategories.forEach(cat => {
    menuData[cat].items.forEach(item => {
      allMenus.push({ menu: item, category: menuData[cat].name });
    });
  });

  // 애니메이션 시작
  const menuDisplay = document.getElementById('menu-display');
  const categoryDisplay = document.getElementById('menu-category-display');
  const resultArea = document.getElementById('menu-result');
  const againBtn = document.getElementById('pick-menu-again');

  resultArea.style.display = 'block';
  menuDisplay.classList.add('animating');
  menuDisplay.classList.remove('revealed');

  // 이전 애니메이션 취소
  if (menuAnimationId) {
    cancelAnimationFrame(menuAnimationId);
  }

  const duration = 2000;
  const startTime = Date.now();
  let lastUpdate = 0;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    // 점점 느려지는 효과
    const interval = 50 + progress * 200;

    if (elapsed - lastUpdate > interval) {
      const randomIdx = Math.floor(Math.random() * allMenus.length);
      menuDisplay.textContent = allMenus[randomIdx].menu;
      categoryDisplay.textContent = allMenus[randomIdx].category;
      lastUpdate = elapsed;
    }

    if (elapsed < duration) {
      menuAnimationId = requestAnimationFrame(animate);
    } else {
      // 최종 결과 표시
      const finalIdx = Math.floor(Math.random() * allMenus.length);
      const finalMenu = allMenus[finalIdx];

      menuDisplay.textContent = finalMenu.menu;
      categoryDisplay.textContent = finalMenu.category;
      menuDisplay.classList.remove('animating');
      menuDisplay.classList.add('revealed');
      againBtn.style.display = 'block';
    }
  }

  animate();
}

// ==================== 로또 번호 생성기 ====================
document.getElementById('generate-lotto').addEventListener('click', generateLottoNumbers);

function generateLottoNumbers() {
  const gameCount = parseInt(document.getElementById('lotto-game-count').value);
  const resultsContainer = document.getElementById('lotto-results');
  resultsContainer.innerHTML = '';

  for (let game = 0; game < gameCount; game++) {
    const numbers = generateSingleGame();
    const gameRow = createLottoGameRow(numbers, game + 1);
    resultsContainer.appendChild(gameRow);

    // 순차적 애니메이션
    setTimeout(() => {
      gameRow.classList.add('visible');
    }, game * 150);
  }
}

function generateSingleGame() {
  const numbers = [];
  while (numbers.length < 6) {
    const num = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }
  return numbers.sort((a, b) => a - b);
}

function getLottoBallColor(num) {
  if (num <= 10) return 'lotto-yellow';
  if (num <= 20) return 'lotto-blue';
  if (num <= 30) return 'lotto-red';
  if (num <= 40) return 'lotto-gray';
  return 'lotto-green';
}

function createLottoGameRow(numbers, gameNum) {
  const row = document.createElement('div');
  row.className = 'lotto-game-row';

  const label = document.createElement('span');
  label.className = 'lotto-game-label';
  label.textContent = String.fromCharCode(64 + gameNum); // A, B, C, D, E
  row.appendChild(label);

  const ballsContainer = document.createElement('div');
  ballsContainer.className = 'lotto-balls';

  numbers.forEach((num, idx) => {
    const ball = document.createElement('div');
    ball.className = `lotto-ball ${getLottoBallColor(num)}`;
    ball.textContent = num;
    ball.style.animationDelay = `${idx * 100}ms`;
    ballsContainer.appendChild(ball);
  });

  row.appendChild(ballsContainer);
  return row;
}

// ==================== 할까 말까? (꽃잎 떼기) ====================
let petalData = {
  startChoice: 'do', // 'do' or 'dont'
  totalPetals: 0,
  remainingPetals: 0,
  currentAnswer: 'do'
};

function startPetalGame() {
  // 랜덤으로 '한다' 또는 '안 한다'부터 시작
  petalData.startChoice = Math.random() < 0.5 ? 'do' : 'dont';

  // 5~11개 사이의 랜덤 꽃잎 수
  petalData.totalPetals = Math.floor(Math.random() * 7) + 5;
  petalData.remainingPetals = petalData.totalPetals;
  petalData.currentAnswer = petalData.startChoice;

  // Step 2로 이동 (Step 1 건너뜀)
  document.getElementById('petal-step1').style.display = 'none';
  document.getElementById('petal-step2').style.display = 'block';
  document.getElementById('petal-step3').style.display = 'none';

  renderPetals();

  // 초기 상태: 아직 답을 보여주지 않음
  const currentText = document.getElementById('petal-current-text');
  currentText.textContent = '?';
  currentText.className = 'petal-current-text';
  document.getElementById('petal-count-display').textContent = `남은 꽃잎: ${petalData.remainingPetals}개`;
}

// 페이지 로드 시 petal 탭이 활성화되면 자동 시작
// 탭 전환 시에도 자동 시작되도록 기존 탭 전환 로직 아래에서 처리

function renderPetals() {
  const container = document.getElementById('petals-container');
  container.innerHTML = '';

  const petalColors = ['#FF6B6B', '#FF8E8E', '#FFB3B3', '#FF9999', '#FFA5A5', '#FF7777'];

  for (let i = 0; i < petalData.totalPetals; i++) {
    const petal = document.createElement('div');
    petal.className = 'petal';
    petal.dataset.index = i;

    // 꽃잎을 원형으로 배치
    const angle = (360 / petalData.totalPetals) * i;
    const color = petalColors[i % petalColors.length];

    petal.style.setProperty('--angle', `${angle}deg`);
    petal.style.setProperty('--petal-color', color);
    petal.style.transform = `rotate(${angle}deg) translateY(-60px)`;

    petal.addEventListener('click', () => pickPetal(petal));

    container.appendChild(petal);
  }
}

function updatePetalDisplay() {
  const currentText = document.getElementById('petal-current-text');
  const countDisplay = document.getElementById('petal-count-display');

  const answerText = petalData.currentAnswer === 'do' ? '한다' : '안 한다';
  currentText.textContent = answerText;
  currentText.className = `petal-current-text ${petalData.currentAnswer === 'do' ? 'answer-do' : 'answer-dont'}`;

  countDisplay.textContent = `남은 꽃잎: ${petalData.remainingPetals}개`;
}

function pickPetal(petalElement) {
  if (petalElement.classList.contains('picked')) return;

  // 꽃잎 떼기 애니메이션
  petalElement.classList.add('picked');

  petalData.remainingPetals--;

  // 다음 대답으로 교차 (마지막 꽃잎도 포함)
  petalData.currentAnswer = petalData.currentAnswer === 'do' ? 'dont' : 'do';
  updatePetalDisplay();

  // 마지막 꽃잎인지 확인
  if (petalData.remainingPetals === 0) {
    setTimeout(() => {
      showPetalResult();
    }, 600);
  }
}

function showPetalResult() {
  document.getElementById('petal-step2').style.display = 'none';
  document.getElementById('petal-step3').style.display = 'block';

  const resultEl = document.getElementById('petal-final-result');

  if (petalData.currentAnswer === 'do') {
    resultEl.textContent = '해보자!';
    resultEl.className = 'petal-final-result result-do';
  } else {
    resultEl.textContent = '지금은 때가 아닌가봐';
    resultEl.className = 'petal-final-result result-dont';
  }
}

// 다시 하기
document.getElementById('petal-restart').addEventListener('click', () => {
  startPetalGame();
});

// ==================== 순서 정하기 ====================
let orderData = {
  count: 0,
  mode: 'number', // 'number' or 'name'
  names: []
};

// Step 1: 인원수 확인
document.getElementById('order-confirm-count').addEventListener('click', () => {
  const count = parseInt(document.getElementById('order-count').value);

  if (count < 2 || isNaN(count)) {
    alert('2명 이상 입력해주세요!');
    return;
  }

  orderData.count = count;
  showOrderStep2();
});

// Enter 키로도 확인
document.getElementById('order-count').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('order-confirm-count').click();
  }
});

function showOrderStep2() {
  document.getElementById('order-step1').style.display = 'none';
  document.getElementById('order-step2').style.display = 'block';
  document.getElementById('order-step3').style.display = 'none';

  // 모드 버튼 초기화
  document.querySelectorAll('.order-mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === 'number') btn.classList.add('active');
  });

  orderData.mode = 'number';
  renderOrderInputs();
}

// 모드 선택
document.querySelectorAll('.order-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.order-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    orderData.mode = btn.dataset.mode;
    renderOrderInputs();
  });
});

function renderOrderInputs() {
  const nameInputsContainer = document.getElementById('order-name-inputs');
  const numberPreview = document.getElementById('order-number-preview');

  if (orderData.mode === 'name') {
    // 이름 입력 모드
    nameInputsContainer.style.display = 'block';
    numberPreview.style.display = 'none';

    nameInputsContainer.innerHTML = '';
    for (let i = 0; i < orderData.count; i++) {
      const inputWrapper = document.createElement('div');
      inputWrapper.className = 'order-name-input-wrapper';
      inputWrapper.innerHTML = `
        <span class="order-name-number">${i + 1}</span>
        <input type="text" id="order-name-${i}" placeholder="이름 입력" class="order-name-input">
      `;
      nameInputsContainer.appendChild(inputWrapper);
    }
  } else {
    // 숫자 모드
    nameInputsContainer.style.display = 'none';
    numberPreview.style.display = 'block';

    numberPreview.innerHTML = '<p class="order-preview-text">참가자</p><div class="order-number-list"></div>';
    const numberList = numberPreview.querySelector('.order-number-list');
    for (let i = 0; i < orderData.count; i++) {
      const numBadge = document.createElement('div');
      numBadge.className = 'order-number-badge';
      numBadge.textContent = i + 1;
      numberList.appendChild(numBadge);
    }
  }
}

// Step 1로 돌아가기
document.getElementById('order-back-to-step1').addEventListener('click', () => {
  document.getElementById('order-step1').style.display = 'block';
  document.getElementById('order-step2').style.display = 'none';
  document.getElementById('order-step3').style.display = 'none';
});

// 순서 정하기 시작
document.getElementById('order-start').addEventListener('click', startOrderGame);

function startOrderGame() {
  // 이름 또는 숫자 수집
  orderData.names = [];

  if (orderData.mode === 'name') {
    for (let i = 0; i < orderData.count; i++) {
      const input = document.getElementById(`order-name-${i}`);
      const name = input.value.trim() || `${i + 1}`;
      orderData.names.push(name);
    }
  } else {
    for (let i = 0; i < orderData.count; i++) {
      orderData.names.push(`${i + 1}`);
    }
  }

  // 랜덤 순서 생성
  const shuffled = [...orderData.names];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Step 3로 이동
  document.getElementById('order-step2').style.display = 'none';
  document.getElementById('order-step3').style.display = 'block';

  // 결과 표시 (애니메이션)
  const resultList = document.getElementById('order-result-list');
  resultList.innerHTML = '';

  shuffled.forEach((name, index) => {
    const resultItem = document.createElement('div');
    resultItem.className = 'order-result-item';
    resultItem.innerHTML = `
      <span class="order-result-rank">${index + 1}</span>
      <span class="order-result-name">${name}</span>
    `;
    resultList.appendChild(resultItem);

    // 순차적 애니메이션
    setTimeout(() => {
      resultItem.classList.add('visible');
    }, index * 150);
  });
}

// 다시하기
document.getElementById('order-restart').addEventListener('click', () => {
  document.getElementById('order-step1').style.display = 'block';
  document.getElementById('order-step2').style.display = 'none';
  document.getElementById('order-step3').style.display = 'none';

  orderData = {
    count: 0,
    mode: 'number',
    names: []
  };
});

// ==================== 밸런스 게임 ====================
const balanceQuestions = [
  // 음식
  ['짜장면', '짬뽕'],
  ['치킨', '피자'],
  ['민초', '반민초'],
  ['부먹', '찍먹'],
  ['매운 음식', '안 매운 음식'],
  ['밥', '빵'],
  ['커피', '차'],
  ['콜라', '사이다'],
  ['떡볶이', '순대'],
  ['삼겹살', '소고기'],
  ['초밥', '회'],
  ['햄버거', '샌드위치'],
  ['라면', '우동'],
  ['아이스크림', '케이크'],
  ['단짠', '맵짠'],
  ['뼈있는 치킨', '순살 치킨'],
  ['곱창', '대창'],
  ['김치찌개', '된장찌개'],
  ['마라탕', '훠궈'],
  ['와플', '팬케이크'],

  // 계절/자연
  ['여름', '겨울'],
  ['산', '바다'],
  ['아침', '저녁'],
  ['비 오는 날', '눈 오는 날'],
  ['봄', '가을'],
  ['일출', '일몰'],
  ['도시', '시골'],
  ['숲', '사막'],
  ['강', '호수'],

  // 성격/생활
  ['아침형 인간', '저녁형 인간'],
  ['계획형', '즉흥형'],
  ['집순이/집돌이', '밖순이/밖돌이'],
  ['혼자 여행', '친구와 여행'],
  ['연락 자주', '연락 가끔'],
  ['텍스트', '전화'],
  ['절약', '플렉스'],
  ['미니멀리스트', '맥시멀리스트'],
  ['얼리버드', '올빼미'],
  ['혼밥', '같이 밥'],
  ['혼술', '같이 술'],
  ['운전', '대중교통'],
  ['청소 자주', '몰아서 청소'],
  ['계획 휴가', '즉흥 휴가'],
  ['목욕', '샤워'],
  ['낮잠', '밤잠 몰아자기'],

  // 동물
  ['고양이', '강아지'],
  ['대형견', '소형견'],
  ['새', '물고기'],
  ['토끼', '햄스터'],
  ['파충류', '포유류'],

  // 가치관
  ['돈', '시간'],
  ['과거로', '미래로'],
  ['투명인간', '순간이동'],
  ['영원히 25살', '10억'],
  ['사랑', '우정'],
  ['능력', '외모'],
  ['안정', '도전'],
  ['결과', '과정'],
  ['현실', '이상'],
  ['명예', '부'],
  ['자유', '안정'],
  ['건강', '돈'],
  ['재능', '노력'],
  ['IQ', 'EQ'],

  // 엔터테인먼트
  ['영화', '드라마'],
  ['책', '영화'],
  ['게임', '운동'],
  ['노래방', '클럽'],
  ['롤', '배그'],
  ['넷플릭스', '유튜브'],
  ['웹툰', '만화책'],
  ['콘서트', '뮤지컬'],
  ['액션 영화', '로맨스 영화'],
  ['공포 영화', '코미디 영화'],
  ['힙합', '발라드'],
  ['아이돌', '밴드'],
  ['국내 여행', '해외 여행'],
  ['놀이공원', '워터파크'],
  ['캠핑', '호텔'],
  ['스키', '보드'],
  ['PC방', '오락실'],
  ['보드게임', '카드게임'],

  // 이상형/연애
  ['연상', '연하'],
  ['첫사랑', '마지막 사랑'],
  ['밀당', '직진'],
  ['외모', '성격'],
  ['재미있는 사람', '진지한 사람'],
  ['같은 취미', '다른 취미'],
  ['표현 잘하는 사람', '표현 서툰 사람'],
  ['장거리 연애', '동거'],
  ['바람 피우기', '차이기'],
  ['본인 바쁜 연인', '연락 귀찮은 연인'],
  ['질투 많은 연인', '무관심한 연인'],
  ['기념일 챙기기', '평소에 잘하기'],

  // 학교/직장
  ['대기업', '스타트업'],
  ['재택근무', '사무실 출근'],
  ['연봉', '워라밸'],
  ['좋아하는 일', '돈 되는 일'],
  ['야근 많고 고연봉', '칼퇴 저연봉'],
  ['프리랜서', '정규직'],
  ['수학', '영어'],
  ['문과', '이과'],
  ['암기 시험', '서술형 시험'],
  ['조별과제', '개인과제'],
  ['까다로운 상사', '능력없는 상사'],

  // 기타
  ['ios', 'android'],
  ['윈도우', '맥'],
  ['현금', '카드'],
  ['종이책', '전자책'],
  ['에어컨', '선풍기'],
  ['목걸이', '반지'],
  ['신발', '가방'],
  ['모자', '선글라스'],
  ['향수', '바디로션'],
  ['엘리베이터', '에스컬레이터'],
  ['짧은 머리', '긴 머리'],
  ['셀카', '타인이 찍어주는 사진'],
  ['문 열고 자기', '문 닫고 자기'],
  ['이불 밖', '이불 속'],
  ['오른손잡이', '왼손잡이'],
  ['알람 한 번', '알람 여러 번'],
  ['잠옷', '평상복으로 자기'],
  ['발 내놓고 자기', '발 덮고 자기']
];

let balanceData = {
  currentQuestion: null,
  usedQuestions: []
};

document.getElementById('balance-start').addEventListener('click', showBalanceQuestion);
document.getElementById('balance-next').addEventListener('click', showBalanceQuestion);

document.getElementById('balance-restart').addEventListener('click', () => {
  document.getElementById('balance-intro').style.display = 'block';
  document.getElementById('balance-question').style.display = 'none';
  balanceData.usedQuestions = [];
});

function showBalanceQuestion() {
  // 사용 가능한 질문 필터링
  const availableQuestions = balanceQuestions.filter((_, idx) =>
    !balanceData.usedQuestions.includes(idx)
  );

  // 모든 질문을 다 했으면 리셋
  if (availableQuestions.length === 0) {
    balanceData.usedQuestions = [];
    showBalanceQuestion();
    return;
  }

  // 랜덤 질문 선택
  const randomIdx = Math.floor(Math.random() * availableQuestions.length);
  const originalIdx = balanceQuestions.indexOf(availableQuestions[randomIdx]);
  balanceData.usedQuestions.push(originalIdx);
  balanceData.currentQuestion = availableQuestions[randomIdx];

  // UI 업데이트
  document.getElementById('balance-intro').style.display = 'none';
  document.getElementById('balance-question').style.display = 'block';

  const choiceA = document.getElementById('balance-choice-a');
  const choiceB = document.getElementById('balance-choice-b');
  const result = document.getElementById('balance-result');

  choiceA.textContent = balanceData.currentQuestion[0];
  choiceB.textContent = balanceData.currentQuestion[1];

  // 선택 상태 초기화
  choiceA.classList.remove('selected');
  choiceB.classList.remove('selected');
  result.textContent = '';
  result.className = 'balance-result';

  // 애니메이션
  choiceA.classList.add('appear');
  choiceB.classList.add('appear');
  setTimeout(() => {
    choiceA.classList.remove('appear');
    choiceB.classList.remove('appear');
  }, 500);
}

document.getElementById('balance-choice-a').addEventListener('click', () => selectBalance('a'));
document.getElementById('balance-choice-b').addEventListener('click', () => selectBalance('b'));

function selectBalance(choice) {
  const choiceA = document.getElementById('balance-choice-a');
  const choiceB = document.getElementById('balance-choice-b');
  const result = document.getElementById('balance-result');

  choiceA.classList.remove('selected');
  choiceB.classList.remove('selected');

  if (choice === 'a') {
    choiceA.classList.add('selected');
    result.textContent = `"${balanceData.currentQuestion[0]}" 선택!`;
  } else {
    choiceB.classList.add('selected');
    result.textContent = `"${balanceData.currentQuestion[1]}" 선택!`;
  }

  result.classList.add('visible');
}
