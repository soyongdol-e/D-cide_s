// ==================== 리더보드 공통 ====================
const LB_CONFIG = {
  'reaction':       { lowerIsBetter: true,  unit: 'ms' },
  'click-survival': { lowerIsBetter: false, unit: '점' },
  'typing':         { lowerIsBetter: false, unit: '점' },
  'numsum':         { lowerIsBetter: false, unit: '점' },
  'sliding':        { lowerIsBetter: true,  unit: '초' },
};

async function loadLeaderboard(gameId, containerId) {
  const cfg = LB_CONFIG[gameId];
  if (!cfg) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="leaderboard-empty">로딩 중...</div>';
  try {
    const snapshot = await db.collection('leaderboard')
      .where('gameId', '==', gameId)
      .get();
    if (snapshot.empty) {
      container.innerHTML = '<div class="leaderboard-empty">아직 기록이 없어요. 첫 번째 주인공이 되어보세요!</div>';
      return;
    }
    let docs = [];
    snapshot.forEach(doc => docs.push(doc.data()));
    docs.sort((a, b) => cfg.lowerIsBetter ? a.score - b.score : b.score - a.score);
    docs = docs.slice(0, 10);

    container.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];
    docs.forEach((d, i) => {
      const rank = i + 1;
      const item = document.createElement('div');
      item.className = 'leaderboard-item';
      const rankHtml = rank <= 3
        ? `<div class="leaderboard-rank rank-${rank}">${medals[i]}</div>`
        : `<div class="leaderboard-rank rank-other">${rank}</div>`;
      item.innerHTML = `${rankHtml}
        <div class="leaderboard-nickname">${escapeHtml(d.nickname)}</div>
        <div class="leaderboard-score">${d.score}${cfg.unit}</div>`;
      container.appendChild(item);
    });
  } catch (e) {
    console.error('리더보드 로드 에러:', e);
    container.innerHTML = '<div class="leaderboard-empty">기록을 불러올 수 없습니다.</div>';
  }
}

async function checkLeaderboardQualify(gameId, score) {
  const cfg = LB_CONFIG[gameId];
  if (!cfg) return false;
  try {
    const snapshot = await db.collection('leaderboard')
      .where('gameId', '==', gameId)
      .get();
    if (snapshot.size < 10) return true;
    const scores = [];
    snapshot.forEach(doc => scores.push(doc.data().score));
    scores.sort((a, b) => cfg.lowerIsBetter ? a - b : b - a);
    const worst = scores[9];
    return cfg.lowerIsBetter ? score < worst : score > worst;
  } catch (e) {
    console.error('리더보드 자격 확인 에러:', e);
    return true; // 오류 시 일단 모달 허용
  }
}

let _scoreModalResolve = null;

function showScoreModal(gameId, score) {
  const cfg = LB_CONFIG[gameId];
  const modal = document.getElementById('score-modal');
  document.getElementById('score-modal-desc').textContent =
    `${score}${cfg.unit} 점수로 TOP 10에 진입했어요! 닉네임을 입력해주세요.`;
  document.getElementById('score-modal-nickname').value = '';
  modal.style.display = 'flex';

  return new Promise(resolve => {
    _scoreModalResolve = resolve;
  });
}

document.getElementById('score-modal-confirm').addEventListener('click', async () => {
  const nickname = document.getElementById('score-modal-nickname').value.trim();
  if (!nickname) { alert('닉네임을 입력해주세요!'); return; }
  document.getElementById('score-modal').style.display = 'none';
  if (_scoreModalResolve) { _scoreModalResolve(nickname); _scoreModalResolve = null; }
});

document.getElementById('score-modal-skip').addEventListener('click', () => {
  document.getElementById('score-modal').style.display = 'none';
  if (_scoreModalResolve) { _scoreModalResolve(null); _scoreModalResolve = null; }
});

async function handleGameEnd(gameId, score) {
  const qualifies = await checkLeaderboardQualify(gameId, score);
  if (!qualifies) return;
  const nickname = await showScoreModal(gameId, score);
  if (!nickname) return;
  try {
    await db.collection('leaderboard').add({
      gameId, nickname, score,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadLeaderboard(gameId, `${gameId}-leaderboard`);
  } catch (e) {
    console.error('리더보드 저장 에러:', e);
    alert('기록 저장 실패: Firestore 보안 규칙을 확인해주세요.\n\n에러: ' + e.message);
  }
}

// ==================== 홈/게임 뷰 전환 ====================
function showGame(gameId) {
  document.getElementById('home-view').classList.remove('active');
  document.getElementById('back-bar').style.display = 'block';

  document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`${gameId}-game`).classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.tab-btn[data-game="${gameId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.nav-group-btn').forEach(b => b.classList.remove('has-active'));
  if (activeBtn) {
    const parentGroup = activeBtn.closest('.nav-dropdown-group');
    if (parentGroup) parentGroup.querySelector('.nav-group-btn').classList.add('has-active');
  }

  document.querySelectorAll('.nav-dropdown-group').forEach(g => g.classList.remove('open'));

  if (gameId === 'petal') startPetalGame();
  const lbGames = ['reaction', 'click-survival', 'typing', 'numsum', 'sliding'];
  if (lbGames.includes(gameId)) {
    loadLeaderboard(gameId, `${gameId}-leaderboard`);
  }
  loadComments(gameId);
}

function showHome() {
  document.getElementById('home-view').classList.add('active');
  document.getElementById('back-bar').style.display = 'none';
  document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.nav-group-btn').forEach(b => b.classList.remove('has-active'));
}

// 드롭다운 토글
document.querySelectorAll('.nav-group-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const group = btn.closest('.nav-dropdown-group');
    const isOpen = group.classList.contains('open');
    document.querySelectorAll('.nav-dropdown-group').forEach(g => g.classList.remove('open'));
    if (!isOpen) group.classList.add('open');
  });
});

document.addEventListener('click', () => {
  document.querySelectorAll('.nav-dropdown-group').forEach(g => g.classList.remove('open'));
});

// 네비게이션 탭 버튼
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => showGame(btn.dataset.game));
});

// 홈 갤러리 카드
document.querySelectorAll('.game-card').forEach(card => {
  card.addEventListener('click', () => showGame(card.dataset.game));
});

// 뒤로가기 버튼
document.getElementById('back-to-home').addEventListener('click', showHome);

// 로고 클릭 → 홈으로
document.querySelector('.nav-logo').addEventListener('click', (e) => {
  e.preventDefault();
  showHome();
});

// ==================== 댓글 기능 ====================
// 댓글 작성
function addComment(gameId, nickname, content, password) {
  if (!nickname.trim() || !content.trim() || !password.trim()) {
    alert('닉네임, 댓글 내용, 비밀번호를 모두 입력해주세요!');
    return Promise.reject('빈 필드');
  }

  return db.collection('comments').add({
    gameId: gameId,
    nickname: nickname.trim(),
    content: content.trim(),
    password: password.trim(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// 댓글 로드
function loadComments(gameId) {
  const section = document.querySelector(`.comment-section[data-game="${gameId}"]`);
  if (!section) return;

  const listContainer = section.querySelector('.comment-list');
  listContainer.innerHTML = '<div class="comment-loading">댓글을 불러오는 중...</div>';

  db.collection('comments')
    .where('gameId', '==', gameId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snapshot) => {
      listContainer.innerHTML = '';

      if (snapshot.empty) {
        listContainer.innerHTML = '<div class="comment-empty">아직 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>';
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const commentEl = createCommentElement(doc.id, data);
        listContainer.appendChild(commentEl);
      });
    }, (error) => {
      console.error('댓글 로드 에러:', error);
      listContainer.innerHTML = '<div class="comment-empty">댓글을 불러올 수 없습니다.</div>';
    });
}

// 댓글 요소 생성
function createCommentElement(id, data) {
  const item = document.createElement('div');
  item.className = 'comment-item';
  item.dataset.id = id;

  const createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
  const dateStr = formatDate(createdAt);

  item.innerHTML = `
    <div class="comment-header">
      <span class="comment-author">${escapeHtml(data.nickname)}</span>
      <span class="comment-date">${dateStr}</span>
    </div>
    <div class="comment-body">${escapeHtml(data.content)}</div>
    <button class="comment-delete-btn" data-id="${id}">삭제</button>
  `;

  // 삭제 버튼 이벤트
  item.querySelector('.comment-delete-btn').addEventListener('click', () => {
    deleteComment(id);
  });

  return item;
}

// 댓글 삭제
function deleteComment(commentId) {
  const password = prompt('삭제하려면 비밀번호를 입력하세요:');
  if (!password) return;

  db.collection('comments').doc(commentId).get()
    .then((doc) => {
      if (!doc.exists) {
        alert('댓글을 찾을 수 없습니다.');
        return;
      }

      const data = doc.data();
      if (data.password !== password) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }

      return db.collection('comments').doc(commentId).delete();
    })
    .then(() => {
      // 삭제 성공 시 아무것도 안 함 (onSnapshot이 자동으로 갱신)
    })
    .catch((error) => {
      console.error('삭제 에러:', error);
      alert('삭제 중 오류가 발생했습니다.');
    });
}

// 날짜 포맷팅
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 댓글 폼 이벤트 설정
document.querySelectorAll('.comment-section').forEach(section => {
  const gameId = section.dataset.game;
  const submitBtn = section.querySelector('.comment-submit-btn');
  const nicknameInput = section.querySelector('.comment-nickname');
  const contentInput = section.querySelector('.comment-content');
  const passwordInput = section.querySelector('.comment-password');

  submitBtn.addEventListener('click', () => {
    const nickname = nicknameInput.value;
    const content = contentInput.value;
    const password = passwordInput.value;

    submitBtn.disabled = true;
    submitBtn.textContent = '작성 중...';

    addComment(gameId, nickname, content, password)
      .then(() => {
        nicknameInput.value = '';
        contentInput.value = '';
        passwordInput.value = '';
      })
      .catch((error) => {
        if (error !== '빈 필드') {
          console.error('댓글 작성 에러:', error);
          alert('댓글 작성 중 오류가 발생했습니다.');
        }
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = '댓글 작성';
      });
  });
});

// 초기 댓글 로드 (기본 탭: ladder)
document.addEventListener('DOMContentLoaded', () => {
  loadComments('ladder');
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

// ==================== 오늘 뭐 볼까? (콘텐츠 추천) ====================
const recommendData = {
  anime: {
    name: '애니메이션',
    items: [
      '귀멸의 칼날', '주술회전', '나의 히어로 아카데미아', '원펀맨', '진격의 거인',
      '스파이 패밀리', '체인소 맨', '최애의 아이', '블루 락', '도쿄 리벤저스',
      '슬램덩크', '하이큐!!', '원피스', '나루토', '블리치',
      '귀여운 그녀', '스즈메의 문단속', '너의 이름은', '날씨의 아이', '센과 치히로의 행방불명',
      '하울의 움직이는 성', '토토로', '모노노케 히메', '바람계곡의 나우시카', '벼랑 위의 포뇨',
      '바이올렛 에버가든', '소드 아트 온라인', '리제로', 'Re:ZERO', '오버로드',
      '암살교실', '도라에몽', '짱구는 못말려', '포켓몬스터', '디지몬 어드벤처',
      '강철의 연금술사', '헌터x헌터', '데스노트', '코드기어스', '에반게리온',
      '카우보이 비밥', '사이코패스', '스테인스 게이트', '괴물', '기생수',
      '보쿠노 피코', '러키스타', '케이온!', '클라나드', '토라도라',
      '약속의 네버랜드', '귀신 회생', '소울 이터', '페어리 테일', '블랙 클로버',
      '못 말리는 내 동생', '나만이 없는 거리', '언어의 정원', '아이의 시간', '이웃집 토토로'
    ]
  },
  movie: {
    name: '영화',
    items: [
      '기생충', '올드보이', '범죄도시', '부산행', '광해',
      '암살', '신과함께', '극한직업', '명량', '베테랑',
      '타짜', '도둑들', '해운대', '괴물', '살인의 추억',
      '아바타', '어벤져스: 엔드게임', '인터스텔라', '인셉션', '다크나이트',
      '타이타닉', '쇼생크 탈출', '포레스트 검프', '매트릭스', '글래디에이터',
      '라라랜드', '위대한 쇼맨', '보헤미안 랩소디', '알라딘', '겨울왕국',
      '토이 스토리', '업', '코코', '인사이드 아웃', '소울',
      '해리 포터', '반지의 제왕', '호빗', '스타워즈', '쥬라기 공원',
      '어바웃 타임', '노트북', '비포 선라이즈', '러브 액츄얼리', '타이타닉',
      '존 윅', '미션 임파서블', '본 시리즈', '킹스맨', '매드맥스',
      '조커', '배트맨 비긴즈', '아이언맨', '가디언즈 오브 갤럭시', '스파이더맨',
      '덩케르크', '1917', '세이빙 라이언 일병', '블랙호크 다운', '퓨리',
      '쏘우', '컨저링', '겟 아웃', '콰이어트 플레이스', '미드소마'
    ]
  },
  drama: {
    name: '드라마',
    items: [
      '오징어 게임', '더 글로리', '무빙', '이상한 변호사 우영우', '재벌집 막내아들',
      '슬기로운 의사생활', '응답하라 1988', '도깨비', '별에서 온 그대', '태양의 후예',
      '사랑의 불시착', '비밀의 숲', '시그널', '킹덤', '마이 네임',
      '나의 아저씨', 'SKY 캐슬', '미생', '비밀의 숲', '라이프',
      '하이에나', '펜트하우스', '청춘기록', '이태원 클라쓰', '빈센조',
      '스위트홈', '지금 우리 학교는', '소년심판', '작은 아씨들', '슈룹',
      '경이로운 소문', '악귀', '마스크걸', '셀러브리티', '정신병동에도 아침이 와요',
      '브레이킹 배드', '왕좌의 게임', '기묘한 이야기', '더 위쳐', '페이퍼 하우스',
      '프렌즈', '오피스', '셜록', '블랙 미러', '체르노빌',
      '로스트', '프리즌 브레이크', '워킹 데드', '하우스 오브 카드', '나르코스'
    ]
  },
  variety: {
    name: '예능',
    items: [
      '놀면 뭐하니?', '런닝맨', '나 혼자 산다', '전지적 참견 시점', '신서유기',
      '삼시세끼', '윤식당', '강식당', '지구오락실', '출장 십오야',
      '아는 형님', '미운 우리 새끼', '놀라운 토요일', '집사부일체', '불타는 청춘',
      '라디오스타', '해피투게더', '유 퀴즈 온 더 블럭', '컴백홈', '문제적 남자',
      '1박 2일', '슈퍼맨이 돌아왔다', '동상이몽', '살림하는 남자들', '아내의 맛',
      '쇼미더머니', '고등래퍼', '스트릿 우먼 파이터', '싱어게인', '복면가왕',
      '나는 가수다', '불후의 명곡', '히든싱어', '팬텀싱어', '보이스코리아',
      '골목식당', '맛있는 녀석들', '백종원의 골목식당', '수요미식회', '식샤를 합시다',
      '나영석 PD 시리즈', '이번 생은 처음이라', '환승연애', '하트시그널', '돌싱글즈'
    ]
  }
};

let recommendAnimationId = null;

document.getElementById('pick-recommend').addEventListener('click', pickRandomRecommend);
document.getElementById('pick-recommend-again').addEventListener('click', pickRandomRecommend);

function pickRandomRecommend() {
  const checkboxes = document.querySelectorAll('.recommend-categories input[type="checkbox"]:checked');
  const selectedCategories = Array.from(checkboxes).map(cb => cb.value);

  if (selectedCategories.length === 0) {
    alert('최소 하나의 장르를 선택해주세요!');
    return;
  }

  let allContents = [];
  selectedCategories.forEach(cat => {
    recommendData[cat].items.forEach(item => {
      allContents.push({ content: item, category: recommendData[cat].name });
    });
  });

  const contentDisplay = document.getElementById('recommend-display');
  const categoryDisplay = document.getElementById('recommend-category-display');
  const resultArea = document.getElementById('recommend-result');
  const againBtn = document.getElementById('pick-recommend-again');

  resultArea.style.display = 'block';
  contentDisplay.classList.add('animating');
  contentDisplay.classList.remove('revealed');

  if (recommendAnimationId) {
    cancelAnimationFrame(recommendAnimationId);
  }

  const duration = 2000;
  const startTime = Date.now();
  let lastUpdate = 0;

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;
    const interval = 50 + progress * 200;

    if (elapsed - lastUpdate > interval) {
      const randomIdx = Math.floor(Math.random() * allContents.length);
      contentDisplay.textContent = allContents[randomIdx].content;
      categoryDisplay.textContent = allContents[randomIdx].category;
      lastUpdate = elapsed;
    }

    if (elapsed < duration) {
      recommendAnimationId = requestAnimationFrame(animate);
    } else {
      const finalIdx = Math.floor(Math.random() * allContents.length);
      const finalContent = allContents[finalIdx];

      contentDisplay.textContent = finalContent.content;
      categoryDisplay.textContent = finalContent.category;
      contentDisplay.classList.remove('animating');
      contentDisplay.classList.add('revealed');
      againBtn.style.display = 'block';
    }
  }

  animate();
}

// ==================== 팀 정하기 ====================
let teamData = {
  teamCount: 0,
  memberCount: 0,
  hasLeader: false,
  leaderNames: []
};

// Step 1: 팀/인원수 확인
document.getElementById('team-confirm-count').addEventListener('click', () => {
  const teamCount = parseInt(document.getElementById('team-count').value);
  const memberCount = parseInt(document.getElementById('team-member-count').value);

  if (teamCount < 2 || teamCount > 20 || isNaN(teamCount)) {
    alert('팀 수는 2~20 사이로 입력해주세요!');
    return;
  }

  if (memberCount < 2 || memberCount > 100 || isNaN(memberCount)) {
    alert('인원 수는 2~100 사이로 입력해주세요!');
    return;
  }

  if (memberCount < teamCount) {
    alert('인원 수가 팀 수보다 적습니다!');
    return;
  }

  teamData.teamCount = teamCount;
  teamData.memberCount = memberCount;

  // Step 2로 이동
  document.getElementById('team-step1').style.display = 'none';
  document.getElementById('team-step2').style.display = 'block';
});

// Enter 키로도 확인
document.getElementById('team-count').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('team-member-count').focus();
  }
});

document.getElementById('team-member-count').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    document.getElementById('team-confirm-count').click();
  }
});

// Step 2: 팀장 여부 선택
document.querySelectorAll('.team-choice-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    teamData.hasLeader = btn.dataset.leader === 'yes';

    document.getElementById('team-step2').style.display = 'none';

    if (teamData.hasLeader) {
      // 팀장 이름 입력 UI 생성
      renderTeamLeaderInputs();
      document.getElementById('team-step3').style.display = 'block';
    } else {
      // 팀장 없이 바로 번호 정하기 안내
      document.getElementById('team-total-display').textContent = teamData.memberCount;
      document.getElementById('team-step4').style.display = 'block';
    }
  });
});

// 팀장 이름 입력 UI 생성
function renderTeamLeaderInputs() {
  const container = document.getElementById('team-leader-inputs');
  container.innerHTML = '';

  for (let i = 0; i < teamData.teamCount; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'team-leader-input-wrapper';
    wrapper.innerHTML = `
      <span class="team-leader-number">${i + 1}팀</span>
      <input type="text" id="team-leader-${i}" class="team-leader-input" placeholder="팀장 이름">
    `;
    container.appendChild(wrapper);
  }
}

// Step 3: 팀장 이름 확인 후 번호 정하기 안내
document.getElementById('team-confirm-leaders').addEventListener('click', () => {
  teamData.leaderNames = [];

  for (let i = 0; i < teamData.teamCount; i++) {
    const input = document.getElementById(`team-leader-${i}`);
    const name = input.value.trim() || `${i + 1}팀 팀장`;
    teamData.leaderNames.push(name);
  }

  // 팀장 제외한 인원 수 표시
  const remainingMembers = teamData.memberCount - teamData.teamCount;
  document.getElementById('team-total-display').textContent = remainingMembers;

  document.getElementById('team-step3').style.display = 'none';
  document.getElementById('team-step4').style.display = 'block';
});

// Step 4: 번호 정했어요 -> 결과 생성
document.getElementById('team-number-ready').addEventListener('click', () => {
  document.getElementById('team-step4').style.display = 'none';
  document.getElementById('team-step5').style.display = 'block';

  generateTeamResult();
});

// 팀 결과 생성
function generateTeamResult() {
  const container = document.getElementById('team-result-container');
  container.innerHTML = '';

  let members = [];
  let membersPerTeam;

  if (teamData.hasLeader) {
    // 팀장이 있는 경우: 팀장 제외한 인원을 번호로 배정
    const remainingCount = teamData.memberCount - teamData.teamCount;
    for (let i = 1; i <= remainingCount; i++) {
      members.push(i);
    }
    membersPerTeam = Math.floor(remainingCount / teamData.teamCount);
  } else {
    // 팀장이 없는 경우: 전체 인원을 번호로 배정
    for (let i = 1; i <= teamData.memberCount; i++) {
      members.push(i);
    }
    membersPerTeam = Math.floor(teamData.memberCount / teamData.teamCount);
  }

  // 멤버 셔플
  for (let i = members.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [members[i], members[j]] = [members[j], members[i]];
  }

  // 팀별 멤버 배정
  const teams = [];
  for (let i = 0; i < teamData.teamCount; i++) {
    teams.push([]);
  }

  // 기본 인원 배정
  let memberIdx = 0;
  for (let i = 0; i < teamData.teamCount; i++) {
    for (let j = 0; j < membersPerTeam; j++) {
      if (memberIdx < members.length) {
        teams[i].push(members[memberIdx]);
        memberIdx++;
      }
    }
  }

  // 남은 인원 랜덤 배정
  while (memberIdx < members.length) {
    const randomTeam = Math.floor(Math.random() * teamData.teamCount);
    teams[randomTeam].push(members[memberIdx]);
    memberIdx++;
  }

  // 각 팀 내 번호 정렬
  for (let i = 0; i < teamData.teamCount; i++) {
    teams[i].sort((a, b) => a - b);
  }

  // 결과 카드 생성
  for (let i = 0; i < teamData.teamCount; i++) {
    const card = document.createElement('div');
    card.className = 'team-result-card';

    let headerText;
    if (teamData.hasLeader) {
      headerText = teamData.leaderNames[i];
    } else {
      headerText = `${i + 1}팀`;
    }

    let membersHtml = '';
    teams[i].forEach(num => {
      membersHtml += `<div class="team-member-item">${num}번</div>`;
    });

    card.innerHTML = `
      <div class="team-result-header">${headerText}</div>
      <div class="team-result-members">${membersHtml}</div>
    `;

    container.appendChild(card);

    // 순차적 애니메이션
    setTimeout(() => {
      card.classList.add('visible');
    }, i * 150);
  }
}

// 다시하기
document.getElementById('team-restart').addEventListener('click', () => {
  document.getElementById('team-step1').style.display = 'block';
  document.getElementById('team-step2').style.display = 'none';
  document.getElementById('team-step3').style.display = 'none';
  document.getElementById('team-step4').style.display = 'none';
  document.getElementById('team-step5').style.display = 'none';

  teamData = {
    teamCount: 0,
    memberCount: 0,
    hasLeader: false,
    leaderNames: []
  };
});

// ==================== 반응속도 게임 ====================
(function () {
  const ROUNDS = 5;
  let state = 'idle'; // idle | waiting | go | early
  let timer = null;
  let startTime = 0;
  let results = [];

  const box = document.getElementById('reaction-box');
  const msg = document.getElementById('reaction-msg');
  const roundsEl = document.getElementById('reaction-rounds');

  function setState(s) {
    state = s;
    box.className = 'reaction-box state-' + s;
  }

  function scheduleGo() {
    setState('waiting');
    msg.textContent = '초록불을 기다려요...';
    clearTimeout(timer);
    timer = setTimeout(() => {
      setState('go');
      msg.textContent = '지금 클릭!';
      startTime = Date.now();
    }, 1000 + Math.random() * 3000);
  }

  function finish() {
    const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);
    setState('idle');
    msg.textContent = `평균 ${avg}ms — 클릭해서 다시`;
    handleGameEnd('reaction', avg);
  }

  box.addEventListener('click', () => {
    if (state === 'idle') {
      results = [];
      roundsEl.innerHTML = '';
      scheduleGo();
    } else if (state === 'waiting') {
      clearTimeout(timer);
      setState('early');
      msg.textContent = '너무 일찍! 잠깐 기다려요...';
      timer = setTimeout(scheduleGo, 1500);
    } else if (state === 'go') {
      const ms = Date.now() - startTime;
      results.push(ms);
      const badge = document.createElement('span');
      badge.className = 'reaction-badge';
      badge.textContent = `${results.length}회: ${ms}ms`;
      roundsEl.appendChild(badge);
      if (results.length < ROUNDS) {
        scheduleGo();
      } else {
        finish();
      }
    }
  });
})();

// ==================== 클릭 서바이벌 ====================
(function () {
  let score = 0, miss = 0, timeLeft = 60;
  let running = false;
  let spawnTimer = null, countTimer = null;

  const area = document.getElementById('survival-area');
  const overlay = document.getElementById('survival-overlay');
  const startBtn = document.getElementById('survival-start');
  const scoreEl = document.getElementById('survival-score');
  const missEl = document.getElementById('survival-miss');
  const timerEl = document.getElementById('survival-timer');

  function reset() {
    score = 0; miss = 0; timeLeft = 60;
    scoreEl.textContent = '0';
    missEl.textContent = '0';
    timerEl.textContent = '60';
    area.querySelectorAll('.survival-circle').forEach(c => c.remove());
  }

  function startGame() {
    reset();
    overlay.style.display = 'none';
    running = true;
    spawnLoop();
    countTimer = setInterval(tick, 1000);
  }

  function tick() {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }

  function spawnLoop() {
    if (!running) return;
    spawnCircle();
    spawnTimer = setTimeout(spawnLoop, 700 + Math.random() * 600);
  }

  const circleColors = ['#FF6B6B','#4ECDC4','#45B7D1','#F59E0B','#8B5CF6','#EC4899','#10AC84','#F97316'];

  function spawnCircle() {
    const size = 44 + Math.floor(Math.random() * 24);
    const x = Math.random() * (area.offsetWidth - size - 4);
    const y = Math.random() * (area.offsetHeight - size - 4);
    const color = circleColors[Math.floor(Math.random() * circleColors.length)];
    const circle = document.createElement('div');
    circle.className = 'survival-circle';
    circle.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:${color}`;
    area.appendChild(circle);

    const timeout = setTimeout(() => {
      if (circle.parentNode) {
        circle.remove();
        miss++;
        missEl.textContent = miss;
        if (miss >= 3 && running) endGame();
      }
    }, 1500);

    circle.addEventListener('click', () => {
      clearTimeout(timeout);
      circle.remove();
      score += 10;
      scoreEl.textContent = score;
    });
  }

  function endGame() {
    running = false;
    clearTimeout(spawnTimer);
    clearInterval(countTimer);
    area.querySelectorAll('.survival-circle').forEach(c => c.remove());
    overlay.innerHTML = `<p style="font-size:1.2rem;margin-bottom:1rem">게임 오버!<br>점수: <strong>${score}점</strong></p>
      <button class="surv-restart primary-btn" style="width:auto;margin:0">다시 하기</button>`;
    overlay.style.display = 'flex';
    overlay.querySelector('.surv-restart').addEventListener('click', startGame);
    handleGameEnd('click-survival', score);
  }

  startBtn.addEventListener('click', startGame);
})();

// ==================== 타이핑 게임 ====================
(function () {
  const WORDS = [
    '사과', '바나나', '딸기', '포도', '수박', '키위', '레몬', '망고', '복숭아', '체리',
    '고양이', '강아지', '토끼', '햄스터', '거북이', '앵무새', '금붕어', '다람쥐',
    '행복', '사랑', '웃음', '희망', '감사', '여행', '음악', '영화', '독서', '요리',
    '컴퓨터', '스마트폰', '자동차', '비행기', '기차', '자전거', '오토바이',
    '봄바람', '여름밤', '가을빛', '겨울눈', '무지개', '구름', '바다', '하늘',
    '커피', '케이크', '피자', '햄버거', '라면', '김밥', '떡볶이', '치킨'
  ];

  let score = 0, lives = 3, timeLeft = 60;
  let running = false;
  let spawnTimer = null, countTimer = null;
  let wordEls = [];

  const area = document.getElementById('typing-area');
  const overlay = document.getElementById('typing-overlay');
  const startBtn = document.getElementById('typing-start');
  const input = document.getElementById('typing-input');
  const scoreEl = document.getElementById('typing-score');
  const livesEl = document.getElementById('typing-lives');
  const timerEl = document.getElementById('typing-timer');

  function reset() {
    score = 0; lives = 3; timeLeft = 60;
    scoreEl.textContent = '0';
    livesEl.textContent = '3';
    timerEl.textContent = '60';
    area.querySelectorAll('.typing-word').forEach(w => w.remove());
    wordEls = [];
    input.value = '';
    input.disabled = false;
  }

  function startGame() {
    reset();
    overlay.style.display = 'none';
    running = true;
    scheduleSpawn();
    countTimer = setInterval(tick, 1000);
    input.focus();
  }

  function tick() {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }

  function scheduleSpawn() {
    if (!running) return;
    spawnWord();
    spawnTimer = setTimeout(scheduleSpawn, 1200 + Math.random() * 800);
  }

  function spawnWord() {
    const text = WORDS[Math.floor(Math.random() * WORDS.length)];
    const x = 10 + Math.random() * (area.offsetWidth - 90);
    const el = document.createElement('div');
    el.className = 'typing-word';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = '0px';
    el._text = text;
    area.appendChild(el);

    const areaH = area.offsetHeight;
    const duration = 4500 + Math.random() * 2000;
    const startT = Date.now();

    function fall() {
      if (!el.parentNode) return;
      const progress = (Date.now() - startT) / duration;
      el.style.top = (progress * (areaH - 36)) + 'px';
      if (progress >= 1) {
        el.remove();
        const idx = wordEls.indexOf(el);
        if (idx !== -1) wordEls.splice(idx, 1);
        if (!running) return;
        lives--;
        livesEl.textContent = lives;
        if (lives <= 0) endGame();
        return;
      }
      requestAnimationFrame(fall);
    }
    requestAnimationFrame(fall);
    wordEls.push(el);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const val = input.value.trim();
    if (!val) return;
    const idx = wordEls.findIndex(w => w._text === val);
    if (idx !== -1) {
      wordEls[idx].remove();
      wordEls.splice(idx, 1);
      score += 10;
      scoreEl.textContent = score;
    }
    input.value = '';
  });

  function endGame() {
    running = false;
    clearTimeout(spawnTimer);
    clearInterval(countTimer);
    input.disabled = true;
    area.querySelectorAll('.typing-word').forEach(w => w.remove());
    wordEls = [];
    overlay.innerHTML = `<p style="font-size:1.2rem;margin-bottom:1rem">게임 종료!<br>점수: <strong>${score}점</strong></p>
      <button class="typing-restart primary-btn" style="width:auto;margin:0">다시 하기</button>`;
    overlay.style.display = 'flex';
    overlay.querySelector('.typing-restart').addEventListener('click', startGame);
    handleGameEnd('typing', score);
  }

  startBtn.addEventListener('click', startGame);
})();

// ==================== 숫자 합치기 ====================
(function () {
  const COLS = 10, ROWS = 8;
  let grid = [], score = 0, timeLeft = 90;
  let running = false;
  let countTimer = null;
  let dragStart = null, dragEnd = null, isDragging = false;

  const gridEl = document.getElementById('numsum-grid');
  const scoreEl = document.getElementById('numsum-score');
  const timerEl = document.getElementById('numsum-timer');
  const startBtn = document.getElementById('numsum-start');
  const sumDisplay = document.getElementById('numsum-sum-display');

  function genGrid() {
    grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * 9) + 1);
      }
      grid.push(row);
    }
  }

  function renderGrid() {
    gridEl.innerHTML = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'numsum-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        const val = grid[r][c];
        cell.textContent = val === 0 ? '' : val;
        if (val === 0) cell.classList.add('cleared');
        gridEl.appendChild(cell);
      }
    }
  }

  function getCell(r, c) {
    return gridEl.querySelector(`.numsum-cell[data-r="${r}"][data-c="${c}"]`);
  }

  function getCellsInRect(r1, c1, r2, c2) {
    const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
    const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
    const cells = [];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        if (grid[r][c] !== 0) cells.push({ r, c });
      }
    }
    return cells;
  }

  function sumCells(cells) {
    return cells.reduce((s, { r, c }) => s + grid[r][c], 0);
  }

  function clearSelectionStyle() {
    gridEl.querySelectorAll('.numsum-cell.selected, .numsum-cell.error').forEach(el => {
      el.classList.remove('selected', 'error');
    });
    sumDisplay.textContent = '';
  }

  function updateSelection(r1, c1, r2, c2) {
    clearSelectionStyle();
    const cells = getCellsInRect(r1, c1, r2, c2);
    const sum = sumCells(cells);
    cells.forEach(({ r, c }) => getCell(r, c).classList.add('selected'));
    if (cells.length > 0) sumDisplay.textContent = `선택 합계: ${sum}`;
  }

  function tryConfirm(r1, c1, r2, c2) {
    const cells = getCellsInRect(r1, c1, r2, c2);
    const sum = sumCells(cells);
    if (sum === 10 && cells.length > 0) {
      cells.forEach(({ r, c }) => {
        grid[r][c] = 0;
        const cell = getCell(r, c);
        cell.classList.remove('selected');
        cell.classList.add('cleared');
        cell.textContent = '';
      });
      score += cells.length;
      scoreEl.textContent = score;
    } else if (cells.length > 0) {
      cells.forEach(({ r, c }) => {
        const cell = getCell(r, c);
        cell.classList.remove('selected');
        cell.classList.add('error');
      });
      setTimeout(() => {
        cells.forEach(({ r, c }) => {
          const cell = getCell(r, c);
          if (cell) cell.classList.remove('error');
        });
      }, 400);
    }
    sumDisplay.textContent = '';
  }

  function cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el || !el.classList.contains('numsum-cell')) return null;
    return { r: parseInt(el.dataset.r), c: parseInt(el.dataset.c) };
  }

  gridEl.addEventListener('mousedown', (e) => {
    if (!running) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    isDragging = true;
    dragStart = cell; dragEnd = cell;
    updateSelection(dragStart.r, dragStart.c, dragEnd.r, dragEnd.c);
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !running) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    if (cell.r !== dragEnd.r || cell.c !== dragEnd.c) {
      dragEnd = cell;
      updateSelection(dragStart.r, dragStart.c, dragEnd.r, dragEnd.c);
    }
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging || !running) return;
    isDragging = false;
    tryConfirm(dragStart.r, dragStart.c, dragEnd.r, dragEnd.c);
    dragStart = null; dragEnd = null;
  });

  gridEl.addEventListener('touchstart', (e) => {
    if (!running) return;
    const t = e.touches[0];
    const cell = cellFromPoint(t.clientX, t.clientY);
    if (!cell) return;
    isDragging = true;
    dragStart = cell; dragEnd = cell;
    updateSelection(dragStart.r, dragStart.c, dragEnd.r, dragEnd.c);
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging || !running) return;
    const t = e.touches[0];
    const cell = cellFromPoint(t.clientX, t.clientY);
    if (!cell) return;
    if (cell.r !== dragEnd.r || cell.c !== dragEnd.c) {
      dragEnd = cell;
      updateSelection(dragStart.r, dragStart.c, dragEnd.r, dragEnd.c);
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!isDragging || !running) return;
    isDragging = false;
    tryConfirm(dragStart.r, dragStart.c, dragEnd.r, dragEnd.c);
    dragStart = null; dragEnd = null;
  });

  function tick() {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }

  function startGame() {
    score = 0; timeLeft = 90;
    scoreEl.textContent = '0';
    timerEl.textContent = '90';
    sumDisplay.textContent = '';
    genGrid();
    renderGrid();
    clearInterval(countTimer);
    running = true;
    countTimer = setInterval(tick, 1000);
  }

  function endGame() {
    running = false;
    clearInterval(countTimer);
    clearSelectionStyle();
    sumDisplay.textContent = `게임 종료! 최종 점수: ${score}점`;
    handleGameEnd('numsum', score);
  }

  startBtn.addEventListener('click', startGame);

  // Initial render (before game starts)
  genGrid();
  renderGrid();
})();

// ==================== 퍼즐 슬라이딩 ====================
(function () {
  const SIZE = 4;
  let tiles = [];
  let moves = 0, timeElapsed = 0;
  let running = false;
  let timerInterval = null;

  const boardEl = document.getElementById('sliding-board');
  const timerEl = document.getElementById('sliding-timer');
  const movesEl = document.getElementById('sliding-moves');
  const startBtn = document.getElementById('sliding-start');

  function initBoard() {
    tiles = Array.from({ length: SIZE * SIZE }, (_, i) => i);
    shuffleBoard();
    moves = 0; timeElapsed = 0;
    movesEl.textContent = '0';
    timerEl.textContent = '0';
    render();
  }

  function shuffleBoard() {
    let eR = SIZE - 1, eC = SIZE - 1;
    for (let i = 0; i < 500; i++) {
      const dirs = [];
      if (eR > 0)      dirs.push([eR - 1, eC]);
      if (eR < SIZE-1) dirs.push([eR + 1, eC]);
      if (eC > 0)      dirs.push([eR, eC - 1]);
      if (eC < SIZE-1) dirs.push([eR, eC + 1]);
      const [nr, nc] = dirs[Math.floor(Math.random() * dirs.length)];
      const fromIdx = nr * SIZE + nc;
      const toIdx = eR * SIZE + eC;
      [tiles[fromIdx], tiles[toIdx]] = [tiles[toIdx], tiles[fromIdx]];
      eR = nr; eC = nc;
    }
  }

  function findEmpty() {
    const idx = tiles.indexOf(0);
    return { r: Math.floor(idx / SIZE), c: idx % SIZE };
  }

  function render() {
    boardEl.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const val = tiles[r * SIZE + c];
        const tile = document.createElement('div');
        tile.className = val === 0 ? 'sliding-tile empty' : 'sliding-tile';
        if (val !== 0) {
          tile.textContent = val;
          tile.addEventListener('click', () => tryMove(r, c));
        }
        boardEl.appendChild(tile);
      }
    }
  }

  function tryMove(r, c) {
    if (!running) return;
    const { r: er, c: ec } = findEmpty();
    const dr = Math.abs(r - er), dc = Math.abs(c - ec);
    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      [tiles[r * SIZE + c], tiles[er * SIZE + ec]] = [tiles[er * SIZE + ec], tiles[r * SIZE + c]];
      moves++;
      movesEl.textContent = moves;
      render();
      if (checkSolved()) endGame();
    }
  }

  function checkSolved() {
    for (let i = 0; i < SIZE * SIZE - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[SIZE * SIZE - 1] === 0;
  }

  function startGame() {
    clearInterval(timerInterval);
    const resultEl = document.getElementById('sliding-result');
    if (resultEl) resultEl.remove();
    initBoard();
    running = true;
    timerInterval = setInterval(() => {
      timeElapsed++;
      timerEl.textContent = timeElapsed;
    }, 1000);
  }

  function endGame() {
    running = false;
    clearInterval(timerInterval);
    let resultEl = document.getElementById('sliding-result');
    if (!resultEl) {
      resultEl = document.createElement('div');
      resultEl.id = 'sliding-result';
      resultEl.style.cssText = 'text-align:center;margin:1rem 0;padding:1rem;background:var(--bg-card);border-radius:12px;';
      boardEl.after(resultEl);
    }
    resultEl.innerHTML = `<p style="font-size:1.2rem;font-weight:bold">퍼즐 완성! 🎉</p>
      <p>${timeElapsed}초 / ${moves}번 이동</p>`;
    handleGameEnd('sliding', timeElapsed);
  }

  startBtn.addEventListener('click', startGame);

  // Show initial board
  initBoard();
})();
