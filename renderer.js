import { INGREDIENTS } from './engine.js?v=1.1.0';
import { kitchenCamera } from './camera.js?v=1.1.0';

const COLORS = ['#e97858', '#4c9792'];
export class KitchenRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.width = 1120; this.height = 730; this.time = 0; this.fx = []; this.overview = false; this.focus = null;
    this.resize();
  }
  resize() {
    this.mobile = document.body.classList.contains('mobile-session');
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.viewWidth = this.mobile ? Math.max(1, this.canvas.clientWidth) : this.width;
    this.viewHeight = this.mobile ? Math.max(1, this.canvas.clientHeight) : this.height;
    const width = Math.round(this.viewWidth * this.dpr), height = Math.round(this.viewHeight * this.dpr);
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; this.focus = null; }
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  point(x, y) { return [66 + x * 76, 83 + y * 65]; }
  round(x, y, w, h, r, fill, stroke) {
    const c = this.ctx; c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.5; c.stroke(); }
  }
  ellipse(x, y, rx, ry, color) { const c = this.ctx; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
  text(text, x, y, size = 12, color = '#52665d', weight = 600, align = 'center') {
    const c = this.ctx; c.fillStyle = color; c.font = `${weight} ${size}px "Segoe UI", "Microsoft YaHei", sans-serif`; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(text, x, y);
  }
  line(x1, y1, x2, y2, color, width = 2) { const c = this.ctx; c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  leaf(x, y, angle, size, color) {
    const c = this.ctx; c.save(); c.translate(x, y); c.rotate(angle); this.ellipse(0, -size / 2, size / 3, size, color); c.restore();
  }
  plant(x, y, scale = 1) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.ellipse(0, 19, 30, 9, '#304e3720');
    this.round(-18, -7, 36, 30, [2, 2, 10, 10], '#c8916c'); this.ellipse(0, -7, 20, 7, '#deb48b'); this.ellipse(0, -8, 16, 5, '#655f43');
    [-1, -.55, .1, .7, 1.2].forEach((a, i) => { this.line(0, -5, Math.sin(a) * 20, -35 + i % 2 * 9, '#668064', 3); this.leaf(Math.sin(a) * 18, -26 + i % 2 * 5, a, 21, i % 2 ? '#7b9d69' : '#4e8061'); }); c.restore();
  }
  ingredient(type, x, y, scale = 1, chopped = false) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.ellipse(0, 10, 17, 5, '#493b3020');
    if (chopped) {
      const color = INGREDIENTS[type].color;
      [[-9, 2, -.2], [5, 5, .2], [0, -7, .4], [12, -5, -.4], [-11, -9, .1]].forEach(([a, b, r]) => {
        c.save(); c.translate(a, b); c.rotate(r); this.round(-5, -4, 11, 8, 2, color); this.line(-2, -2, 3, -2, '#ffffff65', 1.5); c.restore();
      });
    } else if (type === 'tomato') {
      this.ellipse(0, 0, 17, 15, '#d95743'); this.ellipse(-4, -3, 12, 11, '#ef7956'); this.ellipse(-8, -7, 3.5, 2, '#ffc4a0');
      for (let i = 0; i < 5; i++) this.leaf(0, -12, i * 1.26, 6, '#517d4f');
    } else if (type === 'lettuce') {
      [[-9, 0], [8, 0], [0, -8], [0, 7]].forEach(([a,b], i) => this.ellipse(a, b, 12, 10, i % 2 ? '#83b668' : '#699a57'));
      this.ellipse(-1, 0, 10, 9, '#a7cc7e'); this.line(-6, -3, 6, 6, '#d8e8ac', 2); this.line(2, 2, 7, -3, '#d8e8ac', 1.5);
    } else {
      this.ellipse(0, 1, 16, 15, '#a678a5'); this.ellipse(-4, -1, 11, 12, '#c5a1bd');
      c.strokeStyle = '#e3cade'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, 8, 13, -.1, 0, Math.PI * 2); c.stroke();
      this.line(0, -12, 4, -20, '#81a16b', 3); this.line(0, 14, -3, 19, '#b69663', 2);
    }
    c.restore();
  }
  plate(x, y, item, scale = 1) {
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    this.ellipse(0, 5, 24, 13, '#b1beb8'); this.ellipse(0, 1, 25, 13, '#fffef3'); this.ellipse(0, 1, 18, 9, '#e7efdf');
    if (item?.kind === 'dirty') { this.ellipse(-4, 0, 9, 5, '#b7a07a'); this.ellipse(9, 3, 3, 2, '#a89372'); this.line(-8, 5, 7, -3, '#968864', 2); }
    else if (item?.recipe?.endsWith('Soup')) {
      this.ellipse(0, 1, 18, 9, item.recipe === 'onionSoup' ? '#cca257' : '#d96543');
      this.ellipse(-5, -1, 3, 1.5, '#f0b36c'); this.ellipse(7, 3, 2, 1.3, '#659951'); this.steam(0, -4, .5);
    } else if (item?.ingredients?.length) {
      item.ingredients.forEach((i, n) => this.ingredient(i, (n - (item.ingredients.length - 1) / 2) * 13, -2, .6, true));
    }
    c.restore();
  }
  item(item, x, y, scale = 1) {
    if (!item) return;
    if (item.kind === 'ingredient') { this.ingredient(item.type, x, y, scale, item.chopped); return; }
    if (item.kind === 'plate' || item.kind === 'dirty') { this.plate(x, y, item, scale); return; }
    const c = this.ctx; c.save(); c.translate(x, y); c.scale(scale, scale);
    if (item.kind === 'extinguisher') {
      this.round(-10, -19, 20, 33, 6, '#d96753'); this.round(-10, -8, 20, 11, 1, '#fff7e7'); this.round(-7, -24, 14, 6, 2, '#40524c');
      this.line(9, -20, 16, -8, '#40524c', 4); this.text('+', 0, -2, 12, '#d96753', 900);
    } else { this.ellipse(0, 0, 19, 12, '#4e4b40'); this.ellipse(-5, -4, 7, 6, '#696353'); this.steam(0, -5, .7, '#68635c'); }
    c.restore();
  }
  steam(x, y, scale = 1, color = '#ffffffa0') {
    const c = this.ctx;
    for (let i = 0; i < 3; i++) {
      const phase = (this.time * .6 + i / 3) % 1;
      c.globalAlpha = 1 - phase; this.ellipse(x + (i - 1) * 10 * scale + Math.sin(phase * 5) * 5, y - phase * 38 * scale, (4 + phase * 6) * scale, (6 + phase * 7) * scale, color);
    }
    c.globalAlpha = 1;
  }
  progress(x, y, value, color = '#639d80', width = 52) {
    this.round(x - width / 2 - 2, y - 2, width + 4, 9, 4, '#ffffffed');
    this.round(x - width / 2, y, width, 5, 3, '#d5d9cb');
    if (value > 0) this.round(x - width / 2, y, Math.max(3, width * Math.min(value, 1)), 5, 3, color);
  }
  station(s, game, targets) {
    const c = this.ctx, [x, y] = this.point(s.x, s.y);
    const isWood = ['crate', 'board'].includes(s.type);
    const highlight = targets.findIndex(t => t === s);
    this.ellipse(x + 3, y + 24, 35, 13, '#2e463b18');
    this.round(x - 36, y - 17, 72, 46, 5, isWood ? '#b79570' : '#6d9486');
    this.round(x - 33, y + 7, 66, 18, 3, isWood ? '#d2b08c' : '#87a997');
    this.line(x - 20, y + 12, x + 20, y + 12, isWood ? '#b08a65' : '#638875', 2);
    this.round(x - 36, y - 34, 72, 46, 5, isWood ? '#ead4ac' : '#e6e7d6', '#ffffff8a');
    this.line(x - 31, y + 8, x + 31, y + 8, '#485c3e20', 1);
    if (s.type === 'crate') {
      this.round(x - 29, y - 28, 58, 34, 3, '#b18a5e'); this.round(x - 25, y - 24, 50, 24, 2, '#967850');
      this.ingredient(s.ingredient, x - 13, y - 15, .66); this.ingredient(s.ingredient, x + 13, y - 15, .68); this.ingredient(s.ingredient, x, y - 8, .72);
      this.round(x - 22, y + 9, 44, 17, 2, '#fff4d9'); this.text(INGREDIENTS[s.ingredient].name, x, y + 17, this.mobile ? 14 : 9, '#655232');
    } else if (s.type === 'board') {
      this.round(x - 28, y - 28, 54, 32, 4, '#d6a36d', '#b88955');
      for (let i = 0; i < 5; i++) this.line(x - 22 + i * 10, y - 23, x - 22 + i * 10, y - 2, '#b17b4320', 1);
      if (!s.item) {
        this.line(x + 8, y - 18, x - 9, y - 2, '#647971', 5); this.line(x + 13, y - 23, x + 7, y - 17, '#6e5343', 5);
      }
    } else if (s.type === 'stove') {
      this.round(x - 29, y - 29, 58, 36, 4, '#4b625b');
      const heat = s.state === 'cooking' || s.state === 'ready';
      this.ellipse(x, y - 10, 25, 14, heat ? '#eeaa66' : '#354d45');
      this.line(x - 28, y - 18, x + 28, y - 18, '#83998b');
      this.round(x - 22, y - 22, 44, 23, [2, 2, 11, 11], '#91a5a0');
      this.ellipse(x, y - 24, 23, 12, '#d2dcd1'); this.ellipse(x, y - 24, 18, 8, '#657d71');
      this.round(x - 32, y - 24, 11, 7, 3, '#354e43'); this.round(x + 21, y - 24, 11, 7, 3, '#354e43');
      if (s.ingredients.length) {
        const soupColor = s.ingredients[0] === 'onion' && !s.ingredients.includes('tomato') ? '#c8a35c' : '#d66b43';
        this.ellipse(x, y - 24, 18, 8, ['burnt','fire'].includes(s.state) ? '#4c483c' : soupColor);
        if (heat) for (let i = 0; i < 3; i++) this.ellipse(x + Math.sin(this.time * 2 + i * 2) * 12, y - 24 + Math.cos(this.time * 3 + i * 3) * 4, 2, 1.4, '#ffe0a1');
      }
      this.ellipse(x - 15, y + 3, 3, 2, heat ? '#ed8861' : '#bcc9b7'); this.ellipse(x + 15, y + 3, 3, 2, '#bcc9b7');
      if (heat) this.steam(x, y - 29, .9);
      if (s.state === 'filling') {
        for (let i = 0; i < 3; i++) this.ellipse(x - 12 + i * 12, y - 48, 4, 4, s.ingredients[i] ? INGREDIENTS[s.ingredients[i]].color : '#abb9a890');
      }
      if (s.state === 'cooking') this.progress(x, y - 51, s.cook / 10);
      if (s.state === 'ready') { this.progress(x, y - 51, 1 - s.burn / 19, s.burn > 12 ? '#df684f' : '#659c73'); this.text(s.burn > 12 ? '快盛出来！' : '✓ 可以装盘', x, y - 65, 10, s.burn > 12 ? '#bc4933' : '#467d5d'); }
      if (s.state === 'fire') {
        for (let i = 0; i < 5; i++) {
          const h = 26 + Math.sin(this.time * 12 + i * 2) * 10;
          c.beginPath(); c.moveTo(x - 22 + i * 10, y - 15); c.quadraticCurveTo(x - 28 + i * 10, y - h, x - 16 + i * 10, y - h - 17); c.quadraticCurveTo(x - 5 + i * 10, y - 29, x - 12 + i * 10, y - 15); c.fillStyle = i % 2 ? '#ffd36e' : '#ec8152'; c.fill();
        }
        this.progress(x, y - 65, s.fire, '#e6774d');
      }
    } else if (s.type === 'sink') {
      this.round(x - 28, y - 27, 55, 31, 6, '#a6bcb4'); this.round(x - 23, y - 22, 45, 23, 4, '#6e9f9e'); this.round(x - 19, y - 18, 37, 15, 4, '#94c5c3');
      this.line(x + 13, y - 25, x + 13, y - 40, '#b5c7ba', 6); this.line(x + 13, y - 40, x + 2, y - 40, '#d3dfd1', 6); this.line(x + 2, y - 40, x + 2, y - 33, '#d3dfd1', 5);
      if (s.progress > 0) { this.line(x + 2, y - 32, x + 2, y - 12, '#d7f3eb', 3); for (let i = 0; i < 5; i++) this.ellipse(x + Math.sin(i * 9 + this.time) * 19, y - 13 + Math.cos(i * 5 + this.time) * 7, 3, 2, '#e1f4e6'); }
    } else if (s.type === 'plates') {
      for (let i = 0; i < Math.min(4, game.cleanPlates); i++) this.plate(x, y - 4 - i * 4, null, .85);
      this.round(x + 17, y - 32, 18, 18, 9, '#568879'); this.text(String(game.cleanPlates), x + 26, y - 23, 11, '#fff');
    } else if (s.type === 'dirty') {
      this.round(x - 28, y - 26, 55, 30, 4, '#c5bfa1');
      for (let i = 0; i < Math.min(4, game.dirtyPlates); i++) this.plate(x, y - 6 - i * 3, { kind: 'dirty' }, .85);
      if (!game.dirtyPlates) this.text('↩', x, y - 10, 24, '#928e74');
      else { this.round(x + 17, y - 32, 18, 18, 9, '#b09768'); this.text(String(game.dirtyPlates), x + 26, y - 23, 11, '#fff'); }
    } else if (s.type === 'trash') {
      this.round(x - 24, y - 25, 47, 29, 6, '#738d78'); this.ellipse(x, y - 20, 21, 9, '#354f40'); this.ellipse(x, y - 21, 16, 5, '#284235'); this.text('×', x, y + 15, 16, '#d7e3c9');
    } else if (s.type === 'serve') {
      this.round(x - 33, y - 30, 66, 37, 4, '#d69863');
      this.round(x - 25, y - 24, 50, 22, 3, '#b78057'); this.text('➜', x, y - 12, 25, '#ffe4b5');
    }
    if (s.item && s.type !== 'sink') this.item(s.item, x, y - 17, .87);
    if (s.progress > 0) this.progress(x, y - 48, s.progress, s.type === 'sink' ? '#72b6b2' : '#e9ad61');
    if (highlight >= 0) {
      c.strokeStyle = COLORS[highlight]; c.lineWidth = 3; c.beginPath(); c.roundRect(x - 35, y - 34, 70, 47, 5); c.stroke();
      if (!this.mobile) { this.round(x - 10, y + 27, 20, 17, 5, COLORS[highlight]); this.text(highlight === 1 && game.mode === 'duo' ? '↵' : 'E', x, y + 35, 10, '#fff', 800); }
    }
  }
  chef(p, game) {
    const c = this.ctx, [x, ground] = this.point(p.x, p.y), color = COLORS[p.id];
    const bounce = p.moving ? Math.sin(p.walk * 3) * 2 : Math.sin(this.time * 2 + p.id) * .6;
    const y = ground + bounce;
    this.ellipse(x, ground + 5, 22, 10, '#294a3a24');
    const selected = game.mode === 'duo' || game.activePlayer === p.id;
    c.globalAlpha = selected ? .85 : .3;
    c.beginPath(); c.ellipse(x, ground + 4, 24, 11, 0, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = 2.5; c.stroke(); c.globalAlpha = 1;
    if (p.dashTime > 0) for (let i = 0; i < 3; i++) this.line(x - p.dx * (24 + i * 8), y - 14 + i * 6, x - p.dx * (37 + i * 8), y - 14 + i * 6, '#fff8deaa', 3);
    const swing = p.moving ? Math.sin(p.walk * 3) * 4 : 0;
    this.ellipse(x - 8, y + swing, 7, 4.5, '#43564c'); this.ellipse(x + 8, y - swing, 7, 4.5, '#43564c');
    this.round(x - 16, y - 31, 32, 29, [11, 11, 8, 8], color);
    this.round(x - 10, y - 25, 20, 24, [3, 3, 6, 6], '#fff6df'); this.round(x - 5, y - 13, 10, 7, 2, '#e4e4d0');
    this.line(x - 12, y - 27, x - 7, y - 19, '#efdebe', 2); this.line(x + 12, y - 27, x + 7, y - 19, '#efdebe', 2);
    this.ellipse(x - 18, y - 19 + (p.action ? Math.sin(this.time * 25) * 6 : -swing), 6, 6, '#e9b58b');
    this.ellipse(x + 18, y - 19 + (p.action ? Math.cos(this.time * 25) * 6 : swing), 6, 6, '#e9b58b');
    this.ellipse(x, y - 39, 17, 15, '#ecbf96'); this.ellipse(x - 5, y - 44, 12, 9, '#f6cfa7');
    const look = p.dx * 3;
    this.ellipse(x - 6 + look, y - 38 + p.dy, 1.8, 2.5, '#4d5548'); this.ellipse(x + 6 + look, y - 38 + p.dy, 1.8, 2.5, '#4d5548');
    this.ellipse(x - 11, y - 34, 3, 1.8, '#dc997e77'); this.ellipse(x + 11, y - 34, 3, 1.8, '#dc997e77');
    this.line(x - 2 + look, y - 31, x + 2 + look, y - 31, '#a87657', 1.5);
    this.round(x - 16, y - 60, 32, 16, [5, 5, 3, 3], '#fdf9e8');
    this.ellipse(x - 11, y - 60, 11, 10, '#fffdf0'); this.ellipse(x + 9, y - 62, 12, 11, '#fffdf0'); this.ellipse(x - 2, y - 66, 12, 12, '#fffdf0');
    this.line(x - 13, y - 48, x + 13, y - 48, '#e2dcc4', 1.2);
    this.round(x - 13, y - 91, 26, 17, 7, selected ? color : '#9da89c'); this.text(`P${p.id + 1}`, x, y - 82, 10, '#fff', 800);
    if (p.held) { this.ellipse(x + p.dx * 14, y - 20, 22, 8, '#45554112'); this.item(p.held, x + p.dx * 15, y - 24 + p.dy * 6, .82); }
    if (p.action && p.held?.kind === 'extinguisher') for (let i = 0; i < 8; i++) { const f = (this.time * 2 + i / 8) % 1; this.ellipse(x + p.dx * (20 + f * 45) + Math.sin(i * 2) * f * 9, y - 25 + p.dy * f * 40, 5 + f * 9, 3 + f * 6, '#f9fff5b0'); }
    if (p.hintTime > 0 && !this.mobile) {
      c.font = '600 11px "Microsoft YaHei", sans-serif'; const w = Math.min(330, c.measureText(p.hint).width + 24);
      const bx = Math.max(15 + w / 2, Math.min(this.width - w / 2 - 15, x));
      this.round(bx - w / 2, y - 123, w, 24, 8, '#fffcef', '#ddd9bd'); this.text(p.hint, bx, y - 111, 11, '#4e6156');
    }
  }
  label(text, x, y, color = '#f7f4e5', ink = '#687a66') {
    const size = this.mobile ? 14 : 11;
    this.ctx.font = `600 ${size}px "Microsoft YaHei"`; const w = this.ctx.measureText(text).width + 18;
    this.round(x - w / 2, y - 10, w, 23, 5, color); this.text(text, x, y + 1, size, this.mobile ? '#455e43' : ink);
  }
  draw(game, dt = .016) {
    this.time += dt;
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); c.clearRect(0, 0, this.viewWidth, this.viewHeight);
    c.fillStyle = '#dce6d4'; c.fillRect(0, 0, this.viewWidth, this.viewHeight);
    const player = game.players[game.activePlayer], [px, py] = this.point(player.x, player.y);
    const desired = { x: px + player.dx * 42, y: py - 24 + player.dy * 28 };
    if (!this.focus || this.focus.player !== player.id) this.focus = { ...desired, player: player.id };
    const blend = 1 - Math.exp(-12 * dt);
    this.focus.x += (desired.x - this.focus.x) * blend; this.focus.y += (desired.y - this.focus.y) * blend;
    this.camera = kitchenCamera(this.viewWidth, this.viewHeight, { mobile: this.mobile, overview: this.overview, focus: this.focus });
    c.save(); c.scale(this.camera.scale, this.camera.scale); c.translate(-this.camera.x, -this.camera.y);
    const gradient = c.createLinearGradient(0, 0, 0, 730); gradient.addColorStop(0, '#d8e5d4'); gradient.addColorStop(1, '#ecedd9'); c.fillStyle = gradient; c.fillRect(0, 0, 1120, 730);
    for (let i = 0; i < 70; i++) this.ellipse((i * 191 + 36) % 1120, (i * 157 + 19) % 730, 1.3, .7, '#798e5c22');
    this.ellipse(560, 638, 455, 36, '#54674513');
    this.round(133, 135, 856, 509, 14, '#82937b'); this.round(132, 122, 856, 506, 12, '#bcc8ad');
    this.round(142, 137, 836, 480, 7, '#e7e7d3');
    for (let y = 1; y <= 7; y++) for (let x = 1; x <= 11; x++) {
      const [px, py] = this.point(x, y);
      this.round(px + 1, py + 1, 74, 63, 2, (x + y) % 2 ? '#efeada' : '#e1e1cd');
      this.line(px + 5, py + 62, px + 70, py + 62, '#b1bba818', 1);
    }
    this.round(132, 114, 856, 28, [9, 9, 1, 1], '#96b1a0'); this.round(132, 110, 856, 9, 4, '#bfd2b8');
    this.round(394, 93, 166, 22, 4, '#f1eee0'); this.text('LITTLE KITCHEN  ·  好好吃饭', 477, 104, 9, '#6e8173', 700);
    this.plant(108, 595, 1.1); this.plant(1015, 195, 1.05); this.plant(930, 81, .72);
    this.round(158, 70, 67, 34, 5, '#eee9d4'); this.text('OPEN', 192, 88, 15, '#739d7b', 800);
    this.line(160, 72, 156, 55, '#8a937a', 1); this.line(222, 72, 226, 55, '#8a937a', 1);
    for (let i = 0; i < 8; i++) { const x = 246 + i * 76; this.line(x, 27 + Math.sin(i / 7 * Math.PI) * 15, x, 43 + Math.sin(i / 7 * Math.PI) * 15, '#859881', 1); this.ellipse(x, 46 + Math.sin(i / 7 * Math.PI) * 15, 4, 6, '#fff1b5'); }
    c.beginPath(); c.moveTo(234, 24); c.quadraticCurveTo(560, 70, 845, 24); c.strokeStyle = '#859881'; c.lineWidth = 1; c.stroke();
    this.label('切 菜 区', 370, 136); this.label('烹 饪 区', 674, 136);
    this.label('食材不限量', 95, 212, '#f4eed8', '#8c8261');
    this.round(974, 269, 40, 135, 4, '#bc9470'); this.round(976, 263, 45, 16, 3, '#eaba87');
    for (let i = 0; i < 4; i++) this.round(976 + i * 11, 263, 11, 18, [0, 0, 4, 4], i % 2 ? '#f9e5bc' : '#da805f');
    this.text('出', 1000, 311, 16, '#fff1d7'); this.text('餐', 1000, 335, 16, '#fff1d7'); this.text('口', 1000, 359, 16, '#fff1d7');
    const targets = game.players.map(p => game.mode === 'duo' || p.id === game.activePlayer ? game.target(p) : null);
    const objects = [
      ...game.stations.map(s => ({ y: s.y, draw: () => this.station(s, game, targets) })),
      ...game.players.map(p => ({ y: p.y + .12, draw: () => this.chef(p, game) })),
      ...game.floorItems.map(f => ({ y: f.y - .1, draw: () => this.item(f.item, ...this.point(f.x, f.y), .8) })),
    ];
    objects.sort((a,b) => a.y - b.y).forEach(o => o.draw());
    this.label('脏盘回收', 332, 635); this.label('洗盘子', 408, 635); this.label('干净餐盘', 484, 635);
    this.label('灭火器', 712, 635); this.label('垃圾桶', 788, 635);
    this.text('GOOD FOOD. GREAT TEAMWORK.', 560, 682, 10, '#859582', 700);
    for (const f of this.fx) {
      f.life -= dt; f.y -= dt * 26;
      c.globalAlpha = Math.min(1, f.life); this.text(f.text, f.x, f.y, 26, '#568371', 900); c.globalAlpha = 1;
    }
    this.fx = this.fx.filter(f => f.life > 0);
    c.restore();
    if (this.mobile && !this.overview) this.minimap(game);
  }
  minimap(game) {
    const c = this.ctx, w = 90, h = 57, x = this.viewWidth - w - 10, y = this.viewHeight - h - 10;
    c.save(); this.round(x, y, w, h, 7, '#fffcefec', '#78927880');
    const sx = (w - 10) / 11, sy = (h - 10) / 7;
    for (const station of game.stations) this.round(x + 5 + (station.x - 1.5) * sx, y + 5 + (station.y - 1.5) * sy, sx - 1, sy - 1, 1, station.type === 'serve' ? '#ce7954' : station.type === 'stove' && station.state === 'fire' ? '#ea4632' : '#9aaf8c');
    for (const player of game.players) this.ellipse(x + 5 + (player.x - 1) * sx, y + 5 + (player.y - 1) * sy, player.id === game.activePlayer ? 3.4 : 2.3, player.id === game.activePlayer ? 3.4 : 2.3, COLORS[player.id]);
    c.restore();
  }
  celebrate(earned) { this.fx.push({ x: 907, y: 290, text: `+${earned}`, life: 2 }); }
}
