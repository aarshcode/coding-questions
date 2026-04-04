const SHEETS = [
  { key: 'dsa450', label: '450 DSA', shortLabel: '450', data: DSA450 },
  { key: 'blind75', label: 'Blind 75', shortLabel: 'B75', data: BLIND75 },
  { key: 'sde', label: 'SDE Sheet', shortLabel: 'SDE', data: SDESHEET },
  { key: 'nc150', label: 'NeetCode 150', shortLabel: 'NC150', data: NC150 },
  { key: 'grind75', label: 'Grind 169', shortLabel: 'G169', data: GRIND75 }
];
const SHEET_MAP = Object.fromEntries(SHEETS.map(sheet => [sheet.key, sheet]));
const DEFAULT_MODE = 'overview';

let mode = DEFAULT_MODE, problems = [], progress = {};
let notes = {}, noteIdx = -1;
let topicFilter = 'all', statusFilter = 'all', gsearch = '';
const expandedTopics = {};

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

function isSheetMode(value = mode) {
  return value in SHEET_MAP;
}

function getStoredProgress(sheetKey) {
  return JSON.parse(localStorage.getItem(SK + '_' + sheetKey) || '{}');
}

function loadProgressForMode(value = mode) {
  progress = isSheetMode(value) ? getStoredProgress(value) : {};
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

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clampPct(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function problemKey(problem) {
  const raw = problem.url || problem.problem;
  return String(raw).trim().toLowerCase();
}

function done(problem) {
  return !!progress[problem.problem];
}

function getTopicStatsForSheet(sheetKey) {
  const { data } = SHEET_MAP[sheetKey];
  const sheetProgress = getStoredProgress(sheetKey);
  const stats = {};

  data.forEach(problem => {
    if (!stats[problem.topic]) stats[problem.topic] = { topic: problem.topic, total: 0, solved: 0 };
    stats[problem.topic].total += 1;
    if (sheetProgress[problem.problem]) stats[problem.topic].solved += 1;
  });

  return Object.values(stats)
    .map(item => ({
      ...item,
      remaining: item.total - item.solved,
      pct: Math.round((item.solved / item.total) * 100)
    }))
    .sort((a, b) => b.solved - a.solved || b.pct - a.pct || a.topic.localeCompare(b.topic));
}

function getOverviewStats() {
  const uniqueProblems = new Map();
  const mergedTopics = new Map();
  const sheetStats = SHEETS.map(sheet => {
    const sheetProgress = getStoredProgress(sheet.key);
    const solved = sheet.data.filter(problem => !!sheetProgress[problem.problem]).length;
    const total = sheet.data.length;
    const pct = Math.round((solved / total) * 100);

    sheet.data.forEach(problem => {
      const key = problemKey(problem);
      if (!uniqueProblems.has(key)) {
        uniqueProblems.set(key, {
          solved: false,
          problem: problem.problem,
          url: problem.url || '',
          topics: new Set()
        });
      }

      const record = uniqueProblems.get(key);
      if (sheetProgress[problem.problem]) record.solved = true;
      record.topics.add(problem.topic);

      if (!mergedTopics.has(problem.topic)) mergedTopics.set(problem.topic, { topic: problem.topic, total: 0, solvedKeys: new Set() });
      const topicRecord = mergedTopics.get(problem.topic);
      topicRecord.total += 1;
      if (sheetProgress[problem.problem]) topicRecord.solvedKeys.add(key);
    });

    return {
      ...sheet,
      solved,
      total,
      remaining: total - solved,
      pct
    };
  });

  const uniqueSolved = [...uniqueProblems.values()].filter(item => item.solved).length;
  const uniqueTotal = uniqueProblems.size;
  const rawSolved = sheetStats.reduce((sum, sheet) => sum + sheet.solved, 0);
  const rawTotal = sheetStats.reduce((sum, sheet) => sum + sheet.total, 0);
  const noteCount = Object.values(notes).filter(Boolean).length;
  const startedSheets = sheetStats.filter(sheet => sheet.solved > 0).length;
  const completedSheets = sheetStats.filter(sheet => sheet.solved === sheet.total).length;
  const bestSheet = [...sheetStats].sort((a, b) => b.pct - a.pct || b.solved - a.solved)[0];
  const topicStats = [...mergedTopics.values()]
    .map(item => ({
      topic: item.topic,
      total: item.total,
      solved: item.solvedKeys.size,
      pct: Math.round((item.solvedKeys.size / item.total) * 100)
    }))
    .sort((a, b) => b.solved - a.solved || b.pct - a.pct || a.topic.localeCompare(b.topic))
    .slice(0, 8);

  return {
    sheetStats,
    uniqueSolved,
    uniqueTotal,
    uniqueRemaining: uniqueTotal - uniqueSolved,
    uniquePct: Math.round((uniqueSolved / uniqueTotal) * 100),
    rawSolved,
    rawTotal,
    noteCount,
    startedSheets,
    completedSheets,
    bestSheet,
    topicStats
  };
}

function getCurrentSheetSummary() {
  const total = problems.length;
  const solved = problems.filter(done).length;
  const topics = [...new Set(problems.map(problem => problem.topic))];
  const solvedTopics = topics.filter(topic => problems.some(problem => problem.topic === topic && done(problem))).length;
  const notesInSheet = problems.filter(problem => notes[problem.problem] && notes[problem.problem].trim()).length;

  return {
    total,
    solved,
    remaining: total - solved,
    pct: Math.round((solved / total) * 100),
    topics: topics.length,
    solvedTopics,
    notesInSheet
  };
}

function updateLayout() {
  const overviewPanel = document.getElementById('overview-panel');
  const sheetStatsGrid = document.getElementById('sheet-stats-grid');
  const sheetView = document.getElementById('sheet-view');
  const showingOverview = !isSheetMode();

  overviewPanel.classList.toggle('section-hidden', !showingOverview);
  sheetStatsGrid.classList.toggle('section-hidden', showingOverview);
  sheetView.classList.toggle('section-hidden', showingOverview);
}

function updateProgress() {
  if (!isSheetMode()) {
    const overview = getOverviewStats();
    document.getElementById('prog-label').textContent = `${overview.uniqueSolved}/${overview.uniqueTotal} unique problems solved (${overview.uniquePct}%)`;
    document.getElementById('prog-fill').style.width = overview.uniquePct + '%';
    document.getElementById('navDone').textContent = overview.uniqueSolved;
    document.getElementById('navTotal').textContent = overview.uniqueTotal;
    return;
  }

  const summary = getCurrentSheetSummary();
  document.getElementById('prog-label').textContent = `${summary.solved}/${summary.total} completed (${summary.pct}%)`;
  document.getElementById('prog-fill').style.width = summary.pct + '%';
  document.getElementById('navDone').textContent = summary.solved;
  document.getElementById('navTotal').textContent = summary.total;
}

function updateTopicSelect() {
  const sel = document.getElementById('topic-sel');
  if (!isSheetMode()) {
    sel.innerHTML = '<option value="all">All Topics</option>';
    return;
  }

  const topics = [...new Set(problems.map(p => p.topic))];
  sel.innerHTML = '<option value="all">All Topics</option>' +
    topics.map(t => `<option value="${esc(t)}"${topicFilter === t ? ' selected' : ''}>${esc(t)}</option>`).join('');
}

function renderOverview() {
  const { sheetStats, uniqueSolved, uniqueTotal, uniqueRemaining, uniquePct, rawSolved, rawTotal, noteCount, startedSheets, completedSheets, bestSheet, topicStats } = getOverviewStats();
  const panel = document.getElementById('overview-panel');

  panel.innerHTML = `
    <div class="overview-hero">
      <div class="overview-copy">
        <span class="overview-kicker">Start Page</span>
        <h1>Everything solved so far, at a glance.</h1>
        <p>${uniqueSolved} unique problems down, ${uniqueRemaining} left to go, and ${rawSolved} solved entries tracked across all sheets.</p>
      </div>
      <div class="overview-ring-wrap">
        <div class="overview-ring" style="--pct:${uniquePct}">
          <div class="overview-ring-inner">
            <strong>${uniquePct}%</strong>
            <span>unique coverage</span>
          </div>
        </div>
      </div>
    </div>

    <div class="overview-cards">
      <article class="stat-card">
        <span class="stat-label">Unique Solved</span>
        <strong>${uniqueSolved}</strong>
        <span class="stat-meta">${uniqueTotal} tracked overall</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Solved Entries</span>
        <strong>${rawSolved}</strong>
        <span class="stat-meta">${rawTotal} total across every list</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Notes Saved</span>
        <strong>${noteCount}</strong>
        <span class="stat-meta">your saved approaches and reminders</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Sheets Started</span>
        <strong>${startedSheets}/${SHEETS.length}</strong>
        <span class="stat-meta">${completedSheets} fully completed</span>
      </article>
    </div>

    <div class="overview-split">
      <section class="overview-block">
        <div class="overview-block-head">
          <h2>Sheet Progress</h2>
          <span>${bestSheet ? `${bestSheet.label} leads at ${bestSheet.pct}%` : 'No progress yet'}</span>
        </div>
        <div class="sheet-progress-list">
          ${sheetStats.map(sheet => `
            <button class="sheet-progress-card" onclick="switchList('${sheet.key}')">
              <div class="sheet-progress-top">
                <strong>${esc(sheet.label)}</strong>
                <span>${sheet.solved}/${sheet.total}</span>
              </div>
              <div class="mini-track"><div class="mini-fill" style="width:${sheet.pct}%"></div></div>
              <div class="sheet-progress-foot">
                <span>${sheet.pct}% complete</span>
                <span>${sheet.remaining} left</span>
              </div>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="overview-block">
        <div class="overview-block-head">
          <h2>Top Solved Topics</h2>
          <span>combined from all tracked sheets</span>
        </div>
        <div class="topic-stat-list">
          ${topicStats.length ? topicStats.map(topic => `
            <article class="topic-stat-card">
              <div>
                <strong>${esc(topic.topic)}</strong>
                <span>${topic.solved}/${topic.total} solved</span>
              </div>
              <b>${topic.pct}%</b>
            </article>
          `).join('') : '<div class="empty-msg">Solve a few problems to unlock topic stats.</div>'}
        </div>
      </section>
    </div>
  `;
}

function renderSheetStats() {
  const grid = document.getElementById('sheet-stats-grid');
  if (!isSheetMode()) {
    grid.innerHTML = '';
    return;
  }

  const summary = getCurrentSheetSummary();
  const topicStats = getTopicStatsForSheet(mode).slice(0, 4);
  const highlight = topicStats[0];

  grid.innerHTML = `
    <article class="sheet-stat-card">
      <span class="stat-label">Solved</span>
      <strong>${summary.solved}</strong>
      <span class="stat-meta">${summary.remaining} remaining in this sheet</span>
    </article>
    <article class="sheet-stat-card">
      <span class="stat-label">Topics Started</span>
      <strong>${summary.solvedTopics}/${summary.topics}</strong>
      <span class="stat-meta">${summary.pct}% of the sheet completed</span>
    </article>
    <article class="sheet-stat-card">
      <span class="stat-label">Notes in Sheet</span>
      <strong>${summary.notesInSheet}</strong>
      <span class="stat-meta">saved notes linked to problems here</span>
    </article>
    <article class="sheet-stat-card">
      <span class="stat-label">Best Topic</span>
      <strong>${highlight ? esc(highlight.topic) : 'None yet'}</strong>
      <span class="stat-meta">${highlight ? `${highlight.solved}/${highlight.total} solved` : 'Solve a problem to unlock stats'}</span>
    </article>
  `;
}

function renderProblems() {
  const body = document.getElementById('ptable-body');
  if (!isSheetMode()) {
    body.innerHTML = '';
    return;
  }

  let probs = problems;
  if (gsearch) probs = probs.filter(p => p.problem.toLowerCase().includes(gsearch.toLowerCase()));
  if (topicFilter !== 'all') probs = probs.filter(p => p.topic === topicFilter);
  if (statusFilter === 'todo') probs = probs.filter(p => !done(p));
  if (statusFilter === 'done') probs = probs.filter(p => done(p));

  if (!probs.length) {
    body.innerHTML = '<div class="empty-msg">No problems match your filters.</div>';
    return;
  }

  const grouped = {};
  for (const p of probs) {
    if (!grouped[p.topic]) grouped[p.topic] = [];
    grouped[p.topic].push(p);
  }

  let rowNum = 0;
  let html = '';

  for (const [topic, topicProblems] of Object.entries(grouped)) {
    const allInTopic = problems.filter(problem => problem.topic === topic);
    const doneCount = allInTopic.filter(done).length;
    const col = topicColor(topic);
    const headerBg = topicSurfaceColor(col);
    const chipBg = topicChipColor(col);

    html += `<div class="tg-header" onclick="toggleGroup(this)" style="border-left-color:${col};background:${headerBg}">
      <span class="tg-arrow col" style="color:${col}">&#9660;</span>
      <span class="tg-name" style="color:${col}">${esc(topic)}</span>
      <span class="tg-count">${doneCount}/${allInTopic.length} completed</span>
    </div><div class="tg-rows hidden">`;

    for (const problem of topicProblems) {
      const idx = problems.indexOf(problem);
      const isDone = done(problem);
      rowNum += 1;
      const hasNote = !!(notes[problem.problem] && notes[problem.problem].trim());
      const nameEl = problem.url
        ? `<a class="p-name" href="${esc(problem.url)}" target="_blank" rel="noopener">${esc(problem.problem)}</a><a class="p-ext" href="${esc(problem.url)}" target="_blank" rel="noopener" title="Open">&#x2197;</a>`
        : `<span class="p-name-plain">${esc(problem.problem)}</span>`;
      const actionEl = problem.url
        ? `<a class="solve-btn" href="${esc(problem.url)}" target="_blank" rel="noopener" style="border-color:${col};color:${col};background:${chipBg}">Solve</a>`
        : '<span class="no-solve">—</span>';
      const chkStyle = isDone ? `style="background:${col};border-color:${col}"` : '';

      html += `<div class="p-row${isDone ? ' solved' : ''}" style="border-left-color:${isDone ? col : 'transparent'}">
        <div><div class="p-chk${isDone ? ' on' : ''}" ${chkStyle} onclick="toggle(${idx})"></div></div>
        <div class="p-rownum">${rowNum}</div>
        <div class="p-title-cell">${nameEl}</div>
        <div class="p-topic"><span class="topic-chip" style="border-color:${col};color:${col};background:${chipBg}">${esc(topic)}</span></div>
        <div class="p-action">${actionEl}<button class="notes-btn${hasNote ? ' has-note' : ''}" onclick="openNote(${idx})" title="${hasNote ? 'Edit note' : 'Add note'}">✎</button></div>
      </div>`;
    }

    html += '</div>';
  }

  body.innerHTML = html;

  body.querySelectorAll('.tg-header').forEach(header => {
    const topicName = header.querySelector('.tg-name').textContent;
    if (getExpanded().has(topicName)) {
      header.nextElementSibling.classList.remove('hidden');
      header.querySelector('.tg-arrow').classList.remove('col');
    }
  });
}

function toggleGroup(header) {
  const rows = header.nextElementSibling;
  const arrow = header.querySelector('.tg-arrow');
  const name = header.querySelector('.tg-name').textContent;
  const isHidden = rows.classList.contains('hidden');

  rows.classList.toggle('hidden', !isHidden);
  arrow.classList.toggle('col', !isHidden);
  if (isHidden) getExpanded().add(name);
  else getExpanded().delete(name);
}

function renderMain() {
  updateLayout();
  updateProgress();
  updateTopicSelect();
  renderOverview();
  renderSheetStats();
  renderProblems();
}

function toggle(idx) {
  if (!isSheetMode()) return;

  const problem = problems[idx];
  const isDone = !progress[problem.problem];
  if (isDone) progress[problem.problem] = true;
  else delete progress[problem.problem];

  localStorage.setItem(SK + '_' + mode, JSON.stringify(progress));

  if (problem.url) {
    for (const sheet of SHEETS) {
      if (sheet.key === mode) continue;
      const matches = sheet.data.filter(item => item.url && item.url === problem.url);
      if (!matches.length) continue;
      const other = getStoredProgress(sheet.key);
      matches.forEach(item => {
        if (isDone) other[item.problem] = true;
        else delete other[item.problem];
      });
      localStorage.setItem(SK + '_' + sheet.key, JSON.stringify(other));
    }
  }

  syncToFirebase();
  renderMain();
}

function switchList(nextMode) {
  mode = nextMode;
  problems = isSheetMode(nextMode) ? SHEET_MAP[nextMode].data : [];
  loadProgressForMode(nextMode);
  topicFilter = 'all';
  statusFilter = 'all';
  gsearch = '';
  document.getElementById('gSearch').value = '';

  const tabMap = {
    overview: 'sw-home',
    dsa450: 'sw-dsa',
    blind75: 'sw-b75',
    sde: 'sw-sde',
    nc150: 'sw-nc',
    grind75: 'sw-g75'
  };

  Object.values(tabMap).forEach(id => document.getElementById(id).classList.remove('on'));
  document.getElementById(tabMap[nextMode]).classList.add('on');
  setStatus('all', false);
  renderMain();
}

function doReset() {
  if (!isSheetMode()) {
    alert('Open a specific sheet to reset its progress.');
    return;
  }
  if (!confirm('Reset all progress for this list?')) return;
  progress = {};
  localStorage.removeItem(SK + '_' + mode);
  renderMain();
}

function onGSearch(v) {
  gsearch = v.trim();
  renderProblems();
}

function setTopicFilter(v) {
  topicFilter = v;
  renderProblems();
}

function setStatus(s, render = true) {
  statusFilter = s;
  ['all', 'todo', 'done'].forEach(k => {
    const el = document.getElementById('st-' + k);
    if (el) el.classList.toggle('on', k === s);
  });
  if (render) renderProblems();
}

function doExport() {
  const allProgress = {};
  SHEETS.forEach(sheet => {
    const data = localStorage.getItem(SK + '_' + sheet.key);
    if (data) allProgress[sheet.key] = JSON.parse(data);
  });

  const notesData = localStorage.getItem(SK + '_notes');
  if (notesData) allProgress.notes = JSON.parse(notesData);

  const blob = new Blob([JSON.stringify(allProgress, null, 2)], { type: 'application/json' });
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

    const validKeys = SHEETS.map(sheet => sheet.key);
    const foundKeys = Object.keys(data).filter(k => validKeys.includes(k));
    if (foundKeys.length === 0 && !data.notes) {
      alert('Error: No recognised sheet keys found.\n\nExpected one or more of: ' + validKeys.join(', ') + '\n\nPlease use a file exported from this tracker.');
      return;
    }

    for (const key of foundKeys) {
      if (typeof data[key] !== 'object' || Array.isArray(data[key]) || data[key] === null) {
        alert(`Error: Value for "${key}" must be an object, got ${Array.isArray(data[key]) ? 'array' : typeof data[key]}.\n\nPlease use a file exported from this tracker.`);
        return;
      }
      for (const [problem, value] of Object.entries(data[key])) {
        if (typeof value !== 'boolean') {
          alert(`Error: Progress values must be booleans, but "${problem}" in "${key}" has value: ${JSON.stringify(value)}.\n\nPlease use a file exported from this tracker.`);
          return;
        }
      }
    }

    if (data.notes !== undefined) {
      if (typeof data.notes !== 'object' || Array.isArray(data.notes) || data.notes === null) {
        alert('Error: "notes" must be an object.\n\nPlease use a file exported from this tracker.');
        return;
      }
      for (const [problem, value] of Object.entries(data.notes)) {
        if (typeof value !== 'string') {
          alert(`Error: Note values must be strings, but "${problem}" has value: ${JSON.stringify(value)}.\n\nPlease use a file exported from this tracker.`);
          return;
        }
      }
      localStorage.setItem(SK + '_notes', JSON.stringify(data.notes));
      notes = data.notes;
    }

    foundKeys.forEach(key => {
      localStorage.setItem(SK + '_' + key, JSON.stringify(data[key]));
    });

    loadProgressForMode(mode);
    renderMain();
    const imported = [...foundKeys, ...(data.notes ? ['notes'] : [])];
    alert(`Progress imported successfully for: ${imported.join(', ')}`);
  };

  reader.readAsText(file);
  input.value = '';
}

function openNote(idx) {
  if (!isSheetMode()) return;
  noteIdx = idx;
  const problem = problems[idx];
  document.getElementById('note-modal-title').textContent = problem.problem;
  document.getElementById('note-textarea').value = notes[problem.problem] || '';
  document.getElementById('note-modal').style.display = 'flex';
  document.getElementById('note-textarea').focus();
}

function saveNote() {
  if (noteIdx < 0 || !isSheetMode()) return;

  const problem = problems[noteIdx];
  const value = document.getElementById('note-textarea').value.trim();
  if (value) notes[problem.problem] = value;
  else delete notes[problem.problem];

  localStorage.setItem(SK + '_notes', JSON.stringify(notes));
  syncToFirebase();
  closeNote();
  renderMain();
}

function closeNote() {
  noteIdx = -1;
  document.getElementById('note-modal').style.display = 'none';
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeNote();
});

function updateThemeToggleLabel() {
  const btn = document.getElementById('theme-toggle-btn');
  if (!btn) return;
  const dark = document.body.classList.contains('dark');
  btn.textContent = dark ? '🌙 Light Mode' : '☀️ Dark Mode';
}

function toggleDark() {
  const dark = document.body.classList.toggle('dark');
  localStorage.setItem(SK + '_dark', dark ? '1' : '0');
  updateThemeToggleLabel();
  renderMain();
}

function init() {
  problems = [];
  loadProgressForMode(DEFAULT_MODE);
  notes = JSON.parse(localStorage.getItem(SK + '_notes') || '{}');

  const savedTheme = localStorage.getItem(SK + '_dark');
  const shouldUseDark = savedTheme !== '0';
  document.body.classList.toggle('dark', shouldUseDark);
  updateThemeToggleLabel();
  switchList(DEFAULT_MODE);
}

init();
