// MARGINALIA — keyboard and mouse input. Keys queue one-shot actions; the mouse
// reports clicks in canvas coordinates (the renderer scales the canvas to the
// window, so clicks are mapped back into the 1280x880 field).

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;
export const ACTION_ESCAPE = 16;
export const ACTION_SAME_SEED = 32;
export const ACTION_END_TURN = 64;

export function createInput(canvas) {
  let actions = 0;
  let click = null;
  let hover = { x: -1, y: -1 };

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 880,
    };
  }

  function onKey(e) {
    const k = e.key;
    if (k === ' ' || k === 'Enter') { actions |= ACTION_CONFIRM; e.preventDefault(); }
    else if (k === 'p' || k === 'P') actions |= ACTION_PAUSE;
    else if (k === 'm' || k === 'M') actions |= ACTION_MUTE;
    else if (k === 'r' || k === 'R') actions |= ACTION_RESTART;
    else if (k === 'Escape') actions |= ACTION_ESCAPE;
    else if (k === 's' || k === 'S') actions |= ACTION_SAME_SEED;
    else if (k === 'e' || k === 'E') actions |= ACTION_END_TURN;
  }

  function onClick(e) {
    click = toField(e.clientX, e.clientY);
  }

  function onMove(e) {
    hover = toField(e.clientX, e.clientY);
  }

  window.addEventListener('keydown', onKey);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMove);

  return {
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    takeClick() {
      const c = click;
      click = null;
      return c;
    },
    hover() {
      return hover;
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
    },
  };
}
