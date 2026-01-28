// 탭 전환
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`${btn.dataset.game}-game`).classList.add('active');
  });
});

// ==================== 사다리타기 ====================
let ladderData = {
  players: [],
  results: [],
  bridges: [],
  canvas: null,
  ctx: null
};

document.getElementById('create-ladder').addEventListener('click', createLadder);

function createLadder() {
  const playersInput = document.getElementById('ladder-players').value;
  const resultsInput = document.getElementById('ladder-results').value;

  const players = playersInput.split(',').map(p => p.trim()).filter(p => p);
  const results = resultsInput.split(',').map(r => r.trim()).filter(r => r);

  if (players.length < 2) {
    alert('참가자를 2명 이상 입력해주세요!');
    return;
  }

  if (players.length !== results.length) {
    alert('참가자 수와 결과 수가 같아야 합니다!');
    return;
  }

  ladderData.players = players;
  ladderData.results = shuffleArray([...results]);

  generateBridges();
  drawLadder();

  document.getElementById('start-ladder').style.display = 'block';
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
  const numPlayers = ladderData.players.length;
  const numRows = 8;
  ladderData.bridges = [];

  for (let row = 0; row < numRows; row++) {
    const rowBridges = [];
    for (let col = 0; col < numPlayers - 1; col++) {
      if (rowBridges.length > 0 && rowBridges[col - 1]) {
        rowBridges.push(false);
      } else {
        rowBridges.push(Math.random() > 0.5);
      }
    }
    ladderData.bridges.push(rowBridges);
  }
}

function drawLadder() {
  const canvas = document.getElementById('ladder-canvas');
  const ctx = canvas.getContext('2d');
  ladderData.canvas = canvas;
  ladderData.ctx = ctx;

  const numPlayers = ladderData.players.length;
  const colWidth = 80;
  const rowHeight = 40;
  const padding = 50;
  const numRows = ladderData.bridges.length;

  canvas.width = colWidth * (numPlayers - 1) + padding * 2;
  canvas.height = rowHeight * (numRows + 1) + padding * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 세로선 그리기
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 3;

  for (let i = 0; i < numPlayers; i++) {
    const x = padding + i * colWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, canvas.height - padding);
    ctx.stroke();
  }

  // 가로선(다리) 그리기
  ctx.strokeStyle = '#667eea';
  ctx.lineWidth = 3;

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numPlayers - 1; col++) {
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

  // 참가자 이름 표시
  const playersDisplay = document.getElementById('ladder-players-display');
  playersDisplay.innerHTML = '';
  ladderData.players.forEach((player, i) => {
    const span = document.createElement('span');
    span.textContent = player;
    span.dataset.index = i;
    span.addEventListener('click', () => runLadder(i));
    playersDisplay.appendChild(span);
  });

  // 결과 표시
  const resultsDisplay = document.getElementById('ladder-results-display');
  resultsDisplay.innerHTML = '';
  ladderData.results.forEach((_, i) => {
    const span = document.createElement('span');
    span.textContent = '?';
    span.dataset.index = i;
    resultsDisplay.appendChild(span);
  });
}

document.getElementById('start-ladder').addEventListener('click', () => {
  runLadder(0);
});

function runLadder(startIndex) {
  const canvas = ladderData.canvas;
  const ctx = ladderData.ctx;
  const numPlayers = ladderData.players.length;
  const colWidth = 80;
  const rowHeight = 40;
  const padding = 50;
  const numRows = ladderData.bridges.length;

  // 기존 선택 초기화
  document.querySelectorAll('#ladder-players-display span').forEach(s => s.classList.remove('selected'));
  document.querySelectorAll('#ladder-results-display span').forEach(s => s.classList.remove('highlight'));

  // 현재 선택 표시
  document.querySelector(`#ladder-players-display span[data-index="${startIndex}"]`).classList.add('selected');

  // 사다리 타기 애니메이션
  let currentCol = startIndex;
  let currentRow = 0;
  const path = [{ x: padding + currentCol * colWidth, y: padding }];

  while (currentRow <= numRows) {
    const y = padding + currentRow * rowHeight;

    // 왼쪽 다리 확인
    if (currentCol > 0 && currentRow > 0 && ladderData.bridges[currentRow - 1][currentCol - 1]) {
      path.push({ x: padding + currentCol * colWidth, y: y });
      currentCol--;
      path.push({ x: padding + currentCol * colWidth, y: y });
    }
    // 오른쪽 다리 확인
    else if (currentCol < numPlayers - 1 && currentRow > 0 && ladderData.bridges[currentRow - 1][currentCol]) {
      path.push({ x: padding + currentCol * colWidth, y: y });
      currentCol++;
      path.push({ x: padding + currentCol * colWidth, y: y });
    }

    currentRow++;
  }

  path.push({ x: padding + currentCol * colWidth, y: canvas.height - padding });

  // 경로 애니메이션
  let pathIndex = 0;

  function animatePath() {
    if (pathIndex >= path.length - 1) {
      // 결과 표시
      const resultSpan = document.querySelector(`#ladder-results-display span[data-index="${currentCol}"]`);
      resultSpan.textContent = ladderData.results[currentCol];
      resultSpan.classList.add('highlight');

      document.getElementById('ladder-result-message').textContent =
        `${ladderData.players[startIndex]} -> ${ladderData.results[currentCol]}`;
      return;
    }

    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(path[pathIndex].x, path[pathIndex].y);
    ctx.lineTo(path[pathIndex + 1].x, path[pathIndex + 1].y);
    ctx.stroke();

    pathIndex++;
    setTimeout(animatePath, 100);
  }

  drawLadder();
  setTimeout(animatePath, 100);
}

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

  // 각 항목 그리기
  for (let i = 0; i < numItems; i++) {
    const startAngle = rouletteData.rotation + i * anglePerItem - Math.PI / 2;
    const endAngle = startAngle + anglePerItem;

    // 부채꼴 그리기
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = rouletteColors[i % rouletteColors.length];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 텍스트 그리기
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

  // 중심 원
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

    // easeOutCubic
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    rouletteData.rotation = startRotation + totalRotation * easeProgress;
    drawRoulette();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      rouletteData.isSpinning = false;

      // 결과 계산
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
