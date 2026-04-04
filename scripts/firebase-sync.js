// ── Firebase ──────────────────────────────────────────────────────────────
firebase.initializeApp({
  apiKey: "AIzaSyCU_B7Us5B06hXisEd31WAR7aGkqd1i7RU",
  authDomain: "dsa-practice-24944.firebaseapp.com",
  databaseURL: "https://dsa-practice-24944-default-rtdb.firebaseio.com",
  projectId: "dsa-practice-24944",
  storageBucket: "dsa-practice-24944.firebasestorage.app",
  messagingSenderId: "232486241611",
  appId: "1:232486241611:web:2fe400ddf11ded308f54ce"
});
const fbAuth = firebase.auth();
const fbDb = firebase.database();
let currentUser = null;
let syncTimer = null;

function syncToFirebase() {
  if (!currentUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    // Store as JSON strings to avoid Firebase key restrictions (dots, brackets, etc.)
    const payload = {};
    for (const m of ['dsa450','blind75','sde','nc150','grind75']) {
      const d = localStorage.getItem(SK+'_'+m);
      if (d) payload[m] = d; // store raw JSON string, not parsed object
    }
    const notesData = localStorage.getItem(SK+'_notes');
    if (notesData) payload['notes'] = notesData;
    fbDb.ref('users/' + currentUser.uid).set(payload);
  }, 800);
}

function setupRealtimeSync(uid) {
  fbDb.ref('users/' + uid).on('value', snap => {
    const data = snap.val();
    if (!data) { syncToFirebase(); return; } // first login — push local data up
    let changed = false;
    for (const m of ['dsa450','blind75','sde','nc150','grind75']) {
      if (data[m] && localStorage.getItem(SK+'_'+m) !== data[m]) {
        localStorage.setItem(SK+'_'+m, data[m]);
        changed = true;
      }
    }
    if (data.notes && localStorage.getItem(SK+'_notes') !== data.notes) {
      localStorage.setItem(SK+'_notes', data.notes);
      notes = JSON.parse(data.notes);
      changed = true;
    }
    if (changed) {
      progress = (mode === 'dsa450' || mode === 'blind75' || mode === 'sde' || mode === 'nc150' || mode === 'grind75')
        ? JSON.parse(localStorage.getItem(SK+'_'+mode) || '{}')
        : {};
      renderMain();
    }
  });
}

function handleAuthClick() {
  if (currentUser) {
    fbDb.ref('users/' + currentUser.uid).off();
    fbAuth.signOut();
  } else {
    document.getElementById('signin-modal').classList.add('open');
  }
}

function signInWith(provider) {
  closeSignIn();
  const p = provider === 'github'
    ? new firebase.auth.GithubAuthProvider()
    : new firebase.auth.GoogleAuthProvider();
  fbAuth.signInWithPopup(p);
}

function closeSignIn() {
  document.getElementById('signin-modal').classList.remove('open');
}

function toggleSettings() {
  document.getElementById('settings-dropdown').classList.toggle('open');
}

document.addEventListener('click', e => {
  const wrap = document.querySelector('.settings-wrap');
  if (wrap && !wrap.contains(e.target))
    document.getElementById('settings-dropdown').classList.remove('open');
  const modal = document.getElementById('signin-modal');
  if (modal && e.target === modal) closeSignIn();
});

fbAuth.onAuthStateChanged(user => {
  currentUser = user;
  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  if (user) {
    const name = user.displayName
      ? user.displayName.split(' ')[0]
      : user.email
        ? user.email.split('@')[0]
        : (user.providerData[0] && user.providerData[0].displayName)
          ? user.providerData[0].displayName.split(' ')[0]
          : 'User';
    btn.textContent = name + ' (sign out)';
    btn.title = user.email;
    btn.classList.add('signed-in');
    setupRealtimeSync(user.uid);
  } else {
    btn.textContent = 'Sign in';
    btn.title = '';
    btn.classList.remove('signed-in');
  }
});
// ─────────────────────────────────────────────────────────────────────────
