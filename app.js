import { KitchenGame, LEVELS, RECIPES, INGREDIENTS, itemName } from './engine.js?v=1.1.0';
import { KitchenRenderer } from './renderer.js?v=1.1.0';
import { bindTouchControls } from './touch-controls.js?v=1.1.0';

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const renderer = new KitchenRenderer(canvas);
let selectedLevel = 0, selectedMode = 'solo', game = new KitchenGame();
let keys = new Set(), lastTime = 0, uiTime = 0, toastTimer, countdownTimer, countdownGeneration = 0;
let soundEnabled = false, audioContext = null, helpWasPlaying = false;
const mobileQuery = window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-width: 1200px)');
const touchCapable = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
const touchKeys = new Set();
let touchControls = null, stickX = 0, stickY = 0;
function clearInputs() { keys.clear(); touchControls?.reset(); stickX = 0; stickY = 0; }
function syncMobileLayout() {
  const mobile = mobileQuery.matches || (touchCapable && window.innerWidth <= 1200);
  document.body.classList.toggle('touch-device', mobile);
  document.body.classList.toggle('mobile-session', mobile && document.body.classList.contains('playing'));
  document.querySelector('[data-mode="solo"] small').textContent = mobile ? '触屏操作 · 点按钮换人' : 'Tab 切换两位厨师';
  document.querySelector('[data-mode="duo"] small').textContent = mobile ? '需要连接键盘合作' : '同一键盘，合作开饭';
  clearInputs(); renderer.resize();
}
function focusKitchen() { if (!document.body.classList.contains('mobile-session')) document.querySelector('.kitchen-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
let records = {};
try { records = JSON.parse(localStorage.getItem('little-kitchen-records') || '{}') || {}; } catch { records = {}; }
const inputCodes = new Set(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','Space','ShiftLeft','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter','ShiftRight','Slash','ControlRight','Escape']);

function sound(type) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const tones = { pickup: [520], drop: [320], chopped: [540, 690], plate: [660, 880], serve: [523, 659, 784, 1046], order: [690, 880], missed: [240, 160], cooked: [784, 1046], washed: [660, 784, 988], dash: [190], throw: [360], catch: [880], fire: [440, 350, 440], finish: [523, 659, 784, 1046], trash: [180], extinguished: [350, 440] }[type];
    if (!tones) return;
    tones.forEach((hz, i) => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      const start = audioContext.currentTime + i * .09;
      oscillator.type = ['missed','fire'].includes(type) ? 'triangle' : 'sine'; oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.075, start + .008); gain.gain.exponentialRampToValueAtTime(.001, start + .14);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .15);
    });
  } catch { /* 游戏在无音频设备时仍可游玩。 */ }
}
function toast(text) { clearTimeout(toastTimer); $('toast').textContent = text; $('toast').classList.add('show'); toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800); }
function formatTime(t) { return `${Math.floor(Math.ceil(t) / 60).toString().padStart(2, '0')}:${(Math.ceil(t) % 60).toString().padStart(2, '0')}`; }
function showOverlay(which) {
  ['startOverlay', 'pauseOverlay', 'resultOverlay'].forEach(id => { $(id).hidden = id !== which; });
}
function renderLevels() {
  $('levelCards').innerHTML = LEVELS.map((l, i) => {
    const record = Math.max(records[`${i}:solo`] || 0, records[`${i}:duo`] || 0), stars = l.stars.filter(t => record >= t).length;
    return `<button class="level-card ${i === selectedLevel ? 'selected' : ''}" data-level="${i}" aria-pressed="${i === selectedLevel}"><div class="level-thumb" aria-hidden="true"></div><div class="level-meta"><span class="level-number">KITCHEN 0${i + 1}</span><h3>${l.name}</h3><p>${l.subtitle}</p></div><div class="level-rating"><span class="earned">${'★'.repeat(stars)}</span>${'☆'.repeat(3 - stars)}</div>${i === selectedLevel ? '<span class="level-selected">当前厨房</span>' : ''}</button>`;
  }).join('');
  $('levelCards').querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if (game.status !== 'ready') { toast('先通过暂停菜单返回，再选择下一间厨房'); return; }
    selectedLevel = Number(button.dataset.level); createPreview();
  }));
}
function renderMenu() {
  $('recipeList').innerHTML = game.level.recipes.map(key => {
    const r = RECIPES[key], counts = [...new Set(r.ingredients)].map(i => `${INGREDIENTS[i].name} ×${r.ingredients.filter(v => v === i).length}`).join(' · ');
    return `<div class="recipe-row"><div class="recipe-icon">${r.cook ? '🍲' : '🥗'}</div><div class="recipe-desc"><strong>${r.name}</strong><p>${counts}</p></div><span class="recipe-value">${r.price}</span></div>`;
  }).join('');
  $('levelTitle').textContent = `0${game.level.id + 1} / ${game.level.name}`;
  $('modeLabel').textContent = game.mode === 'duo' ? '双人 · 同键盘合作' : '单人 · 可切换厨师';
  $('soloControls').hidden = game.mode === 'duo'; $('duoControls').hidden = game.mode !== 'duo';
  $('practiceBadge').textContent = game.practice ? 'FREE PRACTICE' : `${game.level.duration / 60} MIN SHIFT`;
  renderLevels();
}
function renderOrders() {
  const existing = [...$('orders').children].map(el => Number(el.dataset.id));
  const ids = game.orders.map(o => o.id);
  if (existing.join() !== ids.join()) {
    $('orders').innerHTML = game.orders.map(order => {
      const r = RECIPES[order.recipe];
      return `<article class="order-ticket" data-id="${order.id}"><div class="ticket-top"><span>#${String(order.id).padStart(2,'0')}</span><span class="ticket-price">${r.price} + 小费</span><span class="ticket-seconds"></span></div><div class="ticket-title">${r.name}</div><div class="ticket-ingredients">${r.ingredients.map(i => `<span title="${INGREDIENTS[i].name}">${INGREDIENTS[i].icon}</span>`).join('')}<span class="recipe-method">${r.cook ? '煮' : '切'}</span></div><div class="ticket-track"><i></i></div></article>`;
    }).join('') || '<div class="order-empty">新订单正在路上…</div>';
  }
  game.orders.forEach((order, i) => {
    const el = $('orders').children[i];
    if (!el) return;
    el.classList.toggle('urgent', order.time < 25 && !game.practice);
    el.querySelector('.ticket-track i').style.width = `${game.practice ? 100 : Math.max(0, order.time / order.duration * 100)}%`;
    el.title = `${RECIPES[order.recipe].name} · ${game.practice ? '不限时' : `剩余 ${Math.ceil(order.time)} 秒`}`;
    el.querySelector('.ticket-seconds').textContent = game.practice ? '不限时' : `${Math.ceil(order.time)}秒`;
  });
  $('orderCount').textContent = String(game.orders.length).padStart(2, '0');
}
function updateUI() {
  document.body.dataset.gameState = game.status;
  renderOrders();
  $('timer').textContent = game.practice ? '∞' : formatTime(game.time);
  $('timer').parentElement.classList.toggle('urgent', !game.practice && game.time < 30);
  $('timeFill').style.width = `${game.practice ? 100 : game.time / game.level.duration * 100}%`;
  $('score').textContent = game.score;
  $('starTrack').innerHTML = game.level.stars.map(t => `<span class="${game.score >= t ? 'earned' : ''}">${game.score >= t ? '★' : '☆'} <small>${t}</small></span>`).join('');
  $('comboValue').textContent = `×${Math.max(1, game.combo)}`;
  $('comboText').textContent = game.combo > 1 ? `${game.combo} 连单！每份额外奖励 ${(game.combo - 1) * 15}` : '按订单顺序交餐，收获连单奖励';
  $('comboText').parentElement.classList.toggle('active', game.combo > 1);
  const p = game.players[game.activePlayer];
  $('contextText').textContent = game.status === 'playing' ? (renderer.mobile && p.hintTime > 0 ? p.hint : game.context(p)) : '小贴士：食材要先切好，料理装盘后才能交给客人。';
  $('p1Label').textContent = game.mode === 'solo' ? `你 · 厨师 P${p.id + 1}` : '你 · P1';
  $('held1').textContent = itemName(game.mode === 'solo' ? p.held : game.players[0].held);
  $('held2').textContent = itemName(game.players[1].held);
  $('held2solo').textContent = `P${2 - game.activePlayer} · ${itemName(game.players[1 - game.activePlayer].held)}`;
  document.querySelector('.chef-label .chef-dot').style.background = game.mode === 'solo' && game.activePlayer === 1 ? '#4c9792' : '#e97858';
  updateMobileUI(p);
}
function updateMobileUI(p) {
  $('mobileTimer').textContent = game.practice ? '∞' : formatTime(game.time);
  $('mobileTimer').classList.toggle('urgent', !game.practice && game.time < 30);
  $('mobileScore').textContent = game.score;
  $('mobileChef').textContent = `P${p.id + 1}`; $('mobileHeld').textContent = itemName(p.held);
  $('mobileChefDot').style.background = p.id === 0 ? '#e97858' : '#4c9792';
  $('mobilePauseBtn').disabled = !['playing','paused'].includes(game.status);
  $('mobilePauseBtn').textContent = game.status === 'paused' ? '继续' : '暂停';
  const target = game.target(p);
  let take = p.held ? '放下' : '拿取', action = '操作', progress = 0;
  if (target?.type === 'crate' && !p.held) take = `拿${INGREDIENTS[target.ingredient].name}`;
  if (target?.type === 'plates' && !p.held) take = '拿盘子';
  if (target?.type === 'sink') { take = '放脏盘'; action = '洗盘'; progress = target.progress; }
  if (target?.type === 'board') { action = '切菜'; progress = target.progress; }
  if (target?.type === 'serve') take = '交餐';
  if (target?.type === 'trash') take = '丢弃';
  if (target?.type === 'stove') {
    take = target.state === 'ready' ? '盛汤' : target.state === 'burnt' ? '清锅' : '下锅';
    if (target.state === 'fire') { action = '灭火'; progress = 1 - target.fire; }
  }
  if (target?.item && (p.held?.kind === 'plate' || target.item.kind === 'plate') && (p.held?.kind === 'ingredient' || target.item.kind === 'ingredient')) take = '装盘';
  $('touchPickLabel').textContent = take; $('touchActionLabel').textContent = action;
  $('touchActionProgress').style.width = `${Math.min(1, progress) * 100}%`;
  $('touchAction').classList.toggle('available', action !== '操作');
  const potText = game.stations.filter(s => s.type === 'stove').map((s, i) => {
    const state = { cooking: `煮汤 ${Math.ceil(10 - s.cook)}秒`, ready: '煮好了，快盛汤', fire: '着火了！快灭火', burnt: '需要清锅' }[s.state];
    return state ? `<span class="pot-alert ${s.state}">${i + 1}号锅 · ${state}</span>` : '';
  }).join('');
  if ($('mobilePotAlerts').innerHTML !== potText) $('mobilePotAlerts').innerHTML = potText;
}
function createPreview() {
  cancelCountdown(); game = new KitchenGame({ level: selectedLevel, mode: selectedMode });
  game.takeEvents(); renderMenu(); updateUI(); showOverlay('startOverlay');
  $('pauseBtn').disabled = true; $('sessionLabel').textContent = '准备开张'; document.body.classList.remove('playing'); syncMobileLayout();
}
function cancelCountdown() { clearTimeout(countdownTimer); countdownGeneration++; }
function startGame(practice = false) {
  cancelCountdown(); clearInputs(); renderer.fx = []; renderer.overview = false; renderer.focus = null; updateCameraButton(); $('toast').classList.remove('show');
  game = new KitchenGame({ level: selectedLevel, mode: selectedMode, practice }); game.takeEvents();
  showOverlay(null); renderMenu(); updateUI(); $('pauseBtn').disabled = true;
  document.body.classList.add('playing'); syncMobileLayout(); $('sessionLabel').textContent = '系好围裙…';
  canvas.focus({ preventScroll: true });
  focusKitchen();
  const generation = countdownGeneration;
  const launch = n => {
    if (generation !== countdownGeneration) return;
    if (n > 0) { toast(`${n} · 系好围裙，准备开饭`); sound('order'); countdownTimer = setTimeout(() => launch(n - 1), 650); }
    else {
      game.start(); $('pauseBtn').disabled = false; $('sessionLabel').textContent = practice ? '练习中 · 不限时' : '营业中';
      toast(practice ? '不限时练习：先完成一份田园沙拉吧' : '开张！先完成最左边的订单');
      if ($('helpDialog').open) { helpWasPlaying = true; pause(); }
      else if (document.hidden || !document.hasFocus()) pause();
    }
  };
  launch(3);
}
function pause() {
  if (game.status !== 'playing') return;
  game.status = 'paused'; clearInputs(); showOverlay('pauseOverlay'); $('sessionLabel').textContent = '暂歇片刻'; $('pauseBtn').setAttribute('aria-label', '继续游戏'); $('pauseBtn').innerHTML = '▷<span>继续</span>';
}
function resume() {
  if (game.status !== 'paused') return;
  game.status = 'playing'; showOverlay(null); clearInputs(); canvas.focus({ preventScroll: true });
  focusKitchen();
  $('sessionLabel').textContent = game.practice ? '练习中 · 不限时' : '营业中'; $('pauseBtn').setAttribute('aria-label', '暂停游戏'); $('pauseBtn').innerHTML = 'Ⅱ<span>暂停</span>';
}
function returnMenu() { clearInputs(); $('pauseBtn').innerHTML = 'Ⅱ<span>暂停</span>'; $('pauseBtn').setAttribute('aria-label', '暂停游戏'); createPreview(); }
function finish() {
  clearInputs(); showOverlay('resultOverlay'); $('pauseBtn').disabled = true; $('sessionLabel').textContent = '今日已打烊';
  const key = `${selectedLevel}:${selectedMode}`;
  records[key] = Math.max(records[key] || 0, game.score);
  try { localStorage.setItem('little-kitchen-records', JSON.stringify(records)); } catch { /* 不支持存储时仍显示本次成绩。 */ }
  $('resultStars').innerHTML = `${'★'.repeat(game.stars)}<span>${'☆'.repeat(3 - game.stars)}</span>`;
  $('resultTitle').textContent = ['今日营业结束', '小厨房，大进步！', '默契越来越香。', '三星厨房，完美收工！'][game.stars];
  $('resultCopy').textContent = game.stars === 3 ? '忙碌的一天，每一份美味都值得。' : `再多一点配合，下颗星需要 ${game.level.stars[game.stars]} 分。`;
  $('resultScore').textContent = game.score; $('resultServed').textContent = game.served; $('resultMissed').textContent = game.missed; $('resultCombo').textContent = game.maxCombo;
  $('nextBtn').hidden = selectedLevel === LEVELS.length - 1; renderLevels();
}
function help() {
  if ($('helpDialog').open) return;
  helpWasPlaying = game.status === 'playing'; if (helpWasPlaying) pause();
  clearInputs(); $('helpDialog').showModal();
}
function closeHelp() { $('helpDialog').close(); }
function handleKey(code) {
  if (code === 'Escape') { if ($('helpDialog').open) return; if (game.status === 'playing') pause(); else if (game.status === 'paused') resume(); return; }
  if (game.status !== 'playing' || $('helpDialog').open) return;
  const p1 = game.mode === 'solo' ? game.activePlayer : 0;
  if (code === 'Tab' && game.mode === 'solo') { game.activePlayer = 1 - game.activePlayer; sound('pickup'); }
  if (code === 'KeyE') game.interact(p1);
  if (code === 'KeyQ') game.throwItem(p1);
  if (code === 'ShiftLeft') game.dash(p1);
  if (game.mode === 'duo') {
    if (code === 'Enter') game.interact(1);
    if (code === 'Slash') game.dash(1);
    if (code === 'ControlRight') game.throwItem(1);
  }
}
window.addEventListener('keydown', event => {
  if (!inputCodes.has(event.code) || $('helpDialog').open) return;
  if (!['playing','paused'].includes(game.status)) return;
  if (game.status === 'paused' && event.code !== 'Escape') return;
  if (event.target.closest?.('button') && event.code === 'Enter') return;
  event.preventDefault();
  if (!keys.has(event.code) && !event.repeat) handleKey(event.code);
  keys.add(event.code);
});
window.addEventListener('keyup', event => { keys.delete(event.code); });
window.addEventListener('blur', () => { clearInputs(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInputs(); pause(); } });
window.addEventListener('resize', syncMobileLayout);
mobileQuery.addEventListener('change', syncMobileLayout);
new ResizeObserver(() => renderer.resize()).observe(canvas.parentElement);
canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }));

$('startBtn').addEventListener('click', () => startGame());
$('practiceBtn').addEventListener('click', () => startGame(true));
$('pauseBtn').addEventListener('click', () => game.status === 'paused' ? resume() : pause());
$('mobilePauseBtn').addEventListener('click', () => game.status === 'paused' ? resume() : pause());
$('mobileHelpBtn').addEventListener('click', help);
function updateCameraButton() {
  $('cameraBtn').textContent = renderer.overview ? '跟随' : '全景';
  $('cameraBtn').setAttribute('aria-pressed', String(renderer.overview));
  $('cameraNote').textContent = renderer.overview ? '全景查看中 · 点「跟随」放大' : '镜头跟随 · 右下角查看位置';
}
$('cameraBtn').addEventListener('click', () => { renderer.overview = !renderer.overview; renderer.focus = null; updateCameraButton(); });
$('resumeBtn').addEventListener('click', resume);
$('restartBtn').addEventListener('click', () => { $('pauseBtn').innerHTML = 'Ⅱ<span>暂停</span>'; startGame(game.practice); });
$('menuBtn').addEventListener('click', returnMenu);
$('againBtn').addEventListener('click', () => startGame());
$('nextBtn').addEventListener('click', () => { selectedLevel = Math.min(2, selectedLevel + 1); startGame(); });
$('resultMenuBtn').addEventListener('click', returnMenu);
['helpBtn','fullHelpBtn'].forEach(id => $(id).addEventListener('click', help));
['closeHelpBtn','helpDoneBtn'].forEach(id => $(id).addEventListener('click', closeHelp));
$('helpDialog').addEventListener('close', () => { if (helpWasPlaying) resume(); helpWasPlaying = false; });
$('helpDialog').addEventListener('click', e => { if (e.target === $('helpDialog')) { const r = $('helpDialog').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeHelp(); } });
$('soundBtn').addEventListener('click', () => {
  soundEnabled = !soundEnabled; $('soundBtn').innerHTML = `♪<span>音效${soundEnabled ? '开' : '关'}</span>`;
  $('soundBtn').setAttribute('aria-label', `${soundEnabled ? '关闭' : '打开'}音效`); $('soundBtn').title = `${soundEnabled ? '关闭' : '打开'}音效`;
  if (soundEnabled) sound('serve');
});
document.querySelectorAll('.mode-choice').forEach(button => button.addEventListener('click', () => {
  selectedMode = button.dataset.mode;
  document.querySelectorAll('.mode-choice').forEach(el => { el.classList.toggle('selected', el === button); el.setAttribute('aria-pressed', String(el === button)); });
  createPreview();
}));
touchControls = bindTouchControls({ onTap: handleKey, onStick: (x, y) => { stickX = x; stickY = y; }, heldKeys: touchKeys });

function frame(now) {
  const dt = Math.min(.05, Math.max(0, (now - (lastTime || now)) / 1000)); lastTime = now;
  const first = { x: Number(keys.has('KeyD')) - Number(keys.has('KeyA')) + stickX, y: Number(keys.has('KeyS')) - Number(keys.has('KeyW')) + stickY, action: keys.has('Space') || touchKeys.has('Space') };
  const second = { x: Number(keys.has('ArrowRight')) - Number(keys.has('ArrowLeft')), y: Number(keys.has('ArrowDown')) - Number(keys.has('ArrowUp')), action: keys.has('ShiftRight') };
  const inputs = game.mode === 'duo' ? [first, second] : game.activePlayer === 0 ? [first, {}] : [{}, first];
  game.update(dt, inputs);
  for (const event of game.takeEvents()) {
    sound(event.type);
    if (event.type === 'serve') { renderer.celebrate(event.earned); toast(`好菜上桌！＋${event.earned}${event.combo > 1 ? ` · ${event.combo} 连单` : ''}`); }
    if (event.type === 'missed') toast('一位客人等不及了 · −30 · 连单重置');
    if (event.type === 'fire') toast('锅着火了！拿灭火器，面对锅按住操作键');
    if (event.type === 'cooked') toast('汤煮好了，快拿空餐盘来盛！');
    if (event.type === 'finish') finish();
  }
  renderer.draw(game, game.status === 'paused' ? 0 : dt);
  uiTime += dt;
  if (uiTime > .09) { updateUI(); uiTime = 0; }
  requestAnimationFrame(frame);
}
createPreview(); requestAnimationFrame(frame);
