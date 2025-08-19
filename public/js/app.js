// ===== Constants =====
const STORAGE_KEY = 'gbr.games.v1';
const STATUSES = ['Backlog','Currently Playing','Played'];
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// ===== State =====
let state = {
  games: [],
  ui: {
    search: '',
    sort: 'lastAdded',
    favOnly: false,
    editId: null,
    pendingDeleteId: null,
  }
};

// ===== Storage =====
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.games = raw ? JSON.parse(raw) : [];
  } catch {
    state.games = [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.games));
}

// ===== Helpers =====
function nowIso() { return new Date().toISOString(); }
function toast(msg) { M.toast({html: msg}); }
function isValidRating(r) {
  return r == null || (Number.isInteger(r) && r >= 1 && r <= 5);
}
function byTitleLower(a,b){ return a.title.localeCompare(b.title, undefined, {sensitivity:'base'}); }

async function fetchIgdbCoverUrl(title){
  try {
    const res = await fetch(`/api/igdb/cover-url?title=${encodeURIComponent(title)}`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.url || null;
  } catch { return null; }
}

function starIcons(rating){
  const r = rating ?? 0;
  const arr = [];
  for (let i=1;i<=5;i++){
    arr.push(`<i class="material-icons ${i<=r?'yellow-text text-darken-2':'grey-text'}">star</i>`);
  }
  return `<span class="rating-stars">${arr.join('')}</span>`;
}

function statusChip(status){
  const color = status === 'Played' ? 'green' : status === 'Currently Playing' ? 'blue' : 'grey';
  return `<div class="chip ${color} lighten-1 white-text chip-status">${status}</div>`;
}

function sanitizeTitle(t){ return t.trim(); }

function findById(id){ return state.games.find(g=>g.id===id); }

// ===== CRUD =====
async function addGame(title, status='Backlog', rating=null){
  const t = sanitizeTitle(title);
  if (!t) return toast('Title is required');
  if (state.games.some(g=>g.title.toLowerCase()===t.toLowerCase())) return toast('Duplicate title');
  if (!isValidRating(rating)) return toast('Invalid rating');
  const cover = await fetchIgdbCoverUrl(t);
  const game = {
    id: crypto.randomUUID(),
    title: t,
    status,
    rating: rating ?? null,
    favorite: false,
    imageUrl: cover || '/img/placeholder.svg',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastPlayedAt: status === 'Played' ? nowIso() : null
  };
  state.games.push(game); save(); renderAll();
}

function updateGame(id, patch){
  const i = state.games.findIndex(g=>g.id===id);
  if (i < 0) return;
  const cur = state.games[i];
  const next = { ...cur, ...patch, updatedAt: nowIso() };
  // business rules
  if (!isValidRating(next.rating)) return toast('Invalid rating');
  if (!STATUSES.includes(next.status)) return toast('Invalid status');
  if (cur.status !== 'Played' && next.status === 'Played') next.lastPlayedAt = nowIso();
  state.games[i] = next; save(); renderAll();
}

function removeGame(id){
  state.games = state.games.filter(g=>g.id !== id);
  save(); renderAll();
}

// ===== Filters/Sort =====
function applyQueryAndSort(items, statusFilter=null){
  let arr = items.slice();
  // Status scope (per tab)
  if (statusFilter) arr = arr.filter(g=>g.status === statusFilter);
  // Fav toggle
  if (state.ui.favOnly) arr = arr.filter(g=>g.favorite);
  // Search
  const q = state.ui.search.trim().toLowerCase();
  if (q) arr = arr.filter(g=> g.title.toLowerCase().includes(q));
  // Sort
  if (state.ui.sort === 'rating'){
    arr.sort((a,b)=>(b.rating ?? -1) - (a.rating ?? -1));
  } else if (state.ui.sort === 'lastPlayed'){
    const val = g => g.lastPlayedAt ? Date.parse(g.lastPlayedAt) : 0;
    arr.sort((a,b)=> val(b) - val(a));
  } else {
    // lastAdded
    arr.sort((a,b)=> Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return arr;
}

// ===== Render =====
function gameCard(g){
  return `
  <div class="card game-card grey darken-3">
    <div class="card-image">
      <img src="${g.imageUrl}" alt="${g.title} cover" onerror="this.src='/img/placeholder.svg'">
      <a class="fav-toggle btn-floating btn-small ${g.favorite?'red':'grey'} lighten-1 waves-effect" data-id="${g.id}">
        <i class="material-icons">favorite</i>
      </a>
    </div>
    <div class="card-content white-text">
      <span class="card-title truncate" title="${g.title}">${g.title}</span>
      ${statusChip(g.status)}
      <div>${starIcons(g.rating)}</div>
    </div>
    <div class="card-action">
      <a href="#!" class="edit-link" data-id="${g.id}">Edit</a>
      <a href="#!" class="delete-link red-text" data-id="${g.id}">Delete</a>
    </div>
  </div>`;
}

function renderList(containerId, statusFilter=null){
  const el = document.getElementById(containerId);
  const items = applyQueryAndSort(state.games, statusFilter);
  el.innerHTML = items.map(gameCard).join('') || '<p class="grey-text">No items</p>';
}

let statusChart, ratingsChart;
function renderCharts(){
  // Status counts
  const counts = {
    Played: state.games.filter(g=>g.status==='Played').length,
    'Currently Playing': state.games.filter(g=>g.status==='Currently Playing').length,
    Backlog: state.games.filter(g=>g.status==='Backlog').length,
  };
  const ctx1 = document.getElementById('statusDonut');
  statusChart?.destroy();
  statusChart = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: ['Played','Currently Playing','Backlog'],
      datasets: [{ data: [counts['Played'], counts['Currently Playing'], counts['Backlog']] }]
    },
    options: { plugins: { legend: { display: true } } }
  });

  // Ratings distribution 1..5
  const dist = [1,2,3,4,5].map(r => state.games.filter(g=>g.rating===r).length);
  const ctx2 = document.getElementById('ratingsBar');
  ratingsChart?.destroy();
  ratingsChart = new Chart(ctx2, {
    type: 'bar',
    data: { labels: ['1','2','3','4','5'], datasets: [{ data: dist }] },
    options: { scales: { y: { beginAtZero: true, precision:0 } }, plugins: { legend: { display: false } } }
  });
}

function renderProfileShelves(){
  const playing = state.games.filter(g=>g.status==='Currently Playing').slice(0,3);
  const favs = state.games.filter(g=>g.favorite).slice(0,5);
  $('#profilePlaying').innerHTML = playing.map(gameCard).join('') || '<p class="grey-text">No items</p>';
  $('#profileFavorites').innerHTML = favs.map(gameCard).join('') || '<p class="grey-text">No items</p>';
}

function renderAll(){
  renderCharts();
  renderProfileShelves();
  renderList('favoritesList', null); // will filter by favOnly toggle
  // For favorites tab, force favOnly filter display; but we still show all + favOnly toggle if enabled
  const favScoped = state.ui.favOnly ? state.games.filter(g=>g.favorite) : state.games;
  $('#favoritesList').innerHTML = applyQueryAndSort(favScoped).filter(g=>g.favorite).map(gameCard).join('') || '<p class="grey-text">No items</p>';
  renderList('playingList', 'Currently Playing');
  renderList('playedList', 'Played');
  renderList('backlogList', 'Backlog');
  bindDynamicActions();
}

// ===== Event Bindings =====
function bindDynamicActions(){
  $$('.fav-toggle').forEach(btn => btn.onclick = (e)=>{
    const id = e.currentTarget.dataset.id;
    const g = findById(id); if (!g) return;
    updateGame(id, { favorite: !g.favorite });
  });
  $$('.edit-link').forEach(a => a.onclick = (e)=>{
    const id = e.currentTarget.dataset.id;
    state.ui.editId = id;
    const g = findById(id);
    if (!g) return;
    $('#modalTitle').textContent = 'Edit Game';
    $('#gameTitle').value = g.title;
    M.updateTextFields();
    $('#gameTitle').disabled = true; // per GBR-005 (cannot edit title)
    $('#gameStatus').value = g.status;
    $('#gameRating').value = g.rating ?? '';
    M.FormSelect.init($('#gameStatus'));
    M.FormSelect.init($('#gameRating'));
    const modal = M.Modal.getInstance($('#addModal')); modal.open();
  });
  $$('.delete-link').forEach(a => a.onclick = (e)=>{
    const id = e.currentTarget.dataset.id;
    state.ui.pendingDeleteId = id;
    const modal = M.Modal.getInstance($('#confirmDelete')); modal.open();
  });
}

function clearAddForm(){
  $('#modalTitle').textContent = 'Add Game';
  $('#gameTitle').value = '';
  $('#gameTitle').disabled = false;
  $('#gameStatus').value = 'Backlog';
  $('#gameRating').value = '';
  M.updateTextFields();
  M.FormSelect.init($('#gameStatus'));
  M.FormSelect.init($('#gameRating'));
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  load();
  M.FormSelect.init($('select'));
  M.Tabs.init($('.tabs'));
  // Inicialização robusta dos modais
  const addModalElem = document.getElementById('addModal');
  const addModalInstance = M.Modal.getInstance(addModalElem) || M.Modal.init(addModalElem);
  const confirmDeleteElem = document.getElementById('confirmDelete');
  const confirmDeleteInstance = M.Modal.getInstance(confirmDeleteElem) || M.Modal.init(confirmDeleteElem);

  document.querySelector('a.modal-trigger[href="#addModal"]').addEventListener('click', () => {
    clearAddForm();
    addModalInstance.open();
  });

  // Reforçar o bind do botão de confirmação de delete
  document.getElementById('confirmDeleteBtn').onclick = () => {
    if (state.ui.pendingDeleteId) removeGame(state.ui.pendingDeleteId);
    state.ui.pendingDeleteId = null;
    confirmDeleteInstance.close();
  };

  // Controls
  $('#searchInput').oninput = (e)=>{ state.ui.search = e.target.value; renderAll(); };
  $('#sortSelect').onchange = (e)=>{ state.ui.sort = e.target.value; renderAll(); };
  $('#favOnlyToggle').onchange = (e)=>{ state.ui.favOnly = e.target.checked; renderAll(); };

  // Save (add or edit)
  $('#saveBtn').onclick = async ()=>{
    const title = $('#gameTitle').value;
    const status = $('#gameStatus').value;
    const ratingVal = $('#gameRating').value;
    const rating = ratingVal === '' ? null : parseInt(ratingVal, 10);
    if (!isValidRating(rating)) return toast('Invalid rating');
    if (state.ui.editId){
      updateGame(state.ui.editId, { status, rating });
      state.ui.editId = null;
    } else {
      await addGame(title, status, rating);
    }
    clearAddForm();
  };

  renderAll();
});
