const KITCHEN_BOUNDS = { left: 106, top: 76, width: 920, height: 614 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Camera measurements use CSS pixels; the renderer applies devicePixelRatio once.
export function kitchenCamera(width, height, { mobile = false, overview = false, focus = { x: 560, y: 383 } } = {}) {
  if (!mobile) return { x: 0, y: 0, scale: 1, width: 1120, height: 730 };
  const bounds = KITCHEN_BOUNDS;
  const scale = overview ? Math.min(width / bounds.width, height / bounds.height) : clamp(width / 430, .82, .98);
  const viewWidth = width / scale, viewHeight = height / scale;
  const axis = (position, start, size, viewSize) => viewSize >= size ? start + (size - viewSize) / 2 : clamp(position - viewSize / 2, start, start + size - viewSize);
  return {
    x: axis(overview ? bounds.left + bounds.width / 2 : focus.x, bounds.left, bounds.width, viewWidth),
    y: axis(overview ? bounds.top + bounds.height / 2 : focus.y, bounds.top, bounds.height, viewHeight),
    scale, width: viewWidth, height: viewHeight,
  };
}

export function joystickVector(dx, dy, radius) {
  const distance = Math.hypot(dx, dy);
  if (!radius || distance < radius * .15) return { x: 0, y: 0, thumbX: dx || 0, thumbY: dy || 0 };
  const strength = clamp((distance / radius - .15) / .85, 0, 1);
  const travel = Math.min(distance, radius);
  return { x: dx / distance * strength, y: dy / distance * strength, thumbX: dx / distance * travel, thumbY: dy / distance * travel };
}
