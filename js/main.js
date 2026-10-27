/* ==========================================================================
   Portfolio behaviour
   --------------------------------------------------------------------------
   1. Settings         <- the few things you might want to change
   2. Helpers
   3. Theme toggle
   4. Project register (list, search, filters)
   5. Reader (loads a .md file and shows it in the panel)
   6. Routing (#project/your-slug links, back button, direct links)
   7. Start-up
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- 1. Settings ---------- */
  const CONFIG = {
    indexUrl: 'projects/index.json',   // the list of projects
    projectsDir: 'projects/',          // folder holding the .md files
    hashPrefix: '#project/',           // how project links look: /#project/your-slug
    wordsPerMinute: 220,               // used for the "x min read" estimate
    locale: 'en-IE',                   // date formatting
  };


  /* ---------- 2. Helpers ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);

  // Builds an element and sets its text safely (never as HTML).
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* storage blocked: ignore */ } }

  const dateFormat = new Intl.DateTimeFormat(CONFIG.locale, { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const formatDate = (iso) => dateFormat.format(new Date(iso));

  const root = document.documentElement;
  const baseTitle = document.title;
  const brandName = $('.brand').textContent.trim();


  /* ---------- 3. Motion helpers and theme ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Runs a change inside a View Transition when the browser supports it.
  function transition(update) {
    if (!document.startViewTransition || reduceMotion.matches) { update(); return Promise.resolve(); }
    return document.startViewTransition(update).finished.catch(() => {});
  }

  const themeButton = $('#theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  const activeTheme = () => root.dataset.theme || (prefersDark.matches ? 'dark' : 'light');

  function syncThemeButton() {
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    $('.switch-label', themeButton).textContent = activeTheme() === 'dark' ? 'Night mode' : 'Day mode';
    themeButton.dataset.state = activeTheme();
    themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  }
  function setTheme(next) {
    root.dataset.theme = next;
    storageSet('theme', next);
    syncThemeButton();
  }

  // The new theme spreads out from the button like ink.
  themeButton.addEventListener('click', (event) => {
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduceMotion.matches) return setTheme(next);
    const x = event.clientX || window.innerWidth / 2;
    const y = event.clientY || 0;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.classList.add('vt-theme');
    const run = document.startViewTransition(() => setTheme(next));
    run.ready.then(() => root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
    run.finished.finally(() => root.classList.remove('vt-theme'));
  });
  prefersDark.addEventListener('change', syncThemeButton);
  syncThemeButton();
  $('#year').textContent = new Date().getFullYear();


  /* ---------- 4. Project folders ---------- */
  const state = { projects: [], domain: 'All', query: '', activeSlug: null, loaded: false, rendered: false };
  const filtersEl = $('#filters');
  const listEl = $('#register-list');
  const countEl = $('#register-count');
  const emptyEl = $('#register-empty');
  const errorEl = $('#register-error');
  const searchEl = $('#search');
  const slugName = (slug) => `f-${slug}`;
  const folderFor = (slug) => (slug ? $(`.folder[data-slug="${CSS.escape(slug)}"]`) : null);

  // Folders slide in as they scroll into view.
  const revealer = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('in'); revealer.unobserve(entry.target); }
      }), { threshold: 0.15 })
    : null;

  function buildFilters() {
    const domains = ['All', ...new Set(state.projects.map((p) => p.domain))];
    filtersEl.replaceChildren(...domains.map((name) => {
      const button = el('button', 'chip', name);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(name === state.domain));
      button.addEventListener('click', () => { state.domain = name; syncFilters(); update(); });
      return button;
    }));
  }
  function syncFilters() {
    for (const button of filtersEl.children) button.setAttribute('aria-pressed', String(button.textContent === state.domain));
  }
  function matches(project) {
    if (state.domain !== 'All' && project.domain !== state.domain) return false;
    if (!state.query) return true;
    const haystack = [project.id, project.title, project.summary, project.domain, ...(project.tags || [])].join(' ').toLowerCase();
    return state.query.split(/\s+/).every((term) => haystack.includes(term));
  }

  function folderNode(project, index) {
    const item = el('li', 'folder-item');
    item.style.setProperty('--i', index);
    const link = el('a', 'folder');
    link.href = CONFIG.hashPrefix + encodeURIComponent(project.slug);
    link.dataset.slug = project.slug;
    link.style.viewTransitionName = slugName(project.slug);

    const sheet = el('span', 'folder-sheet');
    if (project.cover) {
      const image = el('img');
      image.src = project.cover; image.alt = ''; image.loading = 'lazy';
      sheet.append(image);
    }
    const status = el('span', 'status', project.status || '');
    status.dataset.status = (project.status || '').toLowerCase().replace(/\s+/g, '-');
    const top = el('span', 'folder-top');
    top.append(el('span', '', project.id), status);
    const time = el('time', 'folder-date', formatDate(project.date));
    time.dateTime = project.date;

    const front = el('span', 'folder-front');
    front.append(top, el('span', 'folder-title', project.title), el('span', 'folder-summary', project.summary),
      el('span', 'folder-tags', (project.tags || []).join(', ')), time);
    link.append(sheet, el('span', 'folder-tab', project.domain), front);
    item.append(link);
    return item;
  }

  function renderRegister() {
    const visible = state.projects.filter(matches);
    const nodes = visible.map(folderNode);
    listEl.replaceChildren(...nodes);
    nodes.forEach((node) => {
      if (!revealer || reduceMotion.matches || state.rendered) node.classList.add('in');
      else revealer.observe(node);
    });
    state.rendered = true;
    emptyEl.hidden = visible.length > 0;
    const total = state.projects.length;
    const noun = (n) => (n === 1 ? 'entry' : 'entries');
    countEl.textContent = visible.length === total ? `${total} ${noun(total)}` : `${visible.length} of ${total} ${noun(total)}`;
  }
  const update = () => transition(renderRegister);   // folders glide to their new places

  searchEl.addEventListener('input', () => { state.query = searchEl.value.trim().toLowerCase(); update(); });
  $('#clear-filters').addEventListener('click', () => {
    state.domain = 'All'; state.query = ''; searchEl.value = ''; syncFilters(); update();
  });

  function showRegisterError() {
    errorEl.replaceChildren();
    if (location.protocol === 'file:') {
      errorEl.append(
        el('p', '', 'The project list could not load because this page was opened straight from a file. Browsers block that.'),
        el('p', '', 'Start a local server instead: run  python3 -m http.server 8000  in this folder, then visit http://localhost:8000.'));
    } else {
      errorEl.append(el('p', '', 'The project list could not be loaded. Check that projects/index.json exists and is valid JSON.'));
    }
    errorEl.hidden = false;
    countEl.textContent = '';
  }

  async function loadProjects() {
    try {
      const response = await fetch(CONFIG.indexUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.projects = [...data.projects].sort((a, b) => b.date.localeCompare(a.date));
      buildFilters();
      renderRegister();
      state.loaded = true;
    } catch (error) {
      console.error('Could not load projects:', error);
      showRegisterError();
    }
  }


  /* ---------- 5. Reader ---------- */
  const reader = $('#reader');
  const scroller = $('#reader-scroll');
  const bodyEl = $('#reader-body');
  const statusEl = $('#reader-status');
  const markdownCache = new Map();
  const STAMPS = { complete: 'Reviewed', 'in-progress': 'Draft', planned: 'Proposed' };

  if (window.DOMPurify) {
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      if (node.tagName === 'A' && /^https?:\/\//i.test(node.getAttribute('href') || '')) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
      if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
    });
  }

  async function loadMarkdown(slug) {
    if (markdownCache.has(slug)) return markdownCache.get(slug);
    const response = await fetch(`${CONFIG.projectsDir}${encodeURIComponent(slug)}.md`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    markdownCache.set(slug, text);
    return text;
  }

  function fillHeader(project) {
    $('#reader-ref').textContent = project.id;
    $('#reader-title').textContent = project.title;
    $('#reader-summary').textContent = project.summary;

    // A fresh stamp element each time restarts its animation.
    const key = (project.status || '').toLowerCase().replace(/\s+/g, '-');
    const stamp = el('span', 'stamp', STAMPS[key] || project.status || '');
    stamp.dataset.status = key;
    $('#reader-stamp').replaceChildren(...(stamp.textContent ? [stamp] : []));

    const rows = [
      ['Domain', project.domain], ['Date', formatDate(project.date)], ['Status', project.status],
      ['Reading time', '\u2014'], ['Tools', (project.tags || []).join(', ')],
    ].filter(([, value]) => value);
    $('#reader-meta').replaceChildren(...rows.map(([label, value]) => {
      const group = el('div', label === 'Tools' ? 'wide' : '');
      const dd = el('dd', '', value);
      if (label === 'Reading time') dd.id = 'reader-reading';
      group.append(el('dt', '', label), dd);
      return group;
    }));

    const cover = $('#reader-cover');
    const image = $('#reader-cover-img');
    cover.hidden = !project.cover;
    if (project.cover) { image.src = project.cover; image.alt = project.coverAlt || ''; }
  }

  function setPagerLink(link, project) {
    link.hidden = !project;
    if (!project) return;
    link.href = CONFIG.hashPrefix + encodeURIComponent(project.slug);
    $('.pager-title', link).textContent = project.title;
  }
  function fillPager(index) {
    setPagerLink($('#reader-newer'), state.projects[index - 1]);
    setPagerLink($('#reader-older'), state.projects[index + 1]);
  }

  // ||text|| in a project file becomes a bar the reader can click to reveal.
  function applyRedactions(scope) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.nodeValue.includes('||') && !node.parentElement.closest('pre, code, button'))
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const parts = node.nodeValue.split(/\|\|(.+?)\|\|/g);
      if (parts.length === 1) return;
      const fragment = document.createDocumentFragment();
      parts.forEach((part, i) => {
        if (i % 2 === 0) { if (part) fragment.append(part); return; }
        const bar = el('button', 'redacted', part);
        bar.type = 'button';
        bar.title = 'Click to reveal';
        bar.setAttribute('aria-expanded', 'false');
        bar.addEventListener('click', () => {
          const open = bar.getAttribute('aria-expanded') === 'true';
          bar.setAttribute('aria-expanded', String(!open));
          bar.title = open ? 'Click to reveal' : 'Click to hide';
        });
        fragment.append(bar);
      });
      node.replaceWith(fragment);
    });
  }

  function decorateCodeBlocks() {
    bodyEl.querySelectorAll('pre').forEach((pre) => {
      const wrapper = el('div', 'code-block');
      const button = el('button', 'copy-code', 'Copy');
      button.type = 'button';
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText((pre.querySelector('code') || pre).textContent); button.textContent = 'Copied'; }
        catch { button.textContent = 'Copy failed'; }
        setTimeout(() => { button.textContent = 'Copy'; }, 1800);
      });
      pre.replaceWith(wrapper);
      wrapper.append(pre, button);
    });
  }

  function renderMarkdown(markdown) {
    if (!window.marked || !window.DOMPurify) throw new Error('Markdown libraries are missing (check js/vendor/).');
    bodyEl.innerHTML = DOMPurify.sanitize(marked.parse(markdown, { gfm: true }));
    applyRedactions(bodyEl);
    decorateCodeBlocks();
    const minutes = Math.max(1, Math.round(markdown.trim().split(/\s+/).length / CONFIG.wordsPerMinute));
    const reading = $('#reader-reading');
    if (reading) reading.textContent = `${minutes} min`;
  }

  // The folder you clicked grows into the sheet.
  async function openProject(slug) {
    const index = state.projects.findIndex((p) => p.slug === slug);
    if (index === -1) return false;
    const project = state.projects[index];
    const folder = folderFor(slug);
    const morph = !reader.open && folder && folder.offsetParent;
    const pending = loadMarkdown(slug).then((text) => ({ text }), (error) => ({ error }));

    if (morph) folder.style.viewTransitionName = 'sheet';
    await transition(() => {
      state.activeSlug = slug;
      fillHeader(project);
      fillPager(index);
      bodyEl.replaceChildren(el('p', 'reader-loading', 'Decrypting\u2026'));
      document.title = `${project.title} | ${brandName}`;
      if (morph) folder.style.viewTransitionName = 'none';
      if (!reader.open) reader.showModal();
      scroller.scrollTop = 0;
    });
    if (morph) folder.style.viewTransitionName = slugName(slug);

    const result = await pending;
    if (state.activeSlug !== slug) return true;
    try {
      if (result.error) throw result.error;
      renderMarkdown(result.text);
    } catch (error) {
      console.error('Could not load project:', error);
      bodyEl.replaceChildren(el('p', 'reader-error',
        `This project could not be loaded. Check that projects/${slug}.md exists and that its name matches the slug in projects/index.json.`));
    }
    return true;
  }

  // ...and shrinks back into its folder.
  async function closeReader() {
    if (!reader.open) return;
    const slug = state.activeSlug;
    const folder = folderFor(slug);
    const morph = folder && folder.offsetParent;
    if (parseHash() !== null) history.replaceState(null, '', location.pathname + location.search);
    await transition(() => {
      reader.close();
      if (morph) folder.style.viewTransitionName = 'sheet';
    });
    if (folder) folder.style.viewTransitionName = slugName(slug);
  }

  $('#reader-close').addEventListener('click', closeReader);
  reader.addEventListener('click', (event) => { if (event.target === reader) closeReader(); });
  reader.addEventListener('cancel', (event) => { event.preventDefault(); closeReader(); });   // Escape key
  reader.addEventListener('close', () => { state.activeSlug = null; document.title = baseTitle; });

  let statusTimer;
  $('#reader-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); statusEl.textContent = 'Link copied'; }
    catch { statusEl.textContent = 'Copy failed'; }
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 2200);
  });


  /* ---------- 6. Routing ---------- */
  function parseHash() {
    let hash = '';
    try { hash = decodeURIComponent(location.hash); } catch { return null; }
    return hash.startsWith(CONFIG.hashPrefix) ? hash.slice(CONFIG.hashPrefix.length) : null;
  }
  async function route() {
    if (!state.loaded) return;
    const slug = parseHash();
    if (slug !== null) {
      const found = await openProject(slug);
      if (!found) closeReader();
    } else {
      closeReader();
    }
  }
  window.addEventListener('hashchange', route);


  /* ---------- 7. Decrypting headline ---------- */
  function decryptHeadline() {
    const title = $('#hero-title');
    if (!title) return;
    if (reduceMotion.matches) { title.classList.add('is-ready'); return; }
    const finalText = title.textContent.trim().replace(/\s+/g, ' ');
    const glyphs = 'abcdefghijklmnopqrstuvwxyz0123456789#$%&*+=?<>/';

    document.fonts.ready.then(() => {
      title.textContent = '';
      const readable = el('span', 'sr-only', finalText);
      const visual = el('span');
      visual.setAttribute('aria-hidden', 'true');
      const cells = [];
      finalText.split(' ').forEach((word, w, words) => {
        const wordEl = el('span', 'scramble-word');
        for (const letter of word) {
          const cell = el('span', 'scramble-char', letter);
          cell.dataset.final = letter;
          wordEl.append(cell); cells.push(cell);
        }
        visual.append(wordEl);
        if (w < words.length - 1) visual.append(' ');
      });
      title.append(readable, visual);
      cells.forEach((cell) => { cell.style.width = `${cell.getBoundingClientRect().width}px`; });   // freeze layout
      title.classList.add('is-ready');

      const settleAt = cells.map((cell, i) => (/[.,]/.test(cell.dataset.final) ? 0 : (i / cells.length) * 0.7 + Math.random() * 0.3));
      const start = performance.now();
      let lastShuffle = 0;
      (function frame(now) {
        const progress = Math.min(1, (now - start) / 1500);
        const shuffle = now - lastShuffle > 55;
        if (shuffle) lastShuffle = now;
        let pending = false;
        cells.forEach((cell, i) => {
          if (progress >= settleAt[i]) {
            if (cell.dataset.final !== cell.textContent) cell.textContent = cell.dataset.final;
            cell.classList.remove('is-scrambling');
          } else {
            pending = true;
            if (shuffle) cell.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
            cell.classList.add('is-scrambling');
          }
        });
        if (pending) requestAnimationFrame(frame);
      })(start);
    });
  }


  /* ---------- 8. Terminal ---------- */
  function initTerminal() {
    const box = $('#glance');
    if (!box) return;
    const profile = [...box.querySelectorAll('.row')].map((row) => [$('dt', row).textContent.trim(), $('dd', row).textContent.trim()]);

    box.classList.add('terminal');
    box.removeAttribute('aria-labelledby');
    box.setAttribute('aria-label', 'Interactive terminal');
    box.innerHTML = `
      <div class="term-bar"><span>guest@portfolio</span><button class="term-close" type="button" aria-label="Close console">Close</button></div>
      <div class="term-screen" role="log" aria-live="polite"></div>
      <form class="term-form" autocomplete="off">
        <label class="term-prompt" for="term-input">$</label>
        <input class="term-input" id="term-input" type="text" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Terminal command">
      </form>
      <div class="term-chips" role="group" aria-label="Quick commands"></div>`;

    const screen = $('.term-screen', box);
    const input = $('.term-input', box);
    const history = [];
    let cursor = 0;

    const scrollDown = () => { screen.scrollTop = screen.scrollHeight; };
    function line(text, className = '') { const p = el('p', `term-line ${className}`.trim(), text); screen.append(p); scrollDown(); return p; }
    function row(key, value, href) {
      const p = el('p', 'term-line term-row');
      const val = el('span', 'term-val');
      if (href) { const a = el('a', '', value); a.href = href; val.append(a); } else val.textContent = value;
      p.append(el('span', 'term-key', key), val);
      screen.append(p); scrollDown();
    }
    function find(query) {
      const q = query.trim().toLowerCase();
      if (!q) return null;
      return state.projects.find((p) => p.id.toLowerCase() === q || p.slug === q)
        || state.projects.find((p) => p.slug.includes(q) || p.title.toLowerCase().includes(q) || p.domain.toLowerCase() === q);
    }

    const commands = {
      help() {
        [['whoami', 'who I am, in brief'], ['ls', 'list the projects'], ['open <ref>', 'open one, e.g. open P-003'],
          ['contact', 'how to reach me'], ['theme', 'switch light or dark'], ['clear', 'clear the screen']].forEach(([k, v]) => row(k, v));
        line('Other commands exist. Poke around.', 'term-dim');
      },
      whoami() { profile.forEach(([k, v]) => row(k.toLowerCase(), v)); },
      ls() {
        if (!state.loaded) return line('Projects are still loading. Try again in a second.', 'term-warn');
        state.projects.forEach((p) => {
          const item = el('p', 'term-line');
          const button = el('button', 'term-link', `${p.id}  ${p.title}`);
          button.type = 'button';
          button.addEventListener('click', () => commands.open(p.slug));
          item.append(button); screen.append(item);
        });
        scrollDown();
        line('Click a line, or type open <ref>.', 'term-dim');
      },
      open(arg = '') {
        if (!arg.trim()) return line('Usage: open <ref>, for example: open P-003', 'term-warn');
        const project = find(arg);
        if (!project) return line(`No project matches "${arg}". Try ls.`, 'term-warn');
        line(`Opening ${project.id}: ${project.title}`);
        location.hash = CONFIG.hashPrefix + encodeURIComponent(project.slug);
      },
      contact() {
        const mail = $('.contact-email');
        if (mail) row('email', mail.textContent.trim(), mail.getAttribute('href'));
        document.querySelectorAll('.contact-list a').forEach((a) => row(a.textContent.trim().toLowerCase(), a.getAttribute('href'), a.getAttribute('href')));
      },
      theme(arg = '') {
        const wanted = arg.trim().toLowerCase();
        const next = wanted === 'dark' || wanted === 'light' ? wanted : (activeTheme() === 'dark' ? 'light' : 'dark');
        setTheme(next);
        line(`Theme set to ${next}.`, 'term-ok');
      },
      clear() { screen.replaceChildren(); },
      sudo() { line('guest is not in the sudoers file. This incident will be reported.', 'term-warn'); },
      flag() { line("Flags hide in source code and odd corners. Start with this page's source, then run: submit <flag>", 'term-dim'); },
      submit(arg = '') {
        if (!arg.trim()) return line('Usage: submit <flag>', 'term-warn');
        if (arg.trim() === atob('ZmxhZ3t2aWV3LXNvdXJjZS1pcy1hLXNraWxsfQ==')) {
          line('Correct. Reading the source is the first habit of a good analyst.', 'term-ok');
          line('Email me with the subject "flag" and tell me how you found it.', 'term-ok');
        } else line('Not it. Keep looking.', 'term-warn');
      },
      exit() { line('There is no exit. Scroll down instead.', 'term-dim'); },
    };
    commands.cat = commands.open;
    commands.projects = commands.ls;
    commands.about = commands.whoami;

    function run(raw) {
      const text = raw.trim();
      const echo = el('p', 'term-line');
      echo.append(el('span', 'term-ps', '$ '), document.createTextNode(text));
      screen.append(echo);
      if (!text) return;
      history.push(text); cursor = history.length;
      const [name, ...rest] = text.split(/\s+/);
      if (Object.hasOwn(commands, name.toLowerCase())) commands[name.toLowerCase()](rest.join(' '));
      else line(`command not found: ${name}. Type help to see what works.`, 'term-warn');
      scrollDown();
    }

    // Tab completion. Returns false when there is nothing to complete, so Tab still moves focus.
    function complete() {
      const [head, ...rest] = input.value.split(/\s+/);
      if (!input.value.trim()) return false;
      if (!rest.length) {
        const options = ['help', 'whoami', 'ls', 'open', 'contact', 'theme', 'clear'].filter((c) => c.startsWith(head.toLowerCase()));
        if (options.length === 1) input.value = `${options[0]} `; else if (options.length > 1) line(options.join('   '), 'term-dim');
        return options.length > 0;
      }
      if (['open', 'cat'].includes(head.toLowerCase())) {
        const part = rest.join(' ').toLowerCase();
        const options = state.projects.filter((p) => p.slug.startsWith(part) || p.id.toLowerCase().startsWith(part));
        if (options.length === 1) input.value = `${head} ${options[0].slug}`; else if (options.length > 1) line(options.map((p) => p.slug).join('   '), 'term-dim');
        return options.length > 0;
      }
      return false;
    }

    $('.term-form', box).addEventListener('submit', (event) => { event.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowUp') { event.preventDefault(); if (history.length) { cursor = Math.max(0, cursor - 1); input.value = history[cursor]; } }
      else if (event.key === 'ArrowDown') { event.preventDefault(); cursor = Math.min(history.length, cursor + 1); input.value = history[cursor] || ''; }
      else if (event.key === 'Tab' && !event.shiftKey && complete()) event.preventDefault();
      else if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); commands.clear(); }
    });
    screen.addEventListener('click', () => { if (!window.getSelection().toString()) input.focus({ preventScroll: true }); });

    ['help', 'ls', 'whoami', 'contact'].forEach((name) => {
      const chip = el('button', 'chip', name);
      chip.type = 'button';
      chip.addEventListener('click', () => run(name));
      $('.term-chips', box).append(chip);
    });

    // Opening sequence: runs the first time the console is opened.
    box.addEventListener('console:open', async () => {
      if (!reduceMotion.matches) {
        input.readOnly = true;
        for (const letter of 'whoami') { input.value += letter; await sleep(75); }
        await sleep(260);
        input.value = '';
        input.readOnly = false;
      }
      run('whoami');
      line('Type help, or tap a command below.', 'term-dim');
    }, { once: true });
  }


  /* ---------- 8b. Header, footer and page chrome ---------- */
  function initChrome() {
    const header = $('#site-header');
    const progress = $('#progress');
    const nav = $('#site-nav');
    const links = [...nav.querySelectorAll('a')];
    const sections = links.map((link) => $(link.getAttribute('href')));
    const menuButton = $('#menu-toggle');

    function setActive(link) {
      links.forEach((a) => (a === link ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    }

    // One scroll handler: progress line, condensed header, and which section is current.
    let queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
        header.classList.toggle('is-scrolled', window.scrollY > 24);
        const probe = window.innerHeight * 0.4;
        const index = sections.findIndex((section) => {
          if (!section) return false;
          const box = section.getBoundingClientRect();
          return box.top <= probe && box.bottom > probe;
        });
        setActive(index === -1 ? null : links[index]);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // Mobile menu
    function setMenu(open) {
      nav.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? 'Close' : 'Menu';
    }
    menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuButton.focus(); }
    });


    // Console drawer: header button, hero button, map node, backtick key.
    const consoleBox = $('#console');
    const consoleToggle = $('#console-toggle');
    function setConsole(open) {
      consoleBox.hidden = !open;
      consoleToggle.setAttribute('aria-expanded', String(open));
      if (open) {
        $('#glance').dispatchEvent(new Event('console:open'));
        const input = $('.term-input', consoleBox);
        if (input) input.focus({ preventScroll: true });
      } else if (consoleBox.contains(document.activeElement)) {
        consoleToggle.focus();
      }
    }
    consoleToggle.addEventListener('click', () => setConsole(consoleBox.hidden));
    $('#open-console').addEventListener('click', () => setConsole(true));
    document.querySelectorAll('[data-console]').forEach((node) => node.addEventListener('click', (event) => { event.preventDefault(); setConsole(true); }));
    consoleBox.addEventListener('click', (event) => { if (event.target.closest('.term-close')) setConsole(false); });
    document.addEventListener('keydown', (event) => {
      const typing = /^(input|textarea|select)$/i.test(document.activeElement.tagName);
      if (event.key === '`' && !typing && !reader.open) { event.preventDefault(); setConsole(consoleBox.hidden); }
      else if (event.key === 'Escape' && !consoleBox.hidden && !reader.open && !nav.classList.contains('is-open')) setConsole(false);
    });
    const countLabel = $('#nm-count');
    if (countLabel) {
      const wait = setInterval(() => {
        if (state.loaded) { countLabel.textContent = `${state.projects.length} case files`; clearInterval(wait); }
      }, 150);
    }

    // Cursor spotlight (mouse and trackpad only)
    const spot = $('.spotlight');
    if (spot && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduceMotion.matches) {
      window.addEventListener('pointermove', (event) => {
        spot.style.setProperty('--mx', `${event.clientX}px`);
        spot.style.setProperty('--my', `${event.clientY}px`);
        spot.classList.add('is-on');
      }, { passive: true });
      document.addEventListener('mouseleave', () => spot.classList.remove('is-on'));
    }

    // Footer: reuses your contact details, so you only edit them once.
    const mail = $('.contact-email');
    const footerMail = $('#footer-mail');
    if (mail && footerMail) { footerMail.href = mail.getAttribute('href'); footerMail.textContent = mail.textContent.trim(); }
    const elsewhere = $('#footer-elsewhere');
    document.querySelectorAll('.contact-list a').forEach((a) => {
      const item = el('li');
      item.append(a.cloneNode(true));
      elsewhere.append(item);
    });

    const clock = $('#clock');
    const clockFormat = new Intl.DateTimeFormat(CONFIG.locale, { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Dublin' });
    const tick = () => { clock.textContent = clockFormat.format(new Date()); };
    tick();
    setInterval(tick, 20000);

    const wordmark = $('.wordmark');
    if (wordmark) {
      wordmark.replaceChildren(...[...wordmark.textContent.trim()].map((ch) => el('span', '', ch === ' ' ? '\u00a0' : ch)));
    }
    $('#to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' }));
  }


  /* ---------- 9. Start-up ---------- */
  console.log('%cHello, curious one.', 'font: 600 16px Georgia, serif');
  console.log('Try the terminal on the home page, and read the page source carefully.');
  initTerminal();
  initChrome();
  decryptHeadline();
  loadProjects().then(route);
})();
