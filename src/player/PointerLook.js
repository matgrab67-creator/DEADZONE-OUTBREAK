const TAU = Math.PI * 2;
export const normalizeYaw = (value) => ((((value + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
export const cameraPitch = (pitch, recoil = 0) =>
  Math.max(
    -1.48,
    Math.min(1.48, (Number.isFinite(pitch) ? pitch : 0) + (Number.isFinite(recoil) ? recoil : 0)),
  );

// Cursor recentering can produce a very large first packet after pointer lock,
// tab changes, or crossing monitors. It must never become a camera rotation.
export class PointerLook {
  constructor() {
    this.reset(0);
  }
  reset(now) {
    this.ignoreUntil = now + 80;
    this.frameAngle = 0;
  }
  endFrame() {
    this.frameAngle = 0;
  }
  apply(target, dx, dy, sensitivity, now) {
    if (
      now < this.ignoreUntil ||
      !Number.isFinite(dx) ||
      !Number.isFinite(dy) ||
      !Number.isFinite(sensitivity)
    )
      return false;
    const length = Math.hypot(dx, dy);
    if (length === 0 || length > 400) return false;
    // Keep normal input immediate, but limit a single anomalous packet and
    // the total rotation that can be delivered during one rendered frame.
    const requested = length * Math.max(0.0001, Math.min(0.008, sensitivity));
    const accepted = Math.min(requested, 0.35, Math.max(0, 0.7 - this.frameAngle));
    if (accepted === 0) return false;
    const scale = accepted / length;
    target.yaw = normalizeYaw((Number.isFinite(target.yaw) ? target.yaw : 0) - dx * scale);
    target.pitch = cameraPitch(target.pitch, -dy * scale);
    target.deltaX += (dx * accepted) / requested;
    target.deltaY += (dy * accepted) / requested;
    this.frameAngle += accepted;
    return true;
  }
}
