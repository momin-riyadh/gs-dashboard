/* ==========================================================================
   Genuity ADMIN — hydrate.js
   Every page now OWNS its full markup (chrome + content) as static HTML. This
   module does NOT build layout; it only pours JSON data into that markup:

   1. Fills the chrome's dynamic lists from the shared config JSON
      (assets/data/nav.json, notifications.json, messages.json,
      profile-menu.json, themes.json).
   2. Hydrates the page's own content skeleton from the JSON declared on
      <main id="nxPageContent" data-nx-data="assets/data/pages/<id>.json">,
      using the declarative data-nx-* attributes documented below.
   3. Wires up all interactivity (sidebar collapse, hover flyout, mobile
      drawer, the two theme switchers, dropdowns) and the theme engine.

   ---- Declarative binding directives (used in the static HTML) --------------
   Paths resolve against the current data scope (page JSON at the top level,
   or the current item inside a data-nx-list). "." means the scope itself.
   A path may end in "|transform" to run a registered transform (see TRANSFORMS).

   data-nx-text="path"        textContent = value
   data-nx-html="path"        innerHTML   = value
   data-nx-attr="a=path,b=p2" set attributes a, b (skipped when value is null)
   data-nx-classtpl="a-{p} b" add classes; {p} is interpolated, and any token
                              whose {p} resolves empty is dropped entirely
   data-nx-flag="cls=path"    add cls when path is truthy
   data-nx-if="path"          drop this element unless path is truthy
   data-nx-ifnot="path"       drop this element when path is truthy
   data-nx-list="path"        repeat the single child <template> per array item
   data-nx-widget="name"      hand element to a widget (cells/calendar/
                              formfield/breadcrumb/searchgroups) for the few
                              genuinely polymorphic pieces

   NOTE: fetch() of local JSON requires http(s) — run `npm run dev` (Vite),
   don't open the files from disk (file://).
   ========================================================================== */
export async function initGenuityAdmin() {
  const STORAGE = {
    mode: 'nx-theme-mode',
    theme: 'nx-theme-preset',
    collapsed: 'nx-sidebar-collapsed'
  };

  const html = document.documentElement;
  const pageContentElement = document.getElementById('nxPageContent');

  function currentPageName() {
    const pageFromPath = window.location.pathname.split('/').pop();
    return pageFromPath || 'index.html';
  }

  const activePage = currentPageName();
  const pageDataUrl = (pageContentElement && pageContentElement.dataset.nxData) ||
    `assets/data/pages/${(activePage.replace(/\.html$/, '') || 'index')}.json`;
  const switcherMode = (pageContentElement && pageContentElement.dataset.nxSwitcher) || 'full';

  /* ---------- FETCH: all data lives isolated under assets/data/ -------------- */
  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch ' + url + ' (' + res.status + ')');
    return res.json();
  }

  function renderFatalError(err) {
    const target = pageContentElement || document.body;
    target.innerHTML = `
      <div style="max-width:580px;margin:8vh auto;padding:2.5rem;font-family:'Inter',system-ui,sans-serif;text-align:center;color:#4B5163">
        <div style="width:56px;height:56px;border-radius:14px;background:#FDECEC;color:#F5484B;display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;margin-bottom:1.25rem;">
          <i class="bi bi-exclamation-triangle"></i>
        </div>
        <h2 style="font-family:'Plus Jakarta Sans',sans-serif;color:#1E2129;margin-bottom:.6rem;">Couldn't load page data</h2>
        <p style="margin-bottom:1rem;">This theme loads its content from JSON files in <code>assets/data/</code>. Most browsers block that when a page is opened directly from disk (the <code>file://</code> address bar).</p>
        <p style="margin-bottom:.5rem;">Serve this folder through Vite instead:</p>
        <pre style="background:#F5F6FA;padding:1rem;border-radius:10px;text-align:left;overflow:auto;font-size:.85rem;">npm install\nnpm run dev</pre>
        <p>then open the local URL printed by Vite.</p>
      </div>`;
    console.error(err);
  }

  let pageData;
  try {
    const [nav, themes, notifications, messages, profileMenu, page] = await Promise.all([
      fetchJSON('assets/data/nav.json'),
      fetchJSON('assets/data/themes.json'),
      fetchJSON('assets/data/notifications.json'),
      fetchJSON('assets/data/messages.json'),
      fetchJSON('assets/data/profile-menu.json'),
      fetchJSON(pageDataUrl)
    ]);
    window.NX_NAV = nav;
    window.NX_THEMES = themes;
    window.NX_NOTIFICATIONS = notifications;
    window.NX_MESSAGES = messages;
    window.NX_PROFILE_MENU = profileMenu;
    pageData = page;
  } catch (err) {
    renderFatalError(err);
    return;
  }

  /* ====================================================================== */
  /*  DECLARATIVE BINDER                                                     */
  /* ====================================================================== */
  const TRANSFORMS = {
    // App/integration cards: map a free-text status to a badge tone.
    statusTone: (v) => (v === 'Connected' ? 'success' : 'warning'),
    // Calendar "upcoming" dots: build the inline background from a tone name.
    toneVar: (v) => `background:var(--tone-${v}-fg)`
  };

  function str(v) { return v == null ? '' : String(v); }
  function truthy(v) { return Array.isArray(v) ? v.length > 0 : !!v; }

  function resolve(scope, rawPath) {
    let path = rawPath.trim();
    let transform = null;
    const pipe = path.indexOf('|');
    if (pipe !== -1) {
      transform = path.slice(pipe + 1).trim();
      path = path.slice(0, pipe).trim();
    }
    let val = scope;
    if (path && path !== '.') {
      for (const key of path.split('.')) {
        if (val == null) { val = undefined; break; }
        val = val[key];
      }
    }
    if (transform && TRANSFORMS[transform]) val = TRANSFORMS[transform](val, scope);
    return val;
  }

  function applyValueDirectives(el, scope) {
    if (el.hasAttribute('data-nx-text')) el.textContent = str(resolve(scope, el.getAttribute('data-nx-text')));
    if (el.hasAttribute('data-nx-html')) el.innerHTML = str(resolve(scope, el.getAttribute('data-nx-html')));
    if (el.hasAttribute('data-nx-attr')) {
      el.getAttribute('data-nx-attr').split(',').forEach(pair => {
        const eq = pair.indexOf('=');
        if (eq === -1) return;
        const name = pair.slice(0, eq).trim();
        const val = resolve(scope, pair.slice(eq + 1));
        if (val != null && val !== '') el.setAttribute(name, str(val));
      });
    }
    if (el.hasAttribute('data-nx-classtpl')) {
      el.getAttribute('data-nx-classtpl').split(/\s+/).filter(Boolean).forEach(token => {
        let ok = true;
        const cls = token.replace(/\{([^}]+)\}/g, (_, p) => {
          const v = resolve(scope, p);
          if (v == null || v === '') { ok = false; return ''; }
          return String(v);
        });
        if (ok && cls) el.classList.add(cls);
      });
    }
    if (el.hasAttribute('data-nx-flag')) {
      el.getAttribute('data-nx-flag').split(',').forEach(pair => {
        const eq = pair.indexOf('=');
        if (eq === -1) return;
        if (truthy(resolve(scope, pair.slice(eq + 1)))) el.classList.add(pair.slice(0, eq).trim());
      });
    }
  }

  function hydrateEl(el, scope) {
    if (el.hasAttribute('data-nx-if') && !truthy(resolve(scope, el.getAttribute('data-nx-if')))) { el.remove(); return; }
    if (el.hasAttribute('data-nx-ifnot') && truthy(resolve(scope, el.getAttribute('data-nx-ifnot')))) { el.remove(); return; }

    applyValueDirectives(el, scope);

    if (el.hasAttribute('data-nx-list')) { expandList(el, scope); return; }
    if (el.hasAttribute('data-nx-widget')) {
      const w = WIDGETS[el.getAttribute('data-nx-widget')];
      if (w) w(el, scope);
      return;
    }
    Array.from(el.children).forEach(child => hydrateEl(child, scope));
  }

  function expandList(el, scope) {
    const arr = resolve(scope, el.getAttribute('data-nx-list'));
    const items = Array.isArray(arr) ? arr : [];
    const tpl = el.querySelector(':scope > template');
    const frag = document.createDocumentFragment();
    if (tpl) {
      items.forEach(item => {
        const clone = tpl.content.cloneNode(true);
        Array.from(clone.children).forEach(child => hydrateEl(child, item));
        frag.appendChild(clone);
      });
    }
    el.innerHTML = '';
    el.appendChild(frag);
  }

  function esc(s) { return String(s == null ? '' : s); }

  /* ---------- WIDGETS: the few genuinely polymorphic pieces --------------- */
  function cellHTML(cell) {
    if (cell == null) return '<td></td>';
    if (typeof cell === 'string' || typeof cell === 'number') return `<td>${esc(cell)}</td>`;
    if (cell.badge) return `<td><span class="nx-badge tone-${esc(cell.tone)}">${esc(cell.badge)}</span></td>`;
    if (cell.avatar) return `<td><div class="nx-avatar-cell"><span class="nx-avatar-sm">${esc(cell.avatar)}</span><div><div>${esc(cell.name)}</div><div class="nx-avatar-cell-sub">${esc(cell.sub)}</div></div></div></td>`;
    if (cell.icon) return `<td><button class="nx-row-icon-btn"><i class="bi ${esc(cell.icon)}"></i></button></td>`;
    return '<td></td>';
  }

  function fieldHTML(f) {
    if (f.type === 'textarea') return `<div class="nx-form-row"><label>${esc(f.label)}</label><textarea class="form-control" rows="3">${esc(f.value)}</textarea></div>`;
    if (f.type === 'select') return `<div class="nx-form-row"><label>${esc(f.label)}</label><select class="form-select">${(f.options || []).map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
    if (f.type === 'switch') return `<div class="nx-form-switch-row"><span style="font-size:.875rem;font-weight:600;color:var(--nx-ink)">${esc(f.label)}</span><div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" role="switch" ${f.checked ? 'checked' : ''}></div></div>`;
    if (f.type === 'checkbox') return `<div class="nx-form-switch-row"><span style="font-size:.875rem;font-weight:600;color:var(--nx-ink)">${esc(f.label)}</span><div class="form-check mb-0"><input class="form-check-input" type="checkbox" ${f.checked ? 'checked' : ''}></div></div>`;
    return `<div class="nx-form-row"><label>${esc(f.label)}</label><input class="form-control" type="${esc(f.type)}" value="${esc(f.value)}"></div>`;
  }

  const WIDGETS = {
    // <tr> whose scope is a row { cells:[...] } of heterogeneous cells.
    cells(el, scope) {
      el.innerHTML = (scope.cells || []).map(cellHTML).join('');
    },
    // <div class="nx-calendar-grid"> — scope is the page (weekdays/grid/today).
    calendar(el, scope) {
      const weekdays = (scope.weekdays || []).map(w => `<div class="nx-calendar-weekday">${esc(w)}</div>`).join('');
      const cells = (scope.grid || []).map(week => week.map(day => {
        if (day.date == null) return `<div class="nx-calendar-day is-empty"></div>`;
        const isToday = day.date === scope.today;
        const events = (day.events || []).map(e => `<div class="nx-calendar-event tone-${esc(e.tone)}">${esc(e.title)}</div>`).join('');
        return `<div class="nx-calendar-day ${isToday ? 'is-today' : ''}"><span class="nx-calendar-daynum">${day.date}</span>${events}</div>`;
      }).join('')).join('');
      el.innerHTML = weekdays + cells;
    },
    // placeholder replaced by the correct field control for scope (a field obj).
    formfield(el, scope) {
      el.replaceWith(document.createRange().createContextualFragment(fieldHTML(scope)));
    },
    // <nav class="nx-breadcrumb"> — scope.breadcrumbs is an array of crumbs.
    breadcrumb(el, scope) {
      const crumbs = scope.breadcrumbs || [];
      el.innerHTML = crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        if (isLast || !c.href) return `<span class="${isLast ? 'active' : ''}">${esc(c.label)}</span>`;
        return `<a href="${esc(c.href)}">${esc(c.label)}</a>`;
      }).join(' <i class="bi bi-chevron-right mx-1" style="font-size:.6rem"></i> ');
    },
    // <ul class="dropdown-menu"> — scope.panel.search.groups (grouped links).
    searchgroups(el, scope) {
      const groups = (scope.panel && scope.panel.search && scope.panel.search.groups) || [];
      el.innerHTML = groups.map(g => `
        <li><h6 class="dropdown-header">${esc(g.label)}</h6></li>
        ${g.items.map(it => `<li><a class="dropdown-item" href="${esc(it.href)}"><i class="bi ${esc(it.icon)} me-2"></i>${esc(it.label)}</a></li>`).join('')}
      `).join('<li><hr class="dropdown-divider"></li>');
    }
  };

  /* ====================================================================== */
  /*  CHROME: fill the static shell's dynamic lists from shared JSON         */
  /* ====================================================================== */
  function hasActiveDescendant(node) {
    if (!node.children) return node.href === activePage;
    return node.children.some(hasActiveDescendant);
  }

  function navItemHTML(item, isTop) {
    const hasChildren = !!item.children;
    const isActiveLeaf = !hasChildren && item.href === activePage;
    const isActiveParent = hasChildren && hasActiveDescendant(item);
    const openClass = isActiveParent ? 'is-open' : '';
    const activeClass = (isActiveLeaf || isActiveParent) ? 'is-active' : '';
    const topAttr = isTop ? `data-nx-item="${item.id}"` : '';

    if (!hasChildren) {
      return `
      <li class="nx-nav-item ${activeClass}" ${topAttr}>
        <a class="nx-nav-link" href="${item.href}">
          <i class="bi ${item.icon}"></i>
          <span class="nx-nav-label">${item.label}</span>
        </a>
      </li>`;
    }
    const subItems = item.children.map(c => navItemHTML(c, false)).join('');
    return `
      <li class="nx-nav-item ${activeClass} ${openClass}" ${topAttr} data-nx-parent="true">
        <a class="nx-nav-link" href="#" data-nx-toggle="true">
          <i class="bi ${item.icon}"></i>
          <span class="nx-nav-label">${item.label}</span>
          <i class="bi bi-chevron-right nx-nav-chevron"></i>
        </a>
        <ul class="nx-submenu">${subItems}</ul>
      </li>`;
  }

  function fillChrome() {
    const navEl = document.getElementById('nxNav');
    if (navEl) navEl.innerHTML = (window.NX_NAV || []).map(item => navItemHTML(item, true)).join('');

    const notifEl = document.getElementById('nxNotifList');
    if (notifEl) notifEl.innerHTML = (window.NX_NOTIFICATIONS || []).map(n => `
      <li class="nx-dropdown-item ${n.unread ? 'is-unread' : ''}">
        <span class="nx-dropdown-icon text-bg-${n.color}"><i class="bi ${n.icon}"></i></span>
        <div class="nx-dropdown-item-body">
          <div class="nx-dropdown-item-title">${esc(n.title)}</div>
          <div class="nx-dropdown-item-text">${esc(n.body)}</div>
        </div>
        <span class="nx-dropdown-time">${esc(n.time)}</span>
      </li>`).join('');

    const msgEl = document.getElementById('nxMsgList');
    if (msgEl) msgEl.innerHTML = (window.NX_MESSAGES || []).map(m => `
      <li class="nx-dropdown-item ${m.unread ? 'is-unread' : ''}">
        <span class="nx-dropdown-avatar">${esc(m.avatar)}</span>
        <div class="nx-dropdown-item-body">
          <div class="nx-dropdown-item-title">${esc(m.name)}</div>
          <div class="nx-dropdown-item-text">${esc(m.body)}</div>
        </div>
        <span class="nx-dropdown-time">${esc(m.time)}</span>
      </li>`).join('');

    const profileEl = document.getElementById('nxProfileLinks');
    if (profileEl) profileEl.innerHTML = (window.NX_PROFILE_MENU || [])
      .map(p => `<a class="nx-dropdown-link" href="${esc(p.href)}"><i class="bi ${esc(p.icon)}"></i><span>${esc(p.label)}</span></a>`).join('');

    const themeCardsEl = document.getElementById('nxThemeCards');
    if (themeCardsEl) themeCardsEl.innerHTML = (window.NX_THEMES || []).map(t => `
      <div class="nx-option-card nx-theme-card" data-nx-value="${t.id}">
        <span class="nx-theme-card-top">
          <span class="nx-theme-swatch" style="background:${t.accent}"></span>
          <span class="nx-theme-card-title">${esc(t.label)}</span>
        </span>
        <span class="nx-theme-card-meta">${esc(t.sidebarLabel || 'Sidebar preset')}</span>
        <span class="nx-theme-card-text">${esc(t.description || '')}</span>
      </div>`).join('');
  }

  /* ====================================================================== */
  /*  THEME ENGINE                                                          */
  /* ====================================================================== */
  function applyMode(mode) {
    if (mode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      html.setAttribute('data-nx-theme', prefersDark ? 'dark' : 'light');
    } else {
      html.setAttribute('data-nx-theme', mode);
    }
    localStorage.setItem(STORAGE.mode, mode);
  }
  function applyAccent(hex) {
    html.style.setProperty('--nx-primary', hex);
    const rgb = hexToRgb(hex);
    html.style.setProperty('--nx-primary-rgb', rgb.join(','));
    html.style.setProperty('--nx-primary-light', hexToTint(hex));
    html.style.setProperty('--nx-primary-dark', hexToShade(hex));
  }
  function applySidebarStyle(style) { html.setAttribute('data-nx-sidebar', style); }
  function hexToRgb(hex) {
    const v = hex.replace('#', '');
    const n = parseInt(v.length === 3 ? v.split('').map(c => c + c).join('') : v, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hexToTint(hex) {
    const [r, g, b] = hexToRgb(hex);
    const mix = c => Math.round(c + (255 - c) * 0.88);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }
  function hexToShade(hex) {
    const [r, g, b] = hexToRgb(hex);
    const mix = c => Math.round(c * 0.82);
    return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
  }
  function applyThemePreset(themeId) {
    const themes = window.NX_THEMES || [];
    const preset = themes.find(t => t.id === themeId) || themes[0];
    if (!preset) return;
    applyAccent(preset.accent || '#0081CE');
    applySidebarStyle(preset.sidebarStyle || 'light');
    localStorage.setItem(STORAGE.theme, preset.id);
  }
  function restoreTheme() {
    applyMode(localStorage.getItem(STORAGE.mode) || 'light');
    const defaultThemeId = (window.NX_THEMES && window.NX_THEMES[0]) ? window.NX_THEMES[0].id : 'default';
    applyThemePreset(localStorage.getItem(STORAGE.theme) || defaultThemeId);
  }

  /* ====================================================================== */
  /*  RUN: fill chrome, hydrate content, restore theme                      */
  /* ====================================================================== */
  fillChrome();
  restoreTheme();
  if (pageContentElement) {
    Array.from(pageContentElement.children).forEach(child => hydrateEl(child, pageData));
  }

  /* ---------- SIDEBAR: collapse / expand ------------------------------------ */
  const sidebar = document.getElementById('nxSidebar');
  const savedCollapsed = localStorage.getItem(STORAGE.collapsed);
  const startCollapsed = savedCollapsed === null ? true : savedCollapsed === 'true'; // collapsed rail is the default
  setCollapsed(startCollapsed);

  function setCollapsed(collapsed) {
    sidebar.classList.toggle('is-collapsed', collapsed);
    localStorage.setItem(STORAGE.collapsed, String(collapsed));
  }

  document.getElementById('nxSidebarToggle').addEventListener('click', () => {
    if (window.innerWidth < 992) {
      sidebar.classList.toggle('is-mobile-open');
      document.getElementById('nxMobileOverlay').classList.toggle('is-open');
    } else {
      setCollapsed(!sidebar.classList.contains('is-collapsed'));
    }
  });
  document.getElementById('nxMobileOverlay').addEventListener('click', () => {
    sidebar.classList.remove('is-mobile-open');
    document.getElementById('nxMobileOverlay').classList.remove('is-open');
  });

  /* ---------- SIDEBAR: inline accordion (expanded state) --------------------- */
  document.getElementById('nxNav').addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-nx-toggle]');
    if (!toggle) return;
    if (!sidebar.classList.contains('is-collapsed')) {
      e.preventDefault();
      toggle.closest('.nx-nav-item').classList.toggle('is-open');
    } else {
      e.preventDefault(); // collapsed rail relies on the hover flyout, not click
    }
  });

  /* ---------- FLYOUT: hover reveal for the collapsed rail (2 levels deep) ---- */
  const flyout = document.getElementById('nxFlyout');
  const flyout2 = document.getElementById('nxFlyout2');
  const tooltip = document.getElementById('nxTooltip');
  let hideTimer = null;

  function cancelHide() { clearTimeout(hideTimer); }
  function scheduleHide() {
    hideTimer = setTimeout(() => {
      flyout.classList.remove('is-visible');
      flyout2.classList.remove('is-visible');
      tooltip.classList.remove('is-visible');
    }, 180);
  }

  function rowHTML(node, idx) {
    const hasKids = !!node.children;
    const active = hasKids ? hasActiveDescendant(node) : node.href === activePage;
    return `<li>
      <a href="${hasKids ? '#' : node.href}" class="${active ? 'is-active' : ''}" data-idx="${idx}" ${hasKids ? 'data-has-children="true"' : ''}>
        <i class="bi ${node.icon || 'bi-dot'}"></i>
        <span>${node.label}</span>
        ${hasKids ? '<i class="bi bi-chevron-right nx-flyout-caret"></i>' : ''}
      </a>
    </li>`;
  }

  function renderFlyoutLevel1(config, rect) {
    flyout.innerHTML = `<div class="nx-flyout-title">${config.label}</div><ul>${config.children.map(rowHTML).join('')}</ul>`;
    flyout.style.top = Math.max(12, rect.top - 8) + 'px';
    flyout.style.left = (rect.right + 12) + 'px';
    flyout.classList.add('is-visible');
    flyout2.classList.remove('is-visible');

    flyout.querySelectorAll('li > a').forEach(a => {
      a.addEventListener('mouseenter', () => {
        cancelHide();
        if (a.dataset.hasChildren === 'true') {
          const node = config.children[+a.dataset.idx];
          const rowRect = a.getBoundingClientRect();
          renderFlyoutLevel2(node, rowRect);
        } else {
          flyout2.classList.remove('is-visible');
        }
      });
    });
  }

  function renderFlyoutLevel2(node, rowRect) {
    flyout2.innerHTML = `<div class="nx-flyout-title">${node.label}</div><ul>${node.children.map(rowHTML).join('')}</ul>`;
    flyout2.style.top = Math.max(12, rowRect.top - 8) + 'px';
    flyout2.style.left = (rowRect.right + 12) + 'px';
    flyout2.classList.add('is-visible');
  }

  document.getElementById('nxNav').querySelectorAll(':scope > .nx-nav-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (!sidebar.classList.contains('is-collapsed') || window.innerWidth < 992) return;
      cancelHide();
      const rect = item.getBoundingClientRect();
      const isParent = item.dataset.nxParent === 'true';

      if (isParent) {
        const config = window.NX_NAV.find(n => n.id === item.dataset.nxItem);
        renderFlyoutLevel1(config, rect);
        tooltip.classList.remove('is-visible');
      } else {
        const label = item.querySelector('.nx-nav-label').textContent;
        tooltip.textContent = label;
        tooltip.style.top = (rect.top + rect.height / 2 - 14) + 'px';
        tooltip.style.left = (rect.right + 12) + 'px';
        tooltip.classList.add('is-visible');
        flyout.classList.remove('is-visible');
        flyout2.classList.remove('is-visible');
      }
    });
    item.addEventListener('mouseleave', scheduleHide);
  });
  [flyout, flyout2].forEach(panel => {
    panel.addEventListener('mouseenter', cancelHide);
    panel.addEventListener('mouseleave', scheduleHide);
  });

  /* ---------- MOBILE SEARCH TOGGLE ------------------------------------------- */
  const searchBox = document.querySelector('.nx-search');
  const searchBtn = document.getElementById('nxSearchMobileToggle');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => searchBox.classList.toggle('is-mobile-active'));
  }

  /* ---------- SWITCHER: simple (client) --------------------------------------- */
  if (switcherMode === 'simple') {
    const simpleToggle = document.getElementById('nxSimpleToggle');
    if (simpleToggle) simpleToggle.addEventListener('click', () => {
      const next = html.getAttribute('data-nx-theme') === 'dark' ? 'light' : 'dark';
      applyMode(next);
    });
  }

  /* ---------- SWITCHER: full customizer (default) ------------------------------ */
  if (switcherMode === 'full') {
    const customizer = document.getElementById('nxCustomizer');
    const backdrop = document.getElementById('nxCustomizerBackdrop');
    if (customizer && backdrop) {
      const open = () => { customizer.classList.add('is-open'); backdrop.classList.add('is-open'); syncCustomizerUI(); };
      const close = () => { customizer.classList.remove('is-open'); backdrop.classList.remove('is-open'); };

      document.getElementById('nxCustomizerOpen').addEventListener('click', open);
      document.getElementById('nxCustomizerClose').addEventListener('click', close);
      backdrop.addEventListener('click', close);

      customizer.querySelectorAll('[data-nx-group="mode"] .nx-option-card').forEach(el =>
        el.addEventListener('click', () => { applyMode(el.dataset.nxValue); syncCustomizerUI(); }));
      customizer.querySelectorAll('[data-nx-group="theme"] .nx-option-card').forEach(el =>
        el.addEventListener('click', () => { applyThemePreset(el.dataset.nxValue); syncCustomizerUI(); }));

      document.getElementById('nxRtlSwitch').addEventListener('change', (e) => {
        html.setAttribute('dir', e.target.checked ? 'rtl' : 'ltr');
      });

      const syncCustomizerUI = () => {
        const mode = localStorage.getItem(STORAGE.mode) || 'light';
        const themeId = localStorage.getItem(STORAGE.theme) || (window.NX_THEMES && window.NX_THEMES[0].id);
        customizer.querySelectorAll('[data-nx-group="mode"] .nx-option-card').forEach(el => el.classList.toggle('is-selected', el.dataset.nxValue === mode));
        customizer.querySelectorAll('[data-nx-group="theme"] .nx-option-card').forEach(el => el.classList.toggle('is-selected', el.dataset.nxValue === themeId));
      };
      syncCustomizerUI();
    }
  }
}
