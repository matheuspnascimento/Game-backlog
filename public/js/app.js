// ===== Constants =====
const STORAGE_KEY = 'gbr.games.v1';
const STATUSES = ['Backlog', 'Currently Playing', 'Played', 'Favorites'];
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ===== State =====
let state = {
  games: [],
  ui: { search: '', sort: 'lastAdded', editId: null, pendingDeleteId: null }
};

// ===== Modal temp state =====
let modalRating = null;

// ===== Storage =====
function load() {
  try {
    state.games = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    state.games = [];
  }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.games));
}

// ===== Helpers =====
const uuid = () =>
  (crypto?.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36));
const nowIso = () => new Date().toISOString();

function toast(msg) {
  const box = document.createElement('div');
  box.className = 'alert';
  box.textContent = msg;
  $('#toast-container').appendChild(box);
  setTimeout(() => box.remove(), 2600);
}
function isValidRating(r) {
  return r == null || (Number.isInteger(r) && r >= 1 && r <= 5);
}
const byTitleLower = (a, b) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

async function fetchIgdbCoverUrl(title) {
  try {
    const res = await fetch(
      `/api/igdb/cover-url?title=${encodeURIComponent(title)}`
    );
    if (!res.ok) return null;
    const j = await res.json();
    return j.url || null;
  } catch {
    return null;
  }
}

function starIcons(rating) {
  const r = rating ?? 0;
  const arr = [];
  for (let i = 1; i <= 5; i++) {
    arr.push(
      `<i class="material-icons" style="font-size:14px;${
        i <= r ? 'color:#ffbf4d' : 'color:#4f5663'
      }">star</i>`
    );
  }
  return `<span class="overlay-stars">${arr.join('')}</span>`;
}

const sanitizeTitle = (t) => t.trim();
const findById = (id) => state.games.find((g) => g.id === id);

// ===== Modal helpers (star picker) =====
function bindRatingStars(initial) {
  const stars = $$('#ratingStars .star');
  function paint(v) {
    modalRating = v && Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
    const n = modalRating ?? 0;
    stars.forEach((s, i) => s.classList.toggle('active', i < n));
  }
  stars.forEach((s) =>
    s.addEventListener('click', () => paint(parseInt(s.dataset.val, 10)))
  );
  paint(initial ?? 0);
}

// ===== CRUD =====
async function addGame(title, status = 'Backlog', rating = null) {
  const t = sanitizeTitle(title);
  if (!t) return toast('Title is required');
  if (state.games.some((g) => g.title.toLowerCase() === t.toLowerCase()))
    return toast('Duplicate title');
  if (!isValidRating(rating)) return toast('Invalid rating');

  const cover = await fetchIgdbCoverUrl(t);
  const game = {
    id: uuid(),
    title: t,
    status,
    rating: rating ?? null,
    imageUrl: cover || '/img/placeholder.svg',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastPlayedAt: status === 'Played' ? nowIso() : null
  };
  state.games.push(game);
  save();
  renderAll();
}

function updateGame(id, patch) {
  const i = state.games.findIndex((g) => g.id === id);
  if (i < 0) return;
  const cur = state.games[i];
  const next = { ...cur, ...patch, updatedAt: nowIso() };
  if (!isValidRating(next.rating)) return toast('Invalid rating');
  if (!STATUSES.includes(next.status)) return toast('Invalid status');
  if (cur.status !== 'Played' && next.status === 'Played') next.lastPlayedAt = nowIso();
  state.games[i] = next;
  save();
  renderAll();
}

function removeGame(id) {
  state.games = state.games.filter((g) => g.id !== id);
  save();
  renderAll();
}

// ===== Filters/Sort =====
function applyQueryAndSort(items, statusFilter = null) {
  let arr = items.slice();

  if (statusFilter) arr = arr.filter((g) => g.status === statusFilter);

  const q = state.ui.search.trim().toLowerCase();
  if (q) arr = arr.filter((g) => g.title.toLowerCase().includes(q));

  switch (state.ui.sort) {
    case 'rating':
      arr.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
      break;
    case 'lastPlayed': {
      const val = (g) => (g.lastPlayedAt ? Date.parse(g.lastPlayedAt) : 0);
      arr.sort((a, b) => val(b) - val(a));
      break;
    }
    case 'titleAZ':
      arr.sort(byTitleLower);
      break;
    case 'titleZA':
      arr.sort((a, b) => byTitleLower(b, a));
      break;
    default:
      arr.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return arr;
}

// ===== Render =====
function gameCard(g) {
  return `
  <div class="card">
    <figure>
      <img src="${g.imageUrl}" alt="${g.title} cover" onerror="this.src='/img/placeholder.svg'">
      <div class="cover-overlay">
        <div class="overlay-actions">
          <button class="btn-circle edit-link" data-id="${g.id}" title="Edit">
            <i class="material-icons" style="font-size:18px">edit</i>
          </button>
        </div>
        ${starIcons(g.rating)}
      </div>
    </figure>
  </div>`;
}

function renderList(containerId, statusFilter = null) {
  const el = document.getElementById(containerId);
  const items = applyQueryAndSort(state.games, statusFilter);
  el.innerHTML =
    items.map(gameCard).join('') || '<p class="text-neutral">Insert new games!</p>';
}

let statusChart, ratingsChart;

function renderCharts() {
  const counts = {
    Played: state.games.filter((g) => g.status === 'Played').length,
    'Currently Playing': state.games.filter((g) => g.status === 'Currently Playing').length,
    Backlog: state.games.filter((g) => g.status === 'Backlog').length,
    Favorites: state.games.filter((g) => g.status === 'Favorites').length
  };
  const series = [counts.Played, counts['Currently Playing'], counts.Backlog, counts.Favorites];
  const labels = ['Played', 'Currently Playing', 'Backlog', 'Favorites'];
  const total = series.reduce((a, b) => a + b, 0);

  if (statusChart) statusChart.destroy();
  statusChart = new ApexCharts($('#statusDonut'), {
    chart: { type: 'donut', height: 250, background: 'transparent', toolbar: { show: false } },
    series,
    labels,
    colors: ['#de3d3d', '#1976d2', '#616161', '#ef5b83'],
    legend: {
      show: true,
      position: 'right',
      offsetY: 10,
      labels: { colors: '#e6ebf3' },
      fontSize: '14px',
      markers: { width: 10, height: 10, radius: 2 }
    },
    dataLabels: { enabled: false },
    tooltip: { theme: 'dark', y: { formatter: (val) => `Games: ${val}` }, x: { show: false } },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: { show: true, color: '#dfe6f2', fontSize: '12px' },
            value: { show: true, color: '#ffffff', fontSize: '22px' },
            total: { show: true, label: 'Total', color: '#cfd6e6', formatter: () => total }
          }
        }
      }
    }
  });
  statusChart.render();

  const dist = [1, 2, 3, 4, 5].map((r) => state.games.filter((g) => g.rating === r).length);
  const totalRatings = state.games.filter((g) => Number.isInteger(g.rating)).length;

  if (ratingsChart) ratingsChart.destroy();
  ratingsChart = new ApexCharts($('#ratingsBar'), {
    chart: { type: 'bar', height: 240, toolbar: { show: false } },
    series: [{ data: dist }],
    xaxis: {
      categories: ['1 ⭐', '2 ⭐', '3 ⭐', '4 ⭐', '5 ⭐'],
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { 
        style: { colors: '#cfd6e6', fontSize: '12px' },
        formatter: function(value) {
          return value;
        }
      }
    },
    yaxis: { show: false },
    grid: { show: false },
    plotOptions: { bar: { borderRadius: 8, columnWidth: '50%', distributed: true, states: { hover: { filter: { type: 'none' } } } } },
    colors: ['#f5a623', '#f5a623', '#f5a623', '#f5a623', '#f5a623'],
    dataLabels: {
      enabled: true,
      formatter: (val) => (val > 0 ? String(val) : ''),
      style: { colors: ['#ffffff'], fontSize: '12px', fontWeight: '700' }
    },
    tooltip: {
      theme: 'dark',
      x: { show: false },
      y: {
        title: {
          formatter: () => ''
        },
        formatter: (val, opts) => {
          if (!totalRatings) return '0%';
          const percent = Math.round((val / totalRatings) * 100);
          const star = opts.dataPointIndex + 1;
          return `${percent}% with ${star} star${star > 1 ? 's' : ''}`;
        }
      }
    },
    legend: { show: false }
  });
  ratingsChart.render();
}

function renderProfileShelves() {
  const playing = state.games
    .filter((g) => g.status === 'Currently Playing')
    .slice(0, 3);
  const favs = state.games.filter((g) => g.status === 'Favorites').slice(0, 5);
  $('#profilePlaying').innerHTML =
    playing.map(gameCard).join('') || '<p class="text-neutral">You have no games in progress at the moment</p>';
  $('#profileFavorites').innerHTML =
    favs.map(gameCard).join('') || '<p class="text-neutral">You have no favorite games at the moment</p>';
}

function updateSectionCounts() {
  const favorites = state.games.filter((g) => g.status === 'Favorites').length;
  const playing = state.games.filter((g) => g.status === 'Currently Playing').length;
  const played = state.games.filter((g) => g.status === 'Played').length;
  const backlog = state.games.filter((g) => g.status === 'Backlog').length;
  const set = (id, v) => {
    const el = $(id);
    if (el) el.textContent = v;
  };
  set('#countFavorites', favorites);
  set('#countPlaying', playing);
  set('#countPlayed', played);
  set('#countBacklog', backlog);
}

function renderAll() {
  renderCharts();
  renderProfileShelves();

  renderList('favoritesList', 'Favorites');
  renderList('playingList', 'Currently Playing');
  renderList('playedList', 'Played');
  renderList('backlogList', 'Backlog');

  bindDynamicActions();
  updateSectionCounts();

  const map = {
    lastAdded: 'Sort: Last added',
    lastPlayed: 'Sort: Last played',
    rating: 'Sort: Rating',
    titleAZ: 'Sort: Title A–Z',
    titleZA: 'Sort: Title Z–A',
    favorites: 'Sort: Favorites only'
  };
  $('#sortLabel').textContent = map[state.ui.sort] || 'Sort';
}

// ===== Events for dynamic elements =====
function bindDynamicActions() {
  // Open edit modal
  $$('.edit-link').forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      state.ui.editId = id;
      const g = findById(id);
      if (!g) return;

      $('#modalTitle').textContent = 'Edit Game';
      $('#gameTitle').value = g.title;
      $('#gameTitle').disabled = true;
      $('#gameStatus').value = g.status;

      bindRatingStars(g.rating ?? 0);

      $('#modalDeleteBtn').classList.remove('hidden');
      openModal('addModal');
    };
  });
}

const openModal = (id) => document.getElementById(id).showModal();

// ===== Tabs =====
function setupTabNavigation() {
  const cfg = [
    ['tabProfile', 'profileTab'],
    ['tabFavorites', 'favoritesTab'],
    ['tabPlaying', 'playingTab'],
    ['tabPlayed', 'playedTab'],
    ['tabBacklog', 'backlogTab']
  ];
  const activate = (key) =>
    cfg.forEach(([tid, cid]) => {
      $('#' + tid).classList.toggle('tab-active', tid === key);
      $('#' + cid).classList.toggle('hidden', tid !== key);
    });
  cfg.forEach(([tid]) => ($('#' + tid).onclick = () => activate(tid)));
}

// ===== Sort menu =====
function setupSortMenu() {
  const trigger = $('#sortTrigger'),
    menu = $('#sortMenu');
  const close = () => menu.classList.remove('show');
  trigger.onclick = () => menu.classList.toggle('show');
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && e.target !== trigger) close();
  });
  $$('#sortMenu li').forEach(
    (li) =>
      (li.onclick = () => {
        state.ui.sort = li.dataset.value;
        close();
        renderAll();
      })
  );
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  load();

  // search
  let t;
  $('#searchInput').oninput = (e) => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.ui.search = e.target.value;
      renderAll();
    }, 150);
  };

  // open add modal
  $('#addGameBtn').onclick = () => {
    $('#modalTitle').textContent = 'Add Game';
    $('#gameTitle').value = '';
    $('#gameTitle').disabled = false;
    $('#gameStatus').value = 'Backlog';

    bindRatingStars(null);

    $('#modalDeleteBtn').classList.add('hidden');
    openModal('addModal');
  };

  // save (add or edit)
  $('#saveBtn').onclick = async () => {
    const title = $('#gameTitle').value.trim();
    const status = $('#gameStatus').value;
    const rating = modalRating;

    if (!isValidRating(rating)) return toast('Invalid rating');

    if (state.ui.editId) {
      updateGame(state.ui.editId, { status, rating });
      state.ui.editId = null;
    } else {
      await addGame(title, status, rating);
    }
    $('#addModal').close();
  };

  // delete from edit modal
  $('#modalDeleteBtn').onclick = () => {
    if (!state.ui.editId) return;
    state.ui.pendingDeleteId = state.ui.editId;
    openModal('confirmDelete');
  };

  // confirm delete
  $('#confirmDeleteBtn').onclick = () => {
    if (state.ui.pendingDeleteId) removeGame(state.ui.pendingDeleteId);
    state.ui.pendingDeleteId = null;
    state.ui.editId = null;
    $('#confirmDelete').close();
    $('#addModal').close();
  };

  setupTabNavigation();
  setupSortMenu();
  renderAll();
});
