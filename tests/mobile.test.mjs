import test from 'node:test';
import assert from 'node:assert/strict';
import { kitchenCamera, joystickVector } from '../camera.js';
import { KitchenGame } from '../engine.js';

test('phone follow camera makes characters at least twice their original size', () => {
  for (const [width, height] of [[320,354],[390,490],[430,578],[357,327],[534,342]]) {
    const camera = kitchenCamera(width,height,{mobile:true,focus:{x:332,y:350}});
    assert.ok(camera.scale >= .82);
    if (width <= 430) assert.ok(camera.scale / (width / 1120) > 2);
    assert.ok(332 >= camera.x && 332 <= camera.x + camera.width);
    assert.ok(350 >= camera.y && 350 <= camera.y + camera.height);
  }
});
test('overview shows every workstation at the same aspect ratio in either orientation', () => {
  const game = new KitchenGame();
  for (const [width,height] of [[320,354],[390,490],[534,342]]) {
    const view = kitchenCamera(width,height,{mobile:true,overview:true});
    assert.ok(Math.abs(view.width * view.scale - width) < .01);
    assert.ok(Math.abs(view.height * view.scale - height) < .01);
    for (const s of game.stations) {
      const x=66+s.x*76,y=83+s.y*65;
      assert.ok(x-36 >= view.x && x+36 <= view.x+view.width,s.type);
      assert.ok(y-34 >= view.y && y+29 <= view.y+view.height,s.type);
    }
  }
});
test('camera never loses a chef at any playable edge after resize or switching chefs', () => {
  for (const [width,height] of [[320,200],[390,600],[700,310]]) for (const x of [236,788,881]) for(const y of [229,376,524]) {
    const view=kitchenCamera(width,height,{mobile:true,focus:{x,y}});
    assert.ok(x>=view.x&&x<=view.x+view.width);
    assert.ok(y>=view.y&&y<=view.y+view.height);
  }
});
test('joystick has a dead zone, variable speed and bounded diagonal output', () => {
  assert.equal(joystickVector(1,1,36).x,0);
  const half=joystickVector(18,0,36),full=joystickVector(80,0,36),diagonal=joystickVector(80,80,36);
  assert.ok(half.x>0&&half.x<.5);assert.equal(full.x,1);
  assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.y)-1)<1e-8);
  assert.ok(Math.abs(Math.hypot(diagonal.thumbX,diagonal.thumbY)-36)<1e-8);
});
test('light joystick movement is slower while diagonal keyboard movement remains normalized', () => {
  const game=new KitchenGame(); const p=game.players[0];p.x=3.5;p.y=4.5;
  game.move(p,.25,0,.05);const slow=p.x-3.5;
  p.x=3.5;game.move(p,1,0,.05);const full=p.x-3.5;
  assert.ok(Math.abs(slow*4-full)<1e-8);
  p.x=3.5;p.y=4.5;game.move(p,1,1,.05);
  assert.ok(Math.abs(Math.hypot(p.x-3.5,p.y-4.5)-full)<1e-8);
});
