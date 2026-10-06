export const INGREDIENTS = {
  tomato: { name: '番茄', color: '#e7674f', icon: '🍅' },
  lettuce: { name: '生菜', color: '#80a666', icon: '🥬' },
  onion: { name: '洋葱', color: '#b98ab8', icon: '🧅' },
};
export const RECIPES = {
  salad: { name: '田园沙拉', short: '沙拉', ingredients: ['lettuce', 'tomato'], cook: false, price: 80, icon: '🥗' },
  tomatoSoup: { name: '浓香番茄汤', short: '番茄汤', ingredients: ['tomato', 'tomato', 'tomato'], cook: true, price: 120, icon: '🍅' },
  onionSoup: { name: '法式洋葱汤', short: '洋葱汤', ingredients: ['onion', 'onion', 'onion'], cook: true, price: 120, icon: '🧅' },
  mixedSoup: { name: '双蔬暖心汤', short: '双蔬汤', ingredients: ['onion', 'onion', 'tomato'], cook: true, price: 140, icon: '🍲' },
};
export const LEVELS = [
  { id: 0, name: '阳光小馆', subtitle: '一切从一盘沙拉开始', duration: 240, orderTime: 100, interval: 29, recipes: ['salad', 'tomatoSoup'], stars: [250, 550, 850], color: '#daeadc' },
  { id: 1, name: '街角食堂', subtitle: '锅里的美味，再多一点', duration: 240, orderTime: 95, interval: 25, recipes: ['salad', 'onionSoup', 'tomatoSoup'], stars: [350, 700, 1050], color: '#f0dcc3' },
  { id: 2, name: '晚高峰', subtitle: '保持冷静，开饭啦！', duration: 210, orderTime: 85, interval: 22, recipes: ['salad', 'mixedSoup', 'tomatoSoup', 'onionSoup'], stars: [400, 800, 1200], color: '#dbe2ed' },
];
const sorted = a => [...a].sort().join(',');
export function recipeFor(ingredients, cook) {
  return Object.entries(RECIPES).find(([, r]) => r.cook === cook && sorted(r.ingredients) === sorted(ingredients))?.[0] || null;
}
export function canAdd(ingredients, next, cook) {
  const list = [...ingredients, next];
  return Object.values(RECIPES).some(r => r.cook === cook && list.every(i => list.filter(x => x === i).length <= r.ingredients.filter(x => x === i).length));
}
export function itemName(item) {
  if (!item) return '空手';
  if (item.kind === 'ingredient') return `${item.chopped ? '切好的' : ''}${INGREDIENTS[item.type].name}`;
  if (item.kind === 'plate') return item.recipe ? RECIPES[item.recipe].name : item.ingredients.length ? `餐盘 · ${item.ingredients.map(i => INGREDIENTS[i].name).join('＋')}` : '干净餐盘';
  return { dirty: '脏盘子', extinguisher: '灭火器', burnt: '烧焦的食物' }[item.kind] || '';
}

export class KitchenGame {
  constructor({ level = 0, mode = 'solo', practice = false, random = Math.random } = {}) {
    this.level = LEVELS[level] || LEVELS[0];
    this.mode = mode; this.practice = practice; this.random = random;
    this.time = this.level.duration; this.elapsed = 0; this.status = 'ready';
    this.score = 0; this.served = 0; this.missed = 0; this.combo = 0; this.maxCombo = 0;
    this.activePlayer = 0; this.cleanPlates = 4; this.dirtyPlates = 0; this.returnQueue = [];
    this.orders = []; this.orderId = 0; this.orderCountdown = 14; this.recipeCursor = 0;
    this.events = []; this.floorItems = []; this.particles = []; this.stations = [];
    this.players = [this.newPlayer(0, 3.5, 4.5), this.newPlayer(1, 9.5, 4.5)];
    this.buildKitchen(); this.addOrder('salad');
    if (!practice) this.addOrder(this.level.recipes[1]);
  }
  newPlayer(id, x, y) { return { id, x, y, dx: 0, dy: -1, held: null, dashTime: 0, cooldown: 0, moving: false, action: false, walk: 0, hint: '', hintTime: 0 }; }
  buildKitchen() {
    const put = (x, y, type, extra = {}) => { const s = { id: `${x},${y}`, x: x + .5, y: y + .5, type, item: null, progress: 0, ...extra }; this.stations.push(s); return s; };
    for (let x = 1; x <= 11; x++) { put(x, 1, 'counter'); put(x, 7, 'counter'); }
    for (let y = 2; y <= 6; y++) { put(1, y, 'counter'); put(11, y, 'counter'); }
    const change = (x, y, type, extra = {}) => Object.assign(this.stationAt(x, y), { type, ...extra });
    change(1, 2, 'crate', { ingredient: 'tomato' });
    change(1, 3, 'crate', { ingredient: 'lettuce' });
    change(1, 4, 'crate', { ingredient: 'onion' });
    change(3, 1, 'board'); change(4, 1, 'board');
    change(7, 1, 'stove', { ingredients: [], state: 'empty', cook: 0, burn: 0, fire: 0 });
    change(8, 1, 'stove', { ingredients: [], state: 'empty', cook: 0, burn: 0, fire: 0 });
    change(11, 3, 'serve'); change(11, 4, 'serve');
    change(3, 7, 'dirty'); change(4, 7, 'sink'); change(5, 7, 'plates');
    change(8, 7, 'extinguisher', { item: { kind: 'extinguisher' } });
    change(9, 7, 'trash');
    for (let x = 5; x <= 7; x++) put(x, 4, 'counter');
    if (this.level.id >= 1) put(6, 3, 'counter');
    if (this.level.id === 2) { put(6, 5, 'counter'); change(4, 1, 'counter'); this.stationAt(7, 4).type = 'board'; }
  }
  stationAt(x, y) { return this.stations.find(s => Math.floor(s.x) === x && Math.floor(s.y) === y); }
  start() { this.status = 'playing'; }
  event(type, detail = {}) { this.events.push({ type, ...detail }); }
  takeEvents() { return this.events.splice(0); }
  hint(player, text) { player.hint = text; player.hintTime = 2.6; this.event('hint', { text, player: player.id }); }
  addOrder(preferred) {
    const keys = this.level.recipes;
    const key = preferred || keys[this.recipeCursor++ % keys.length];
    const duration = this.level.orderTime + (this.mode === 'solo' ? 30 : 0);
    this.orders.push({ id: ++this.orderId, recipe: key, time: duration, duration });
    this.event('order');
  }
  target(player) {
    let best = null, score = 9;
    for (const station of this.stations) {
      const dx = station.x - player.x, dy = station.y - player.y, distance = Math.hypot(dx, dy);
      const dot = (dx * player.dx + dy * player.dy) / (distance || 1);
      if (distance <= 1.34 && dot > .48) {
        const rank = distance + (1 - dot) * .45;
        if (rank < score) { score = rank; best = station; }
      }
    }
    return best;
  }
  isFree(x, y, player, ignorePlayers = false) {
    const r = .24;
    if (x < 1.25 || x > 11.75 || y < 1.25 || y > 7.75) return false;
    for (const s of this.stations) {
      const nx = Math.max(s.x - .49, Math.min(x, s.x + .49));
      const ny = Math.max(s.y - .49, Math.min(y, s.y + .49));
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return false;
    }
    return ignorePlayers || this.players.every(p => p === player || Math.hypot(p.x - x, p.y - y) > .5);
  }
  move(player, dx, dy, dt) {
    player.moving = !!(dx || dy); player.action = false;
    if (!player.moving) return;
    const length = Math.hypot(dx, dy); dx /= length; dy /= length;
    if (Math.abs(dx) > Math.abs(dy)) { player.dx = Math.sign(dx); player.dy = 0; }
    else { player.dx = 0; player.dy = Math.sign(dy); }
    const speed = player.dashTime > 0 ? 7.8 : 3.25;
    const steps = Math.ceil(speed * dt / .12);
    for (let i = 0; i < steps; i++) {
      const nx = player.x + dx * speed * dt / steps, ny = player.y + dy * speed * dt / steps;
      if (this.isFree(nx, player.y, player)) player.x = nx;
      if (this.isFree(player.x, ny, player)) player.y = ny;
    }
    player.walk += dt * speed * 3;
  }
  dash(id) {
    if (this.status !== 'playing') return;
    const p = this.players[id];
    if (p.cooldown <= 0) { p.dashTime = .2; p.cooldown = .9; this.event('dash'); }
  }
  interact(id) {
    if (this.status !== 'playing') return;
    const p = this.players[id], s = this.target(p);
    if (!s) {
      const index = this.floorItems.findIndex(f => Math.hypot(f.x - p.x, f.y - p.y) < .95);
      if (!p.held && index >= 0) { p.held = this.floorItems.splice(index, 1)[0].item; this.event('pickup'); return; }
      if (p.held) { this.floorItems.push({ x: p.x + p.dx * .35, y: p.y + p.dy * .35, item: p.held }); p.held = null; this.event('drop'); }
      return;
    }
    if (s.type === 'crate') {
      if (!p.held) { p.held = { kind: 'ingredient', type: s.ingredient, chopped: false }; this.event('pickup'); }
      else if (p.held.kind === 'ingredient' && p.held.type === s.ingredient && !p.held.chopped) { p.held = null; this.event('drop'); }
      else this.hint(p, '先把手中的东西放到台面上');
      return;
    }
    if (s.type === 'plates') {
      if (!p.held && this.cleanPlates > 0) { this.cleanPlates--; p.held = { kind: 'plate', ingredients: [], recipe: null }; this.event('pickup'); }
      else if (p.held?.kind === 'plate' && !p.held.ingredients.length && !p.held.recipe) { p.held = null; this.cleanPlates++; this.event('drop'); }
      else this.hint(p, this.cleanPlates ? '空手时拿取干净餐盘' : '没有干净盘子了，去水槽洗一洗');
      return;
    }
    if (s.type === 'dirty') {
      if (!p.held && this.dirtyPlates) { this.dirtyPlates--; p.held = { kind: 'dirty' }; this.event('pickup'); }
      else if (p.held?.kind === 'dirty') { p.held = null; this.dirtyPlates++; }
      else this.hint(p, this.dirtyPlates ? '空手拿脏盘子，放到旁边水槽' : '客人用过的盘子会回到这里');
      return;
    }
    if (s.type === 'sink') {
      if (!s.item && p.held?.kind === 'dirty') { s.item = p.held; p.held = null; s.progress = 0; this.event('drop'); }
      else if (!s.item && !p.held && this.dirtyPlates > 0) { this.dirtyPlates--; s.item = { kind: 'dirty' }; s.progress = 0; this.event('drop'); }
      else this.hint(p, s.item ? '按住操作键洗盘子' : '先把脏盘子放进水槽');
      return;
    }
    if (s.type === 'trash') {
      if (p.held?.kind === 'plate') { p.held.ingredients = []; p.held.recipe = null; this.event('trash'); }
      else if (p.held?.kind === 'dirty') this.hint(p, '盘子不能丢，拿去洗干净吧');
      else if (p.held?.kind === 'extinguisher') this.hint(p, '灭火器可以放回台面');
      else if (p.held) { p.held = null; this.event('trash'); }
      return;
    }
    if (s.type === 'serve') { this.serve(p); return; }
    if (s.type === 'stove') { this.interactStove(p, s); return; }
    if (!p.held && s.item) { p.held = s.item; s.item = null; s.progress = 0; this.event('pickup'); return; }
    if (p.held && !s.item) {
      s.item = p.held; p.held = null; s.progress = 0; this.event('drop');
      if (s.type === 'board' && s.item.kind === 'ingredient' && !s.item.chopped) this.hint(p, '按住操作键切菜');
      return;
    }
    if (p.held && s.item) {
      const plate = p.held.kind === 'plate' ? p.held : s.item.kind === 'plate' ? s.item : null;
      const ingredient = p.held.kind === 'ingredient' ? p.held : s.item.kind === 'ingredient' ? s.item : null;
      if (plate && ingredient) {
        if (!ingredient.chopped) { this.hint(p, '食材需要先切好'); return; }
        if (plate.recipe || !canAdd(plate.ingredients, ingredient.type, false)) { this.hint(p, '沙拉需要一份生菜和一份番茄'); return; }
        plate.ingredients.push(ingredient.type); plate.recipe = recipeFor(plate.ingredients, false);
        if (p.held === ingredient) p.held = null; else { s.item = null; s.progress = 0; }
        this.event('plate'); return;
      }
      this.hint(p, '台面已有东西，换一块空台面');
    }
  }
  interactStove(p, s) {
    if (s.state === 'fire') { this.hint(p, '拿灭火器，按住操作键灭火！'); return; }
    if (s.state === 'burnt') {
      if (!p.held) { p.held = { kind: 'burnt' }; this.resetPot(s); this.event('pickup'); }
      else this.hint(p, '先空手取出糊锅食物，再丢进垃圾桶');
      return;
    }
    if (s.state === 'ready') {
      if (p.held?.kind === 'plate' && !p.held.ingredients.length && !p.held.recipe) {
        p.held.ingredients = [...s.ingredients]; p.held.recipe = recipeFor(s.ingredients, true); this.resetPot(s); this.event('plate');
      } else this.hint(p, '拿一个空餐盘来盛汤');
      return;
    }
    if (p.held?.kind === 'ingredient') {
      if (!p.held.chopped) { this.hint(p, '食材需要先切好'); return; }
      if (s.state === 'cooking') { this.hint(p, '这锅正在煮，稍等一下'); return; }
      if (!canAdd(s.ingredients, p.held.type, true)) { this.hint(p, '汤需要 3 番茄、3 洋葱，或 2 洋葱＋1 番茄'); return; }
      s.ingredients.push(p.held.type); p.held = null; s.state = s.ingredients.length === 3 ? 'cooking' : 'filling'; s.cook = 0; this.event('drop');
    } else this.hint(p, s.state === 'cooking' ? '汤正在咕嘟咕嘟…备好餐盘吧' : '放入三份切好的汤料，自动开煮');
  }
  resetPot(s) { s.ingredients = []; s.state = 'empty'; s.cook = 0; s.burn = 0; s.fire = 0; }
  serve(p) {
    if (!p.held || p.held.kind !== 'plate' || !p.held.recipe) { this.hint(p, '把做好的料理装盘，再来交餐'); return; }
    const index = this.orders.findIndex(o => o.recipe === p.held.recipe);
    if (index < 0) { this.hint(p, '目前没有这道菜的订单'); return; }
    const [order] = this.orders.splice(index, 1);
    const tip = Math.ceil(order.time / order.duration * 30);
    this.combo = index === 0 ? Math.min(this.combo + 1, 4) : 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const earned = RECIPES[order.recipe].price + tip + (this.combo - 1) * 15;
    this.score += earned; this.served++; p.held = null; this.returnQueue.push(7);
    this.event('serve', { earned, combo: this.combo, recipe: order.recipe });
    this.hint(p, `交餐成功！＋${earned}`);
    if (!this.orders.length) this.addOrder();
  }
  action(id, dt) {
    const p = this.players[id], s = this.target(p);
    if (!s || p.moving) return;
    p.action = true;
    if (s.type === 'board' && s.item?.kind === 'ingredient' && !s.item.chopped) {
      s.progress += dt / 2.2;
      if (s.progress >= 1) { s.item.chopped = true; s.progress = 0; this.event('chopped'); }
    }
    if (s.type === 'sink' && s.item?.kind === 'dirty') {
      s.progress += dt / 2.8;
      if (s.progress >= 1) { s.item = null; s.progress = 0; this.cleanPlates++; this.event('washed'); this.hint(p, '洗好了！餐盘已放回盘架'); }
    }
    if (s.type === 'stove' && s.state === 'fire' && p.held?.kind === 'extinguisher') {
      s.fire -= dt / 1.8;
      if (s.fire <= 0) { s.state = 'burnt'; this.event('extinguished'); }
    }
  }
  throwItem(id) {
    if (this.status !== 'playing') return;
    const p = this.players[id];
    if (p.held?.kind !== 'ingredient') { this.hint(p, '只能投掷食材；盘子请放台面'); return; }
    const item = p.held; p.held = null;
    let x = p.x, y = p.y;
    for (let n = 1; n <= 30; n++) {
      const nx = p.x + p.dx * n * .1, ny = p.y + p.dy * n * .1;
      const other = this.players.find(o => o !== p && !o.held && Math.hypot(o.x - nx, o.y - ny) < .45);
      if (other) { other.held = item; this.event('catch'); return; }
      const surface = this.stations.find(s => Math.abs(nx - s.x) < .52 && Math.abs(ny - s.y) < .52);
      if (surface) {
        if (['counter', 'board'].includes(surface.type) && !surface.item) { surface.item = item; surface.progress = 0; this.event('drop'); return; }
        break;
      }
      if (nx < 1.25 || nx > 11.75 || ny < 1.25 || ny > 7.75) break;
      x = nx; y = ny;
    }
    this.floorItems.push({ x, y, item }); this.event('throw');
  }
  context(p) {
    const s = this.target(p);
    if (!s) return p.held ? '拿放键：放下 · Q / 右 Ctrl：投掷食材' : '走近工作台，朝向它拿取物品';
    if (s.type === 'crate') return `拿取${INGREDIENTS[s.ingredient].name} → 送到切菜板`;
    if (s.type === 'board') return s.item?.kind === 'ingredient' && !s.item.chopped ? '按住操作键切菜 · 切好后用拿放键取走' : s.item ? '拿放键：拿取 / 装盘' : '拿放键：放下食材，按住操作键切菜';
    if (s.type === 'stove') return ({ empty: '放入 3 份切好的汤料', filling: `还需要 ${3 - s.ingredients.length} 份切好的汤料`, cooking: '正在烹饪，去拿一个干净餐盘', ready: '拿空餐盘盛汤，放久了会烧焦！', fire: '拿灭火器，按住操作键灭火！', burnt: '空手拿出糊锅食物，丢到垃圾桶' })[s.state];
    return { plates: `拿放键：取餐盘 · 剩余 ${this.cleanPlates} 个`, serve: '拿放键：交付装盘料理', sink: s.item ? '按住操作键洗盘子' : '拿放键：放入脏盘子（也可空手自动取脏盘）', dirty: `用过的盘子 × ${this.dirtyPlates} · 拿到旁边水槽`, trash: '拿放键：丢弃食物 / 清空餐盘', extinguisher: '拿灭火器靠近着火的锅，按住操作键', counter: '拿放键：放下 / 拿起 · 切好的蔬菜可以装进餐盘' }[s.type] || '';
  }
  update(dt, inputs = []) {
    if (this.status !== 'playing') return;
    dt = Math.min(.05, Math.max(0, dt)); this.elapsed += dt;
    if (!this.practice) this.time = Math.max(0, this.time - dt);
    this.players.forEach((p, i) => {
      const input = inputs[i] || {};
      p.cooldown = Math.max(0, p.cooldown - dt); p.dashTime = Math.max(0, p.dashTime - dt); p.hintTime = Math.max(0, p.hintTime - dt);
      this.move(p, input.x || 0, input.y || 0, dt);
      if (input.action) this.action(i, dt);
    });
    for (const s of this.stations.filter(s => s.type === 'stove')) {
      if (s.state === 'cooking') {
        s.cook += dt;
        if (s.cook >= 10) { s.state = 'ready'; s.burn = 0; this.event('cooked'); }
      } else if (s.state === 'ready') {
        s.burn += dt;
        if (s.burn >= 19) { s.state = 'fire'; s.fire = 1; this.event('fire'); }
      }
    }
    this.returnQueue = this.returnQueue.map(t => t - dt).filter(t => { if (t <= 0) { this.dirtyPlates++; return false; } return true; });
    if (!this.practice) {
      this.orders.forEach(o => o.time -= dt);
      this.orders = this.orders.filter(o => { if (o.time <= 0) { this.score = Math.max(0, this.score - 30); this.missed++; this.combo = 0; this.event('missed'); return false; } return true; });
      this.orderCountdown -= dt;
      if ((this.orderCountdown <= 0 && this.orders.length < 4) || !this.orders.length) { this.addOrder(); this.orderCountdown = this.level.interval + (this.mode === 'solo' ? 8 : 0); }
    }
    if (!this.practice && this.time <= 0) { this.status = 'finished'; this.event('finish'); }
  }
  get stars() { return this.level.stars.filter(target => this.score >= target).length; }
}
