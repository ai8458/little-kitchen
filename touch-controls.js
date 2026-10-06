import { joystickVector } from './camera.js?v=1.1.0';

export function bindTouchControls({ onTap, onStick, heldKeys }) {
  const stick = document.getElementById('touchStick');
  const thumb = document.getElementById('stickThumb');
  const controls = document.getElementById('touchControls');
  const heldPointers = new Map();
  let stickPointer = null;
  const moveStick = event => {
    const rect = stick.getBoundingClientRect();
    const vector = joystickVector(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, rect.width * .3);
    thumb.style.transform = `translate(${vector.thumbX}px, ${vector.thumbY}px)`;
    onStick(vector.x, vector.y);
  };
  const resetStick = () => { stickPointer = null; thumb.style.transform = ''; stick.classList.remove('held'); onStick(0, 0); };
  stick.addEventListener('pointerdown', event => {
    if (stickPointer !== null) return;
    event.preventDefault(); stickPointer = event.pointerId; stick.setPointerCapture(event.pointerId); stick.classList.add('held'); moveStick(event);
  });
  stick.addEventListener('pointermove', event => { if (event.pointerId === stickPointer) { event.preventDefault(); moveStick(event); } });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(type, event => { if (event.pointerId === stickPointer) resetStick(); });
  controls.querySelectorAll('[data-hold], [data-tap]').forEach(button => {
    const code = button.dataset.hold || button.dataset.tap;
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('held'); heldPointers.set(event.pointerId, { code, button });
      if (button.dataset.hold) heldKeys.add(code); else onTap(code);
    });
    const release = event => {
      if (!heldPointers.has(event.pointerId)) return;
      heldPointers.delete(event.pointerId);
      if (![...heldPointers.values()].some(pointer => pointer.code === code)) heldKeys.delete(code);
      if (![...heldPointers.values()].some(pointer => pointer.button === button)) button.classList.remove('held');
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  });
  controls.addEventListener('contextmenu', event => event.preventDefault());
  return {
    reset() { resetStick(); heldPointers.clear(); heldKeys.clear(); controls.querySelectorAll('.held').forEach(button => button.classList.remove('held')); },
  };
}
