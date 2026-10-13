const $ = id => document.getElementById(id);

function load() {
  try { return JSON.parse(localStorage.getItem('focus-state')) || null; } catch { return null; }
}
const state = load() || { tasks: [], activeId: null, sessions: 0 };
function save() {
  try { localStorage.setItem('focus-state', JSON.stringify(state)); } catch {}
}
