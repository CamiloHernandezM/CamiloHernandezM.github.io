// ── State ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'berserk_collection';
const statusCycle = { owned: 'wishlist', wishlist: 'missing', missing: 'owned' };
const statusLabel = { owned: 'En colección', wishlist: 'Wishlist', missing: 'Sin tener' };

let currentTab    = 'normal';
let currentFilter = 'all';

function activeVolumes() {
  return currentTab === 'deluxe' ? volumesDeluxe : volumes;
}

// ── Persistence ────────────────────────────────────────────────────────────
function loadState() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  volumes.forEach(v => {
    const key = `normal-${v.num}`;
    if (saved[key] !== undefined) v.status = saved[key];
  });
  volumesDeluxe.forEach(v => {
    const key = `deluxe-${v.num}`;
    if (saved[key] !== undefined) v.status = saved[key];
  });
}

function saveState() {
  const state = {};
  volumes.forEach(v => state[`normal-${v.num}`] = v.status);
  volumesDeluxe.forEach(v => state[`deluxe-${v.num}`] = v.status);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ── Rendering ──────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('grid');
  const all  = activeVolumes();
  const visible = currentFilter === 'all'
    ? all
    : all.filter(v => v.status === currentFilter);

  grid.innerHTML = visible.map(v => {
    const placeholder = `https://placehold.co/140x210/1a1714/6b6358?text=N.${v.num}`;
    const imgSrc = v.img || placeholder;
    const isDeluxe = v.type === 'deluxe';
    return `
      <div class="card ${v.status}${isDeluxe ? ' deluxe' : ''}" data-num="${v.num}" title="Clic para cambiar estado">
        ${isDeluxe ? '<span class="deluxe-ribbon">DELUXE</span>' : ''}
        <img
          class="card-image"
          src="${imgSrc}"
          alt="${v.title}"
          loading="lazy"
          onerror="this.src='${placeholder}'"
        >
        <p class="card-num">TOMO ${v.num}</p>
        <span class="badge badge-${v.status}">${statusLabel[v.status]}</span>
      </div>
    `;
  }).join('');
}

function renderStats() {
  const all      = activeVolumes();
  const owned    = all.filter(v => v.status === 'owned').length;
  const wishlist = all.filter(v => v.status === 'wishlist').length;
  document.getElementById('stat-owned').textContent    = `${owned} en colección`;
  document.getElementById('stat-wishlist').textContent = `${wishlist} en wishlist`;
  document.getElementById('stat-total').textContent    = `${all.length} tomos`;
}

function render() {
  renderGrid();
  renderStats();
}

// ── Events ─────────────────────────────────────────────────────────────────
document.getElementById('grid').addEventListener('click', e => {
  const card = e.target.closest('.card');
  if (!card) return;
  const num = parseInt(card.dataset.num);
  const vol = activeVolumes().find(v => v.num === num);
  vol.status = statusCycle[vol.status];
  saveState();
  render();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentTab = btn.dataset.tab;
    currentFilter = 'all';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    btn.classList.add('active');
    render();
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// ── Init ───────────────────────────────────────────────────────────────────
loadState();
render();