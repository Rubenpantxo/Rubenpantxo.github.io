/* ============================================================
   ÁRBOL GENEALÓGICO FAMILIAR — Lógica Principal
   ============================================================ */

'use strict';

// ── Estado global ──────────────────────────────────────────
let allMembers  = [];
let allComments = [];
let currentZoom = 1;
let activeFilter = 'all';
let editingMemberId = null;

const TABLE_MEMBERS  = 'family_members';
const TABLE_COMMENTS = 'family_comments';

// ── Paleta de generaciones ──────────────────────────────────
const GEN_LABELS = {
  '-3': 'Tatarabuelos',
  '-2': 'Bisabuelos',
  '-1': 'Abuelos',
   '0': 'Padres',
   '1': 'Tu generación',
   '2': 'Hijos',
   '3': 'Nietos',
   '4': 'Bisnietos',
};

// ── UTILIDADES ──────────────────────────────────────────────
function getInitials(name) {
  return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatYears(birth, death) {
  if (!birth && !death) return '';
  if (birth && death) return `${birth} – ${death}`;
  if (birth) return `n. ${birth}`;
  return '';
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3200);
}

function isVideoUrl(url) {
  if (!url) return false;
  return url.includes('youtube') || url.includes('youtu.be') ||
         url.includes('vimeo') || url.match(/\.(mp4|webm|ogg)(\?|$)/i);
}

function getYouTubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/)([^&\?\/]+)/);
  return m ? m[1] : null;
}

function buildVideoEmbed(url) {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return `<iframe width="100%" height="180" src="https://www.youtube.com/embed/${ytId}" 
      frameborder="0" allowfullscreen style="border-radius:8px;"></iframe>`;
  }
  return `<video controls playsinline webkit-playsinline style="border-radius:8px;max-height:200px;">
    <source src="${url}" type="video/mp4">
    Tu navegador no soporta vídeo HTML5.
  </video>`;
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ── API ─────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (res.status === 204) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    throw e;
  }
}

async function loadMembers() {
  const res = await apiFetch(`tables/${TABLE_MEMBERS}?limit=200`);
  allMembers = res.data || [];
  return allMembers;
}

async function loadComments() {
  const res = await apiFetch(`tables/${TABLE_COMMENTS}?limit=200`);
  allComments = res.data || [];
  return allComments;
}

// ── SECCIONES ───────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btns = document.querySelectorAll('.nav-btn');
  const map = { tree: 0, members: 1, comments: 2 };
  if (map[name] !== undefined) btns[map[name]].classList.add('active');

  if (name === 'tree')     renderTree();
  if (name === 'members')  renderMembersGrid();
  if (name === 'comments') renderComments();
}

// ══════════════════════════════════════════════════════════════
// ÁRBOL GENEALÓGICO
// ══════════════════════════════════════════════════════════════

function renderTree() {
  const canvas = document.getElementById('tree-canvas');
  canvas.innerHTML = '';

  if (allMembers.length === 0) {
    canvas.innerHTML = `<div class="empty-state" style="padding-top:120px;">
      <div class="empty-state-icon">🌱</div>
      <p>Aún no hay miembros en el árbol.</p>
      <button class="btn-primary" onclick="openAddMemberModal()"><i class="fas fa-plus"></i> Añadir primer miembro</button>
    </div>`;
    return;
  }

  // Agrupar por generación
  const byGen = {};
  allMembers.forEach(m => {
    const g = m.generation ?? 1;
    if (!byGen[g]) byGen[g] = [];
    byGen[g].push(m);
  });

  const gens = Object.keys(byGen).map(Number).sort((a, b) => a - b);

  const NODE_W  = 140;
  const NODE_H  = 130;
  const H_GAP   = 30;
  const V_GAP   = 80;
  const PADDING = 60;

  // Calcular máximo ancho
  const maxInRow = Math.max(...gens.map(g => byGen[g].length));
  const totalW = Math.max(maxInRow * (NODE_W + H_GAP) + PADDING * 2, 900);
  const totalH = gens.length * (NODE_H + V_GAP) + PADDING * 2;

  canvas.style.minWidth  = `${totalW}px`;
  canvas.style.minHeight = `${totalH}px`;

  // SVG para líneas
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tree-svg');
  svg.setAttribute('width', totalW);
  svg.setAttribute('height', totalH);
  canvas.appendChild(svg);

  const nodePositions = {}; // id -> {cx, cy}

  gens.forEach((gen, genIdx) => {
    const members = byGen[gen];
    const rowY    = PADDING + genIdx * (NODE_H + V_GAP);
    const rowW    = members.length * (NODE_W + H_GAP) - H_GAP;
    const startX  = (totalW - rowW) / 2;

    // Etiqueta de generación
    const label = document.createElement('div');
    label.className = 'generation-label';
    label.style.top  = `${rowY + NODE_H / 2 - 10}px`;
    label.textContent = GEN_LABELS[String(gen)] || `Generación ${gen}`;
    canvas.appendChild(label);

    members.forEach((member, idx) => {
      const x = startX + idx * (NODE_W + H_GAP);
      const y = rowY;
      const cx = x + NODE_W / 2;
      const cy = y + NODE_H / 2;
      nodePositions[member.id] = { cx, cy, x, y, w: NODE_W, h: NODE_H };
      canvas.appendChild(buildTreeNode(member, x, y));
    });
  });

  // Dibujar conexiones
  drawConnections(svg, nodePositions);
}

function buildTreeNode(member, x, y) {
  const node = document.createElement('div');
  node.className = 'tree-node';
  node.style.left = `${x}px`;
  node.style.top  = `${y}px`;
  node.style.width = '130px';
  node.onclick = () => openMemberProfile(member.id);

  const isDeceased = member.death_year && member.death_year !== '';
  const genderClass = member.gender || 'other';

  let avatarHTML;
  if (member.photo_url) {
    avatarHTML = `<img class="node-photo" src="${member.photo_url}" alt="${member.name}" 
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <div class="node-avatar ${genderClass}" style="display:none;">${getInitials(member.name)}</div>`;
  } else {
    avatarHTML = `<div class="node-avatar ${genderClass}">${getInitials(member.name)}</div>`;
  }

  const hasVideo = member.video_url;
  const hasAudio = member.audio_url;
  const mediaIcons = `
    ${hasVideo ? '<span class="media-icon video"><i class="fas fa-video"></i></span>' : ''}
    ${hasAudio ? '<span class="media-icon audio"><i class="fas fa-microphone"></i></span>' : ''}
  `;

  node.innerHTML = `
    <div class="node-card ${genderClass} ${isDeceased ? 'deceased' : ''}">
      ${avatarHTML}
      <div class="node-name">${member.name}</div>
      <div class="node-years">${formatYears(member.birth_year, member.death_year)}</div>
      <div class="node-media-icons">${mediaIcons}</div>
    </div>
  `;

  return node;
}

function drawConnections(svg, positions) {
  // Parejas: conectar horizontalmente
  const drawn = new Set();
  allMembers.forEach(m => {
    if (m.partner_id && !drawn.has(`${m.id}-${m.partner_id}`) && !drawn.has(`${m.partner_id}-${m.id}`)) {
      const posA = positions[m.id];
      const posB = positions[m.partner_id];
      if (posA && posB) {
        drawn.add(`${m.id}-${m.partner_id}`);
        const x1 = Math.min(posA.cx, posB.cx);
        const x2 = Math.max(posA.cx, posB.cx);
        const y  = (posA.cy + posB.cy) / 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connector-couple');
        path.setAttribute('d', `M ${posA.cx} ${posA.cy} H ${posB.cx}`);
        svg.appendChild(path);

        // Corazón entre ellos
        const heartX = (posA.cx + posB.cx) / 2;
        const heartY = y;
        const heart = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        heart.setAttribute('x', heartX);
        heart.setAttribute('y', heartY + 5);
        heart.setAttribute('text-anchor', 'middle');
        heart.setAttribute('class', 'connector-heart');
        heart.textContent = '♥';
        svg.appendChild(heart);
      }
    }
  });

  // Descendencia: línea de padres a hijos
  allMembers.forEach(child => {
    const parentIds = Array.isArray(child.parent_ids) ? child.parent_ids : [];
    parentIds.forEach(pid => {
      const posParent = positions[pid];
      const posChild  = positions[child.id];
      if (posParent && posChild) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connector-child');
        const mx = posParent.cx;
        const my = posParent.cy + 65;
        path.setAttribute('d',
          `M ${posParent.cx} ${posParent.cy + 65} 
           V ${(posParent.cy + posChild.cy) / 2}
           H ${posChild.cx}
           V ${posChild.cy - 65}`
        );
        svg.appendChild(path);
      }
    });
  });
}

// ── ZOOM ────────────────────────────────────────────────────
function zoomIn()    { applyZoom(Math.min(currentZoom + 0.15, 2.5)); }
function zoomOut()   { applyZoom(Math.max(currentZoom - 0.15, 0.35)); }
function resetZoom() { applyZoom(1); }

function applyZoom(z) {
  currentZoom = parseFloat(z.toFixed(2));
  document.getElementById('tree-canvas').style.transform = `scale(${currentZoom})`;
  document.getElementById('zoom-label').textContent = `${Math.round(currentZoom * 100)}%`;
}

// ── DRAG TO PAN ─────────────────────────────────────────────
(function initDrag() {
  let dragging = false, startX, startY, scrollLeft, scrollTop;
  document.addEventListener('DOMContentLoaded', () => {
    const vp = document.getElementById('tree-viewport');
    if (!vp) return;
    vp.addEventListener('mousedown', e => {
      dragging = true;
      startX = e.pageX - vp.offsetLeft;
      startY = e.pageY - vp.offsetTop;
      scrollLeft = vp.scrollLeft;
      scrollTop  = vp.scrollTop;
    });
    vp.addEventListener('mouseleave', () => dragging = false);
    vp.addEventListener('mouseup',   () => dragging = false);
    vp.addEventListener('mousemove', e => {
      if (!dragging) return;
      e.preventDefault();
      const x = e.pageX - vp.offsetLeft;
      const y = e.pageY - vp.offsetTop;
      vp.scrollLeft = scrollLeft - (x - startX);
      vp.scrollTop  = scrollTop  - (y - startY);
    });
  });
})();

// ══════════════════════════════════════════════════════════════
// LISTA DE MIEMBROS
// ══════════════════════════════════════════════════════════════

function renderMembersGrid(members = allMembers) {
  const grid = document.getElementById('members-grid');
  if (members.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon">👨‍👩‍👧‍👦</div>
      <p>No se encontraron miembros. ¡Añade el primero!</p>
      <button class="btn-primary" onclick="openAddMemberModal()"><i class="fas fa-plus"></i> Añadir miembro</button>
    </div>`;
    return;
  }

  grid.innerHTML = members.map(m => buildMemberCard(m)).join('');
}

function buildMemberCard(m) {
  const isDeceased = m.death_year && m.death_year !== '';
  const gClass = m.gender || 'other';
  const initials = getInitials(m.name);

  let avatarInner;
  if (m.photo_url) {
    avatarInner = `<img src="${m.photo_url}" alt="${m.name}" 
      onerror="this.parentElement.innerHTML='${initials}';" />`;
  } else {
    avatarInner = initials;
  }

  const tags = Array.isArray(m.tags) ? m.tags : (m.tags ? String(m.tags).split(',').map(t => t.trim()) : []);
  const tagsHTML = tags.filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('');

  const commentCount = allComments.filter(c => c.member_id === m.id).length;
  const genLabel = GEN_LABELS[String(m.generation ?? 1)] || `Gen ${m.generation}`;

  return `<div class="member-card ${gClass}" onclick="openMemberProfile('${m.id}')">
    <div class="member-card-header">
      <div class="member-card-avatar ${gClass}">${avatarInner}</div>
      <div>
        <div class="member-card-name">${m.name}</div>
        <div class="member-card-years">
          ${formatYears(m.birth_year, m.death_year)}
          ${isDeceased ? ' <i class="fas fa-cross" style="font-size:0.65rem;color:#78909c;"></i>' : ''}
        </div>
        <div class="member-card-years" style="margin-top:2px;">📍 ${m.birth_place || '—'}</div>
      </div>
    </div>
    ${m.biography ? `<div class="member-card-bio">${m.biography}</div>` : ''}
    ${tagsHTML ? `<div class="member-card-tags">${tagsHTML}</div>` : ''}
    <div class="member-card-footer">
      <div class="media-badges">
        ${m.video_url ? '<span class="media-badge video"><i class="fas fa-video"></i> Vídeo</span>' : ''}
        ${m.audio_url ? '<span class="media-badge audio"><i class="fas fa-microphone"></i> Audio</span>' : ''}
        ${commentCount > 0 ? `<span class="media-badge" style="background:#f3e5f5;color:#6a1b9a;">💬 ${commentCount}</span>` : ''}
      </div>
      <div class="card-action-btns" onclick="event.stopPropagation()">
        <button class="card-action-btn edit" onclick="openEditMember('${m.id}')"><i class="fas fa-edit"></i></button>
        <button class="card-action-btn delete" onclick="deleteMember('${m.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  </div>`;
}

const filterMembers = debounce(() => {
  const q = document.getElementById('search-members').value.toLowerCase();
  const filtered = q
    ? allMembers.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.biography || '').toLowerCase().includes(q) ||
        (m.birth_place || '').toLowerCase().includes(q) ||
        (Array.isArray(m.tags) ? m.tags.join(' ') : (m.tags || '')).toLowerCase().includes(q)
      )
    : allMembers;
  renderMembersGrid(filtered);
}, 250);

// ══════════════════════════════════════════════════════════════
// PERFIL DE MIEMBRO
// ══════════════════════════════════════════════════════════════

function openMemberProfile(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;

  const gClass = m.gender || 'other';
  const isDeceased = m.death_year && m.death_year !== '';
  const tags = Array.isArray(m.tags) ? m.tags : (m.tags ? String(m.tags).split(',').map(t => t.trim()) : []);
  const memberComments = allComments.filter(c => c.member_id === id);

  let avatarHTML;
  if (m.photo_url) {
    avatarHTML = `<div class="profile-avatar-lg ${gClass}">
      <img src="${m.photo_url}" alt="${m.name}" onerror="this.parentElement.innerHTML='${getInitials(m.name)}';" />
    </div>`;
  } else {
    avatarHTML = `<div class="profile-avatar-lg ${gClass}">${getInitials(m.name)}</div>`;
  }

  // Construir bloque de media
  let mediaHTML = '';
  if (m.photo_url || m.video_url || m.audio_url) {
    mediaHTML = `<div class="profile-media">`;
    if (m.photo_url) {
      mediaHTML += `<div class="media-block">
        <div class="media-block-title"><i class="fas fa-image"></i> Fotografía</div>
        <img src="${m.photo_url}" alt="${m.name}" />
      </div>`;
    }
    if (m.video_url) {
      mediaHTML += `<div class="media-block">
        <div class="media-block-title"><i class="fas fa-video"></i> Vídeo</div>
        ${buildVideoEmbed(m.video_url)}
      </div>`;
    }
    if (m.audio_url) {
      mediaHTML += `<div class="media-block">
        <div class="media-block-title"><i class="fas fa-microphone"></i> Audio / Grabación</div>
        <audio controls style="width:100%;margin-top:0.5rem;">
          <source src="${m.audio_url}" />
          Tu navegador no soporta audio HTML5.
        </audio>
      </div>`;
    }
    mediaHTML += `</div>`;
  }

  // Comentarios relacionados
  let commentsHTML = '';
  if (memberComments.length > 0) {
    commentsHTML = `<div class="profile-comments">
      <div class="profile-comments-title"><i class="fas fa-comments"></i> Comentarios relacionados (${memberComments.length})</div>
      ${memberComments.map(c => `
        <div class="profile-comment-mini" style="border-left-color:${c.type === 'question' ? '#f9a825' : c.type === 'correction' ? '#e53935' : '#5c6bc0'};">
          <strong>${c.author}:</strong> ${c.content}
          ${c.reply ? `<div style="margin-top:4px;color:#2e7d32;font-size:0.8rem;">↩ ${c.reply}</div>` : ''}
        </div>`).join('')}
    </div>`;
  }

  document.getElementById('profile-modal-content').innerHTML = `
    <div class="profile-top">
      ${avatarHTML}
      <div class="profile-info">
        <div class="profile-name">${m.name} ${isDeceased ? '<span style="font-size:0.7rem;color:#78909c;">(†)</span>' : ''}</div>
        <div class="profile-tags">
          ${tags.filter(Boolean).map(t => `<span class="tag">${t}</span>`).join('')}
          <span class="tag" style="background:#e8eaf6;">${GEN_LABELS[String(m.generation ?? 1)] || 'Sin generación'}</span>
        </div>
        <div class="profile-meta">
          ${m.birth_year ? `<div class="profile-meta-item"><i class="fas fa-birthday-cake"></i> Nacimiento: <strong>${m.birth_year}</strong>${m.birth_place ? ` — ${m.birth_place}` : ''}</div>` : ''}
          ${m.death_year ? `<div class="profile-meta-item"><i class="fas fa-cross"></i> Fallecimiento: <strong>${m.death_year}</strong></div>` : ''}
          ${m.gender     ? `<div class="profile-meta-item"><i class="fas fa-venus-mars"></i> Género: <strong>${m.gender === 'male' ? 'Hombre' : m.gender === 'female' ? 'Mujer' : 'Otro'}</strong></div>` : ''}
        </div>
      </div>
    </div>
    ${m.biography ? `<div class="profile-bio">
      <div class="profile-bio-title"><i class="fas fa-book-open"></i> Biografía</div>
      ${m.biography}
    </div>` : ''}
    ${mediaHTML}
    ${commentsHTML}
    <div class="profile-actions">
      <button class="btn-primary" onclick="openEditMember('${m.id}'); closeModal('modal-member-profile');">
        <i class="fas fa-edit"></i> Editar
      </button>
      <button class="btn-secondary" onclick="openCommentModal('${m.id}'); closeModal('modal-member-profile');">
        <i class="fas fa-comment-plus"></i> Añadir comentario
      </button>
      <button class="btn-danger" onclick="deleteMember('${m.id}'); closeModal('modal-member-profile');">
        <i class="fas fa-trash"></i> Eliminar
      </button>
    </div>
  `;

  openModal('modal-member-profile');
}

// ══════════════════════════════════════════════════════════════
// AÑADIR / EDITAR MIEMBRO
// ══════════════════════════════════════════════════════════════

function openAddMemberModal() {
  editingMemberId = null;
  document.getElementById('modal-add-title').innerHTML = '<i class="fas fa-user-plus"></i> Añadir Miembro';
  document.getElementById('form-add-member').reset();
  document.getElementById('fm-edit-id').value = '';
  openModal('modal-add-member');
}

function openEditMember(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;
  editingMemberId = id;

  document.getElementById('modal-add-title').innerHTML = '<i class="fas fa-user-edit"></i> Editar Miembro';
  document.getElementById('fm-name').value      = m.name || '';
  document.getElementById('fm-gender').value    = m.gender || '';
  document.getElementById('fm-generation').value = String(m.generation ?? 1);
  document.getElementById('fm-birth').value     = m.birth_year || '';
  document.getElementById('fm-death').value     = m.death_year || '';
  document.getElementById('fm-birthplace').value = m.birth_place || '';
  document.getElementById('fm-photo').value     = m.photo_url || '';
  document.getElementById('fm-video').value     = m.video_url || '';
  document.getElementById('fm-audio').value     = m.audio_url || '';
  document.getElementById('fm-biography').value = m.biography || '';
  const tags = Array.isArray(m.tags) ? m.tags.join(', ') : (m.tags || '');
  document.getElementById('fm-tags').value      = tags;
  document.getElementById('fm-edit-id').value   = id;

  openModal('modal-add-member');
}

async function saveMember(e) {
  e.preventDefault();
  const tagsRaw = document.getElementById('fm-tags').value;
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const data = {
    name:        document.getElementById('fm-name').value.trim(),
    gender:      document.getElementById('fm-gender').value,
    generation:  parseInt(document.getElementById('fm-generation').value),
    birth_year:  document.getElementById('fm-birth').value,
    death_year:  document.getElementById('fm-death').value,
    birth_place: document.getElementById('fm-birthplace').value.trim(),
    photo_url:   document.getElementById('fm-photo').value.trim(),
    video_url:   document.getElementById('fm-video').value.trim(),
    audio_url:   document.getElementById('fm-audio').value.trim(),
    biography:   document.getElementById('fm-biography').value.trim(),
    tags,
    parent_ids:  [],
    partner_id:  '',
  };

  try {
    if (editingMemberId) {
      await apiFetch(`tables/${TABLE_MEMBERS}/${editingMemberId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      showToast(`✅ "${data.name}" actualizado correctamente`);
    } else {
      await apiFetch(`tables/${TABLE_MEMBERS}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      showToast(`✅ "${data.name}" añadido al árbol`);
    }

    closeModal('modal-add-member');
    await loadMembers();
    renderTree();
    renderMembersGrid();
  } catch (err) {
    showToast('❌ Error al guardar. Inténtalo de nuevo.', 'error');
  }
}

async function deleteMember(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;
  if (!confirm(`¿Eliminar a "${m.name}" del árbol genealógico? Esta acción no se puede deshacer.`)) return;

  try {
    await apiFetch(`tables/${TABLE_MEMBERS}/${id}`, { method: 'DELETE' });
    showToast(`🗑️ "${m.name}" eliminado`);
    await loadMembers();
    renderTree();
    renderMembersGrid();
    renderComments();
  } catch (err) {
    showToast('❌ Error al eliminar.', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// COMENTARIOS Y DUDAS
// ══════════════════════════════════════════════════════════════

function renderComments(filter = activeFilter) {
  activeFilter = filter;
  const list = document.getElementById('comments-list');

  let filtered = allComments;
  if (filter === 'question')   filtered = allComments.filter(c => c.type === 'question');
  if (filter === 'comment')    filtered = allComments.filter(c => c.type === 'comment');
  if (filter === 'correction') filtered = allComments.filter(c => c.type === 'correction');
  if (filter === 'pending')    filtered = allComments.filter(c => c.status === 'pending' || !c.status);
  if (filter === 'answered')   filtered = allComments.filter(c => c.status === 'answered' || c.status === 'verified');

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">💬</div>
      <p>No hay comentarios en esta categoría aún.</p>
      <button class="btn-primary" onclick="openCommentModal()"><i class="fas fa-plus"></i> Añadir comentario</button>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(c => buildCommentCard(c)).join('');
}

function buildCommentCard(c) {
  const typeLabel = { comment: '💬 Comentario', question: '❓ Duda', correction: '✏️ Corrección' };
  const statusLabel = { pending: 'Pendiente', answered: 'Respondido', verified: 'Verificado' };
  const memberName = c.member_id ? (allMembers.find(m => m.id === c.member_id)?.name || '') : '';
  const date = c.created_at ? new Date(c.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const status = c.status || 'pending';

  return `<div class="comment-card ${c.type || 'comment'}">
    <div class="comment-header">
      <div class="comment-meta">
        <div class="comment-author">
          <div class="comment-author-icon">${getInitials(c.author || '?')}</div>
          ${c.author || 'Anónimo'}
        </div>
        <span class="comment-type-badge ${c.type || 'comment'}">${typeLabel[c.type] || '💬 Comentario'}</span>
        <span class="comment-status-badge ${status}">${statusLabel[status] || 'Pendiente'}</span>
        ${memberName ? `<span class="comment-member-tag"><i class="fas fa-user"></i> ${memberName}</span>` : ''}
      </div>
      <span class="comment-date"><i class="fas fa-clock"></i> ${date}</span>
    </div>
    <div class="comment-content">${c.content || ''}</div>
    ${c.reply ? `<div class="comment-reply-box">
      <div class="reply-label"><i class="fas fa-reply"></i> Respuesta</div>
      <div class="reply-text">${c.reply}</div>
    </div>` : ''}
    <div class="comment-actions">
      ${!c.reply ? `<button class="comment-action-btn" onclick="openReplyModal('${c.id}')">
        <i class="fas fa-reply"></i> Responder
      </button>` : ''}
      ${status === 'pending' ? `<button class="comment-action-btn" onclick="markAnswered('${c.id}')">
        <i class="fas fa-check"></i> Marcar respondido
      </button>` : ''}
      <button class="comment-action-btn delete-btn" onclick="deleteComment('${c.id}')">
        <i class="fas fa-trash"></i> Eliminar
      </button>
    </div>
  </div>`;
}

function filterComments(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderComments(type);
}

// ─ Abrir modal comentario ──────────────────────────────────
function openCommentModal(memberId = '') {
  document.getElementById('form-comment').reset();

  // Rellenar select de miembros
  const sel = document.getElementById('fc-member');
  sel.innerHTML = '<option value="">-- General (sin miembro específico) --</option>';
  allMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    if (m.id === memberId) opt.selected = true;
    sel.appendChild(opt);
  });
  if (memberId) sel.value = memberId;

  openModal('modal-comment');
}

async function saveComment(e) {
  e.preventDefault();
  const data = {
    author:    document.getElementById('fc-author').value.trim(),
    type:      document.getElementById('fc-type').value,
    member_id: document.getElementById('fc-member').value,
    content:   document.getElementById('fc-content').value.trim(),
    status:    'pending',
    reply:     '',
  };

  try {
    await apiFetch(`tables/${TABLE_COMMENTS}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    showToast('✅ Comentario enviado correctamente');
    closeModal('modal-comment');
    await loadComments();
    renderComments(activeFilter);
  } catch (err) {
    showToast('❌ Error al enviar el comentario.', 'error');
  }
}

// ─ Responder comentario ────────────────────────────────────
function openReplyModal(commentId) {
  const c = allComments.find(x => x.id === commentId);
  if (!c) return;
  document.getElementById('fr-comment-id').value = commentId;
  document.getElementById('fr-reply').value = c.reply || '';
  document.getElementById('reply-original').innerHTML = `
    <strong>${c.author}:</strong> ${c.content}
  `;
  openModal('modal-reply');
}

async function saveReply(e) {
  e.preventDefault();
  const id    = document.getElementById('fr-comment-id').value;
  const reply = document.getElementById('fr-reply').value.trim();

  try {
    await apiFetch(`tables/${TABLE_COMMENTS}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ reply, status: 'answered' }),
    });
    showToast('✅ Respuesta guardada');
    closeModal('modal-reply');
    await loadComments();
    renderComments(activeFilter);
  } catch (err) {
    showToast('❌ Error al guardar la respuesta.', 'error');
  }
}

async function markAnswered(id) {
  try {
    await apiFetch(`tables/${TABLE_COMMENTS}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'answered' }),
    });
    showToast('✅ Marcado como respondido');
    await loadComments();
    renderComments(activeFilter);
  } catch (err) {
    showToast('❌ Error al actualizar.', 'error');
  }
}

async function deleteComment(id) {
  if (!confirm('¿Eliminar este comentario? No se puede deshacer.')) return;
  try {
    await apiFetch(`tables/${TABLE_COMMENTS}/${id}`, { method: 'DELETE' });
    showToast('🗑️ Comentario eliminado');
    await loadComments();
    renderComments(activeFilter);
  } catch (err) {
    showToast('❌ Error al eliminar.', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// MODALES
// ══════════════════════════════════════════════════════════════

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

// Cerrar con ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════

async function init() {
  try {
    await Promise.all([loadMembers(), loadComments()]);
    renderTree();
  } catch (err) {
    console.error('Error al inicializar:', err);
    showToast('⚠️ Error al cargar los datos. Verifica tu conexión.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', init);
