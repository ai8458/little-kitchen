import test from 'node:test';
import assert from 'node:assert/strict';
import { KitchenGame, LEVELS, recipeFor, canAdd } from '../engine.js';

function game(options = {}) { const g = new KitchenGame(options); g.start(); return g; }
function approach(g, s, id = 0) {
  const p = g.players[id];
  const options = [[0,1],[0,-1],[1,0],[-1,0]];
  for (const [dx,dy] of options) {
    const x = s.x + dx, y = s.y + dy;
    if (g.isFree(x,y,p)) { Object.assign(p,{ x,y,dx:-dx,dy:-dy,moving:false }); assert.equal(g.target(p), s); return p; }
  }
  throw new Error(`Cannot reach ${s.id}`);
}
function tick(g, seconds, inputs) { for (let i = 0; i < Math.ceil(seconds / .025); i++) g.update(.025, inputs); }
function interact(g, s, id = 0) { approach(g,s,id); g.interact(id); }
function chop(g, ingredient) {
  const crate = g.stations.find(s => s.ingredient === ingredient), board = g.stations.find(s => s.type === 'board' && !s.item);
  interact(g, crate); assert.equal(g.players[0].held.type, ingredient);
  interact(g, board); assert.equal(g.players[0].held, null);
  tick(g, 2.3, [{ action:true }]); assert.equal(board.item.chopped,true);
  g.interact(0); assert.equal(g.players[0].held.chopped,true);
}
function plates(g) {
  return g.cleanPlates + g.dirtyPlates + g.returnQueue.length + g.players.filter(p => ['plate','dirty'].includes(p.held?.kind)).length + g.stations.filter(s => ['plate','dirty'].includes(s.item?.kind)).length + g.floorItems.filter(f => ['plate','dirty'].includes(f.item?.kind)).length;
}

test('recipes match exact counts and prevent incompatible mixtures', () => {
  assert.equal(recipeFor(['tomato','lettuce'], false),'salad');
  assert.equal(recipeFor(['onion','tomato','onion'], true),'mixedSoup');
  assert.equal(recipeFor(['tomato','tomato'], true),null);
  assert.equal(canAdd(['tomato','tomato'],'onion',true),false);
  assert.equal(canAdd(['onion'],'tomato',true),true);
  assert.equal(canAdd(['lettuce'],'lettuce',false),false);
});
test('salad can be prepared, plated, delivered, returned and washed using station interactions', () => {
  const g = game({ practice:true });
  const counter1 = g.stationAt(5,4), counter2 = g.stationAt(7,4);
  chop(g,'lettuce'); interact(g,counter1);
  chop(g,'tomato'); interact(g,counter2);
  interact(g,g.stations.find(s => s.type === 'plates'));
  interact(g,counter1); assert.deepEqual(g.players[0].held.ingredients,['lettuce']);
  interact(g,counter2); assert.equal(g.players[0].held.recipe,'salad');
  interact(g,g.stations.find(s => s.type === 'serve'));
  assert.equal(g.served,1); assert.equal(g.score,110); assert.equal(g.players[0].held,null); assert.equal(plates(g),4);
  tick(g,7.1); assert.equal(g.dirtyPlates,1);
  interact(g,g.stations.find(s => s.type === 'sink'));
  tick(g,2.9,[{action:true}]); assert.equal(g.cleanPlates,4); assert.equal(g.dirtyPlates,0); assert.equal(plates(g),4);
});
test('soup requires chopped ingredients, cooks automatically and needs a clean empty plate', () => {
  const g = game({practice:true}), stove = g.stations.find(s => s.type === 'stove');
  g.players[0].held = {kind:'ingredient',type:'tomato',chopped:false};
  interact(g,stove); assert.equal(stove.ingredients.length,0); g.players[0].held = null;
  for (let i=0;i<3;i++) { chop(g,'tomato'); interact(g,stove); }
  assert.equal(stove.state,'cooking'); tick(g,10.1); assert.equal(stove.state,'ready');
  g.interact(0); assert.equal(stove.state,'ready'); assert.equal(g.players[0].held,null);
  interact(g,g.stations.find(s => s.type === 'plates')); interact(g,stove);
  assert.equal(g.players[0].held.recipe,'tomatoSoup'); assert.equal(stove.state,'empty'); assert.deepEqual(stove.ingredients,[]); assert.equal(plates(g),4);
});
test('fire can be extinguished, burnt food removed, and the pot reused', () => {
  const g = game(), stove = g.stations.find(s=>s.type==='stove');
  Object.assign(stove,{state:'ready',ingredients:['tomato','tomato','tomato'],burn:18.9});
  tick(g,.2); assert.equal(stove.state,'fire');
  interact(g,g.stations.find(s=>s.type==='extinguisher')); approach(g,stove);
  tick(g,1.9,[{action:true}]); assert.equal(stove.state,'burnt');
  interact(g,g.stations.find(s=>s.type==='extinguisher'));
  interact(g,stove); assert.equal(g.players[0].held.kind,'burnt'); assert.equal(stove.state,'empty');
  interact(g,g.stations.find(s=>s.type==='trash')); assert.equal(g.players[0].held,null);
});
test('raw ingredients cannot be plated and unmatched dishes cannot be delivered', () => {
  const g = game(), counter = g.stationAt(5,4);
  counter.item = {kind:'ingredient',type:'tomato',chopped:false};
  interact(g,g.stations.find(s=>s.type==='plates')); interact(g,counter);
  assert.deepEqual(g.players[0].held.ingredients,[]); assert.ok(counter.item);
  g.players[0].held.recipe = 'onionSoup'; g.players[0].held.ingredients=['onion','onion','onion'];
  interact(g,g.stations.find(s=>s.type==='serve')); assert.equal(g.served,0); assert.equal(g.players[0].held.recipe,'onionSoup');
});
test('trash empties a plate without destroying it and floor drops can be recovered', () => {
  const g = game(); interact(g,g.stations.find(s=>s.type==='plates'));
  const p = g.players[0]; p.held.ingredients=['lettuce']; interact(g,g.stations.find(s=>s.type==='trash'));
  assert.deepEqual(p.held.ingredients,[]); assert.equal(plates(g),4);
  Object.assign(p,{x:3.5,y:4.5,dx:1,dy:0}); g.interact(0); assert.equal(p.held,null); assert.equal(g.floorItems.length,1);
  g.interact(0); assert.equal(p.held.kind,'plate'); assert.equal(g.floorItems.length,0); assert.equal(plates(g),4);
});
test('timely in-order deliveries earn tips and chain bonuses; expiration resets the chain', () => {
  const g = game(), serving=g.stations.find(s=>s.type==='serve');
  g.orders=[{id:1,recipe:'salad',time:50,duration:100},{id:2,recipe:'salad',time:100,duration:100},{id:3,recipe:'salad',time:100,duration:100}];
  g.players[0].held={kind:'plate',ingredients:['lettuce','tomato'],recipe:'salad'}; interact(g,serving); assert.equal(g.score,95);
  g.players[0].held={kind:'plate',ingredients:['lettuce','tomato'],recipe:'salad'}; g.interact(0); assert.equal(g.score,220); assert.equal(g.combo,2);
  g.orders[0].time=.01; tick(g,.025); assert.equal(g.score,190); assert.equal(g.combo,0); assert.equal(g.missed,1);
});
test('paused games freeze all timers, practice has no deadline, timed shifts end once', () => {
  const g = game(); g.status='paused'; const time = g.time; tick(g,3); assert.equal(g.time,time); assert.equal(g.elapsed,0);
  const p = game({practice:true}); tick(p,260); assert.equal(p.time,p.level.duration); assert.equal(p.orders[0].time,p.orders[0].duration); assert.equal(p.status,'playing');
  g.status='playing'; g.time=.03; g.takeEvents(); tick(g,.1); assert.equal(g.status,'finished'); assert.equal(g.takeEvents().filter(e=>e.type==='finish').length,1);
});
test('collision prevents walking or dashing through countertops and the other chef', () => {
  const g = game(), p=g.players[0]; Object.assign(p,{x:3.5,y:2.5,dx:0,dy:-1});
  for(let i=0;i<80;i++) g.move(p,0,-1,.025);
  assert.ok(p.y >= 2.22); assert.ok(g.isFree(p.x,p.y,p));
  Object.assign(p,{x:3.5,y:4.5}); g.dash(0); for(let i=0;i<80;i++) g.move(p,1,0,.025);
  assert.ok(p.x <=4.77); assert.ok(g.isFree(p.x,p.y,p));
  Object.assign(p,{x:3.5,y:3.5,dashTime:0}); Object.assign(g.players[1],{x:4.5,y:3.5});
  for(let i=0;i<50;i++) g.move(p,1,0,.025); assert.ok(Math.hypot(p.x-4.5,p.y-3.5)>.5);
});
test('throwing sends ingredients to a teammate, counter, or recoverable floor location', () => {
  const g=game({mode:'duo'}),p=g.players[0],q=g.players[1];
  Object.assign(p,{x:3.5,y:3.5,dx:1,dy:0,held:{kind:'ingredient',type:'tomato',chopped:false}});
  Object.assign(q,{x:5.5,y:3.5}); g.throwItem(0); assert.equal(q.held.type,'tomato'); assert.equal(p.held,null);
  p.held={kind:'ingredient',type:'onion',chopped:false}; Object.assign(p,{x:5.5,y:5.5,dx:0,dy:-1}); g.throwItem(0); assert.equal(g.stationAt(5,4).item.type,'onion');
  p.held={kind:'ingredient',type:'lettuce',chopped:false}; Object.assign(p,{x:3.5,y:5.5,dx:1,dy:0}); g.throwItem(0); assert.equal(g.floorItems.length,1); assert.equal(g.floorItems[0].item.type,'lettuce');
});
test('both chefs have independent simultaneous movement and actions', () => {
  const g=game({mode:'duo'}), a=g.players[0],b=g.players[1]; const ax=a.x,bx=b.x;
  tick(g,.25,[{x:-1,y:0},{x:1,y:0}]); assert.ok(a.x<ax); assert.ok(b.x>bx);
  const boards=g.stations.filter(s=>s.type==='board');
  boards.forEach(s=>s.item={kind:'ingredient',type:'tomato',chopped:false}); approach(g,boards[0],0); approach(g,boards[1],1);
  tick(g,2.3,[{action:true},{action:true}]); assert.ok(boards.every(s=>s.item.chopped));
});
test('all three kitchen layouts have reachable workstations and connected walkable floors', () => {
  for (const level of LEVELS) {
    const g=game({level:level.id});
    for(const s of g.stations) {
      if(s.type==='counter') continue;
      const p=approach(g,s); assert.ok(g.isFree(p.x,p.y,p),`${level.name}: ${s.type}`);
    }
    const start=[2,2], seen=new Set(['2,2']), queue=[start];
    while(queue.length) { const [x,y]=queue.shift(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx=x+dx,ny=y+dy,key=`${nx},${ny}`; if(!seen.has(key)&&g.isFree(nx+.5,ny+.5,g.players[0],true)){seen.add(key);queue.push([nx,ny]);} } }
    for(let x=2;x<=10;x++)for(let y=2;y<=6;y++)if(g.isFree(x+.5,y+.5,g.players[0],true))assert.ok(seen.has(`${x},${y}`),`${level.name} has isolated floor ${x},${y}`);
  }
});
