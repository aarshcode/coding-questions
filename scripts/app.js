let mode = 'dsa450', problems = DSA450, progress = {};
let notes = {}, noteIdx = -1;
let topicFilter = 'all', statusFilter = 'all', gsearch = '';
const expandedTopics = {}; // per-mode Sets
function getExpanded() {
  if (!expandedTopics[mode]) expandedTopics[mode] = new Set();
  return expandedTopics[mode];
}

const PALETTE = [
  '#4a90d9','#2a9e52','#e67e22','#9b59b6','#e74c3c',
  '#1abc9c','#e91e63','#00bcd4','#ff6b6b','#a29bfe',
  '#fd79a8','#f1c40f','#26de81','#45aaf2','#fc5c65'
];
const DARK_PALETTE = [
  '#76b7ff', '#63d98a', '#ffb35c', '#b98cff', '#ff7a66',
  '#63d6c6', '#ff5f93', '#63cfff', '#ff8f7a', '#9d98ff',
  '#ff88be', '#ffd45c', '#7cf7b2', '#5fb7ff', '#ff7f9f'
];
function isDarkTheme() {
  return document.body.classList.contains('dark');
}
function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(ch => ch + ch).join('')
    : clean;
  const int = parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function topicColor(t) {
  const topics = [...new Set(problems.map(p => p.topic))];
  const palette = isDarkTheme() ? DARK_PALETTE : PALETTE;
  return palette[topics.indexOf(t) % palette.length];
}
function topicSurfaceColor(hex) {
  return isDarkTheme() ? hexToRgba(hex, 0.1) : hexToRgba(hex, 0.12);
}
function topicChipColor(hex) {
  return isDarkTheme() ? hexToRgba(hex, 0.12) : hexToRgba(hex, 0.1);
}

function done(p) { return !!progress[p.problem]; }
function getTopics() {
  const m = {};
  for (const p of problems) { if (!m[p.topic]) m[p.topic] = []; m[p.topic].push(p); }
  return m;
}

function updateProgress() {
  const tot = problems.length, d = problems.filter(done).length, pct = Math.round(d/tot*100);
  document.getElementById('prog-label').textContent = `${d}/${tot} completed (${pct}%)`;
  document.getElementById('prog-fill').style.width = pct + '%';
  document.getElementById('navDone').textContent = d;
  document.getElementById('navTotal').textContent = tot;
}

function updateTopicSelect() {
  const sel = document.getElementById('topic-sel');
  const topics = [...new Set(problems.map(p => p.topic))];
  sel.innerHTML = '<option value="all">All Topics</option>' +
    topics.map(t => `<option value="${esc(t)}"${topicFilter===t?' selected':''}>${esc(t)}</option>`).join('');
}

function renderProblems() {
  let probs = problems;
  if (gsearch) probs = probs.filter(p => p.problem.toLowerCase().includes(gsearch.toLowerCase()));
  if (topicFilter !== 'all') probs = probs.filter(p => p.topic === topicFilter);
  if (statusFilter === 'todo') probs = probs.filter(p => !done(p));
  if (statusFilter === 'done') probs = probs.filter(p => done(p));

  const body = document.getElementById('ptable-body');

  if (!probs.length) {
    body.innerHTML = '<div class="empty-msg">No problems match your filters.</div>';
    return;
  }

  const grouped = {};
  for (const p of probs) { if (!grouped[p.topic]) grouped[p.topic] = []; grouped[p.topic].push(p); }

  let rowNum = 0, html = '';
  for (const [t, tprobs] of Object.entries(grouped)) {
    const allInTopic = problems.filter(p => p.topic === t);
    const doneCount = allInTopic.filter(done).length;
    const col = topicColor(t);
    const headerBg = topicSurfaceColor(col);
    const chipBg = topicChipColor(col);
    html += `<div class="tg-header" onclick="toggleGroup(this)" style="border-left-color:${col};background:${headerBg}">
      <span class="tg-arrow col" style="color:${col}">&#9660;</span>
      <span class="tg-name" style="color:${col}">${esc(t)}</span>
      <span class="tg-count">${doneCount}/${allInTopic.length} completed</span>
    </div><div class="tg-rows hidden">`;
    for (const p of tprobs) {
      const idx = problems.indexOf(p);
      const isDone = done(p);
      rowNum++;
      const nameEl = p.url
        ? `<a class="p-name" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.problem)}</a><a class="p-ext" href="${esc(p.url)}" target="_blank" rel="noopener" title="Open">&#x2197;</a>`
        : `<span class="p-name-plain">${esc(p.problem)}</span>`;
      const actionEl = p.url
        ? `<a class="solve-btn" href="${esc(p.url)}" target="_blank" rel="noopener" style="border-color:${col};color:${col};background:${chipBg}">Solve</a>`
        : `<span class="no-solve">—</span>`;
      const chkStyle = isDone ? `style="background:${col};border-color:${col}"` : '';
      const hasNote = !!(notes[p.problem] && notes[p.problem].trim());
      const noteBtnCls = hasNote ? ' has-note' : '';
      const noteTitle = hasNote ? 'Edit note' : 'Add note';
      html += `<div class="p-row${isDone?' solved':''}" style="border-left-color:${isDone?col:'transparent'}">
        <div><div class="p-chk${isDone?' on':''}" ${chkStyle} onclick="toggle(${idx})"></div></div>
        <div class="p-rownum">${rowNum}</div>
        <div class="p-title-cell">${nameEl}</div>
        <div class="p-topic"><span class="topic-chip" style="border-color:${col};color:${col};background:${chipBg}">${esc(t)}</span></div>
        <div class="p-action">${actionEl}<button class="notes-btn${noteBtnCls}" onclick="openNote(${idx})" title="${noteTitle}">✎</button></div>
      </div>`;
    }
    html += '</div>';
  }
  body.innerHTML = html;

  // Restore expanded groups
  body.querySelectorAll('.tg-header').forEach(hdr => {
    const topicName = hdr.querySelector('.tg-name').textContent;
    if (getExpanded().has(topicName)) {
      hdr.nextElementSibling.classList.remove('hidden');
      hdr.querySelector('.tg-arrow').classList.remove('col');
    }
  });
}

function toggleGroup(hdr) {
  const rows = hdr.nextElementSibling;
  const arrow = hdr.querySelector('.tg-arrow');
  const name = hdr.querySelector('.tg-name').textContent;
  const isHidden = rows.classList.contains('hidden');
  rows.classList.toggle('hidden', !isHidden);
  arrow.classList.toggle('col', !isHidden);
  if (isHidden) getExpanded().add(name); else getExpanded().delete(name);
}

function renderMain() {
  updateProgress();
  updateTopicSelect();
  renderProblems();
}

function toggle(idx) {
  const p = problems[idx];
  const isDone = !progress[p.problem];
  if (isDone) progress[p.problem] = true; else delete progress[p.problem];
  localStorage.setItem(SK+'_'+mode, JSON.stringify(progress));
  if (p.url) for (const [m, sheet] of [['dsa450',DSA450],['blind75',BLIND75],['sde',SDESHEET],['nc150',NC150],['grind75',GRIND75]]) {
    if (m === mode) continue;
    const matches = sheet.filter(q => q.url && q.url === p.url);
    if (!matches.length) continue;
    const other = JSON.parse(localStorage.getItem(SK+'_'+m) || '{}');
    for (const q of matches) { if (isDone) other[q.problem] = true; else delete other[q.problem]; }
    localStorage.setItem(SK+'_'+m, JSON.stringify(other));
  }
  syncToFirebase();
  renderMain();
}

function switchList(m) {
  const map = { dsa450: DSA450, blind75: BLIND75, sde: SDESHEET, nc150: NC150, grind75: GRIND75 };
  mode = m; problems = map[m];
  progress = JSON.parse(localStorage.getItem(SK+'_'+m) || '{}');
  topicFilter = 'all'; statusFilter = 'all'; gsearch = '';
  document.getElementById('gSearch').value = '';
  const tabMap = { dsa450: 'sw-dsa', blind75: 'sw-b75', sde: 'sw-sde', nc150: 'sw-nc', grind75: 'sw-g75' };
  Object.values(tabMap).forEach(id => document.getElementById(id).classList.remove('on'));
  document.getElementById(tabMap[m]).classList.add('on');
  setStatus('all', false);
  renderMain();
}

function doReset() {
  if (!confirm('Reset all progress for this list?')) return;
  progress = {}; localStorage.removeItem(SK+'_'+mode);
  renderMain();
}

function onGSearch(v) { gsearch = v.trim(); renderProblems(); }
function setTopicFilter(v) { topicFilter = v; renderProblems(); }

function setStatus(s, render = true) {
  statusFilter = s;
  ['all','todo','done'].forEach(k => {
    const el = document.getElementById('st-'+k);
    if (el) el.classList.toggle('on', k === s);
  });
  if (render) renderProblems();
}

function doExport() {
  const allProgress = {};
  for (const m of ['dsa450','blind75','sde','nc150','grind75']) {
    const data = localStorage.getItem(SK+'_'+m);
    if (data) allProgress[m] = JSON.parse(data);
  }
  const notesData = localStorage.getItem(SK+'_notes');
  if (notesData) allProgress.notes = JSON.parse(notesData);
  const blob = new Blob([JSON.stringify(allProgress, null, 2)], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dsa-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function doImport(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    let data;
    try {
      data = JSON.parse(e.target.result);
    } catch {
      alert('Error: File is not valid JSON.\n\nPlease use a file exported from this tracker (dsa-progress.json).');
      return;
    }
    if (typeof data !== 'object' || Array.isArray(data) || data === null) {
      alert('Error: Expected a JSON object at the top level.\n\nPlease use a file exported from this tracker.');
      return;
    }
    const validKeys = ['dsa450','blind75','sde','nc150','grind75'];
    const foundKeys = Object.keys(data).filter(k => validKeys.includes(k));
    if (foundKeys.length === 0 && !data.notes) {
      alert('Error: No recognised sheet keys found.\n\nExpected one or more of: ' + validKeys.join(', ') + '\n\nPlease use a file exported from this tracker.');
      return;
    }
    for (const k of foundKeys) {
      if (typeof data[k] !== 'object' || Array.isArray(data[k]) || data[k] === null) {
        alert(`Error: Value for "${k}" must be an object, got ${Array.isArray(data[k]) ? 'array' : typeof data[k]}.\n\nPlease use a file exported from this tracker.`);
        return;
      }
      for (const [prob, val] of Object.entries(data[k])) {
        if (typeof val !== 'boolean') {
          alert(`Error: Progress values must be booleans, but "${prob}" in "${k}" has value: ${JSON.stringify(val)}.\n\nPlease use a file exported from this tracker.`);
          return;
        }
      }
    }
    if (data.notes !== undefined) {
      if (typeof data.notes !== 'object' || Array.isArray(data.notes) || data.notes === null) {
        alert(`Error: "notes" must be an object.\n\nPlease use a file exported from this tracker.`);
        return;
      }
      for (const [prob, val] of Object.entries(data.notes)) {
        if (typeof val !== 'string') {
          alert(`Error: Note values must be strings, but "${prob}" has value: ${JSON.stringify(val)}.\n\nPlease use a file exported from this tracker.`);
          return;
        }
      }
      localStorage.setItem(SK+'_notes', JSON.stringify(data.notes));
      notes = data.notes;
    }
    for (const m of foundKeys) {
      localStorage.setItem(SK+'_'+m, JSON.stringify(data[m]));
    }
    progress = JSON.parse(localStorage.getItem(SK+'_'+mode) || '{}');
    renderMain();
    const imported = [...foundKeys, ...(data.notes ? ['notes'] : [])];
    alert(`Progress imported successfully for: ${imported.join(', ')}`);
  };
  reader.readAsText(file);
  input.value = '';
}

function openNote(idx) {
  noteIdx = idx;
  const p = problems[idx];
  document.getElementById('note-modal-title').textContent = p.problem;
  document.getElementById('note-textarea').value = notes[p.problem] || '';
  document.getElementById('note-modal').style.display = 'flex';
  document.getElementById('note-textarea').focus();
}

function saveNote() {
  if (noteIdx < 0) return;
  const p = problems[noteIdx];
  const val = document.getElementById('note-textarea').value.trim();
  if (val) notes[p.problem] = val; else delete notes[p.problem];
  localStorage.setItem(SK+'_notes', JSON.stringify(notes));
  syncToFirebase();
  closeNote();
  renderProblems();
}

function closeNote() {
  noteIdx = -1;
  document.getElementById('note-modal').style.display = 'none';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNote(); });

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function updateThemeToggleLabel() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const isDark = document.body.classList.contains('dark');
  btn.textContent = isDark ? '🌙 Light Mode' : '☀️ Dark Mode';
}

function toggleDark() {
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem(SK+'_dark', isDark ? '1' : '0');
  updateThemeToggleLabel();
  renderProblems();
}

function init() {
  problems = DSA450;
  progress = JSON.parse(localStorage.getItem(SK+'_dsa450') || '{}');
  notes = JSON.parse(localStorage.getItem(SK+'_notes') || '{}');
  const savedTheme = localStorage.getItem(SK+'_dark');
  const shouldUseDark = savedTheme !== '0';
  document.body.classList.toggle('dark', shouldUseDark);
  if (shouldUseDark) {
    document.body.classList.add('dark');
  }
  updateThemeToggleLabel();
  renderMain();
}
init();
