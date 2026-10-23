/* DX page review layer: comments and copy versions stored through /api (Neon Postgres).
   A page provides window.DXReviewPage = { slug, sections, render(content, app) } and a content.json beside it.
   No accounts: reviewers type their name once (remembered in this browser). The site's Vercel password
   protects the pages and the API. Saving copy needs the editor passcode (EDITOR_PASSCODE on Vercel). */
(function () {
  'use strict';
  var P = window.DXReviewPage;
  var API = (function () { var s = document.currentScript && document.currentScript.getAttribute('data-api'); return s || '/api'; })();
  var ICON_C = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5v-2.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

  var C = null, saved = '', versions = [], comments = [], online = false, editingOn = false;
  var app = document.getElementById('app');
  var state = { target: null, filter: 'open' };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ''; localStorage.setItem(k, v); } catch (e) { return ''; } }
  function sstore(k, v) { try { if (v === undefined) return sessionStorage.getItem(k) || ''; if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { return ''; } }
  function toast(msg) {
    var t = $('.rv-toast'); if (!t) { t = document.createElement('div'); t.className = 'rv-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(t.__t); t.__t = setTimeout(function () { t.hidden = true; }, 3500);
  }
  function api(path, opts) {
    opts = opts || {};
    return fetch(API + path, { method: opts.method || 'GET', headers: opts.body ? { 'Content-Type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) {
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('application/json') < 0) throw { status: r.status, message: 'The review service isn’t reachable.' };
        return r.json().then(function (j) { if (!r.ok) throw { status: r.status, message: j.error || 'Something went wrong.' }; return j; });
      }, function () { throw { status: 0, message: 'Can’t reach the review service. Check your connection.' }; });
  }
  function when(iso) {
    var d = new Date(iso), s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
  }
  function fmtDate(iso) { var d = new Date(iso); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }

  /* ---------- threads ---------- */
  function threads() {
    var roots = [], kids = {};
    comments.forEach(function (c) { if (c.parent_id) (kids[c.parent_id] = kids[c.parent_id] || []).push(c); else roots.push(c); });
    return roots.map(function (r) { return { root: r, replies: kids[r.id] || [] }; });
  }
  function openCount(target) { return threads().filter(function (t) { return !t.root.resolved && (!target || t.root.target === target); }).length; }

  /* ---------- page + decorations ---------- */
  function render() {
    P.render(C, app);
    decorate();
  }
  function decorate() {
    $$('[data-rv-target]', app).forEach(function (el) {
      var target = el.getAttribute('data-rv-target'), label = el.getAttribute('data-rv-label'), kind = el.getAttribute('data-rv-kind');
      var n = openCount(target), btn = document.createElement('button');
      btn.type = 'button'; btn.className = kind === 'section' ? 'rv-cbtn' : 'rv-tbtn';
      if (n) btn.classList.add('has');
      btn.setAttribute('aria-label', (n ? n + ' open comment' + (n > 1 ? 's' : '') + ' on ' : 'Comment on ') + label);
      btn.innerHTML = ICON_C + (kind === 'section' ? '<span class="t">Comment</span>' : '') + (n ? '<span class="n">' + n + '</span>' : '');
      btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); openPanel(target, label); });
      var host = el.tagName === 'DETAILS' ? el.querySelector('summary') : el;
      if (el.tagName !== 'DETAILS' && getComputedStyle(el).position === 'static') el.style.position = 'relative';
      host.appendChild(btn);
    });
    var total = openCount(), cb = $('#rvComments');
    if (cb) cb.innerHTML = 'Comments' + (total ? ' <span class="n">' + total + '</span>' : '');
  }
  function flash(target) {
    var el = $('[data-rv-target="' + (window.CSS && CSS.escape ? CSS.escape(target) : target) + '"]', app);
    if (!el) { toast('That part of the page has changed since the comment was left.'); return; }
    if (el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.remove('rv-flash'); void el.offsetWidth; el.classList.add('rv-flash');
  }

  /* ---------- review bar ---------- */
  function bar() {
    var el = document.createElement('div');
    el.className = 'rv-bar';
    el.innerHTML = '<div class="rv-bar__in"><a class="rv-home" href="../../index.html" aria-label="All DX components">←</a><div class="rv-title"><b>' + esc(C.meta.title) + ' · page review</b><span id="rvStatus"></span></div>' +
      '<div class="rv-btns"><button type="button" class="rv-btn" id="rvHow" aria-expanded="false">How it works</button>' +
      '<button type="button" class="rv-btn" id="rvLog" aria-expanded="false">Versions</button>' +
      '<button type="button" class="rv-btn" id="rvComps" aria-pressed="false">Show components</button>' +
      '<button type="button" class="rv-btn" id="rvComments">Comments</button>' +
      '<button type="button" class="rv-btn rv-btn--primary" id="rvEdit">Edit copy</button></div></div>' +
      '<div class="rv-pop" id="rvHowPop" hidden><h3>Reviewing this page</h3><ol>' +
      '<li><b>Comment</b> on any section, or use the small comment icon on a tool card or FAQ question.</li>' +
      '<li>Type your name the first time. This browser remembers it; there’s no account.</li>' +
      '<li>Everyone with the site password sees the comments. Reply in a thread, and resolve it once it’s handled.</li>' +
      '<li><b>Edit copy</b> changes the text on the page. Saving needs the editor passcode and is listed under Versions.</li></ol></div>' +
      '<div class="rv-pop" id="rvLogPop" hidden><h3>Versions</h3><ul id="rvLogList"></ul></div>' +
      '<div class="rv-off" id="rvOff" hidden></div>';
    document.body.insertBefore(el, app);
    function barH() { document.documentElement.style.setProperty('--rv-bar-h', Math.round(el.getBoundingClientRect().bottom) + 'px'); }
    barH(); window.addEventListener('resize', barH); window.addEventListener('scroll', barH, { passive: true });
    function pop(btn, p) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = p.hidden; $$('.rv-pop').forEach(function (x) { x.hidden = true; }); $$('#rvHow,#rvLog').forEach(function (x) { x.setAttribute('aria-expanded', 'false'); });
        p.hidden = !open; btn.setAttribute('aria-expanded', String(open));
        if (p.id === 'rvLogPop') renderVersions();
      });
    }
    pop($('#rvHow'), $('#rvHowPop')); pop($('#rvLog'), $('#rvLogPop'));
    document.addEventListener('click', function (e) { if (!e.target.closest('.rv-pop')) { $$('.rv-pop').forEach(function (x) { x.hidden = true; }); } });
    $('#rvComps').addEventListener('click', function () { var on = !document.body.classList.contains('show-components'); document.body.classList.toggle('show-components', on); this.setAttribute('aria-pressed', String(on)); });
    $('#rvComments').addEventListener('click', function () { openPanel(null); });
    $('#rvEdit').addEventListener('click', openDrawer);
  }
  function setStatus() {
    var v = versions[0];
    $('#rvStatus').textContent = 'Mock of ' + C.meta.url + (v ? ' · version ' + versions.length + ', ' + when(v.created_at) + ' by ' + v.author + ': ' + v.note : ' · draft copy from the page brief');
  }
  function renderVersions() {
    var list = $('#rvLogList');
    if (!online) { list.innerHTML = '<li>Versions appear once the review service is reachable.</li>'; return; }
    list.innerHTML = (versions.length ? versions.map(function (v, i) { return '<li><b>Version ' + (versions.length - i) + '</b> · ' + esc(fmtDate(v.created_at)) + ' · ' + esc(v.author) + '<br>' + esc(v.note) + '</li>'; }).join('') : '') +
      '<li><b>Original</b> · draft copy from the page brief</li>';
  }
  function offline(msg) {
    var o = $('#rvOff'); o.hidden = false;
    o.textContent = msg + ' The page still shows; comments and saving are off until it’s back.';
  }

  /* ---------- comments panel ---------- */
  var panel = null;
  function openPanel(target, label) {
    state.target = target; state.label = label || '';
    if (!panel) {
      panel = document.createElement('aside');
      panel.className = 'rv-drawer rv-panel'; panel.setAttribute('aria-label', 'Comments');
      document.body.appendChild(panel);
      panel.addEventListener('click', onPanelClick);
      panel.addEventListener('submit', onPanelSubmit);
    }
    if (drawer) drawer.hidden = true;
    panel.hidden = false;
    drawPanel();
    refreshComments();
    var ta = $('.rv-compose textarea', panel); if (ta && target) ta.focus();
  }
  function nameField() {
    var n = store('dxrv-name');
    return n ? '<div class="rv-as">Commenting as <b>' + esc(n) + '</b> <button type="button" class="rv-link" data-act="rename">Change</button></div>'
      : '<div class="rv-f"><label for="rvName">Your name</label><input type="text" id="rvName" name="author" maxlength="80" autocomplete="name" placeholder="First and last name" required></div>';
  }
  function drawPanel() {
    var all = threads(), tg = state.target;
    var shown = all.filter(function (t) { return (!tg || t.root.target === tg) && (state.filter === 'all' || (state.filter === 'open' ? !t.root.resolved : t.root.resolved)); });
    var counts = { open: 0, resolved: 0 }; all.forEach(function (t) { if (!tg || t.root.target === tg) counts[t.root.resolved ? 'resolved' : 'open']++; });
    var h = '<div class="rv-dh"><b>' + (tg ? 'Comments on' : 'All comments') + '</b><button type="button" class="rv-x" data-act="close" aria-label="Close">×</button></div>';
    if (tg) h += '<div class="rv-on"><span>' + esc(state.label) + '</span><button type="button" class="rv-link" data-act="all">All comments</button></div>';
    h += '<div class="rv-db">';
    if (tg) h += '<form class="rv-compose" data-form="new">' + nameField() + '<div class="rv-f"><label for="rvBody">Comment</label><textarea id="rvBody" name="body" rows="3" maxlength="4000" required placeholder="What should change, or what needs checking?"></textarea></div>' +
      '<div class="rv-actions"><button type="submit" class="rv-btn rv-btn--primary"' + (online ? '' : ' disabled') + '>Post comment</button></div></form>';
    h += '<div class="rv-tabs" role="group" aria-label="Filter">' + ['open', 'resolved', 'all'].map(function (f) {
      var n = f === 'all' ? counts.open + counts.resolved : counts[f];
      return '<button type="button" data-filter="' + f + '" aria-pressed="' + (state.filter === f) + '">' + f.charAt(0).toUpperCase() + f.slice(1) + ' <span>' + n + '</span></button>';
    }).join('') + '</div>';
    if (!online) h += '<p class="rv-empty">Comments can’t load right now.</p>';
    else if (!shown.length) h += '<p class="rv-empty">' + (state.filter === 'open' ? (tg ? 'No open comments here yet.' : 'No open comments. Click Comment on any section to start.') : 'Nothing here.') + '</p>';
    h += shown.map(function (t) {
      var r = t.root;
      return '<article class="rv-thread' + (r.resolved ? ' is-resolved' : '') + '" data-id="' + r.id + '">' +
        (tg ? '' : '<button type="button" class="rv-where" data-act="goto" data-target="' + esc(r.target) + '">' + esc(r.target_label || r.target) + '</button>') +
        [r].concat(t.replies).map(function (c) {
          return '<div class="rv-c"><div class="rv-c__h"><b>' + esc(c.author) + '</b><time datetime="' + esc(c.created_at) + '" title="' + esc(fmtDate(c.created_at)) + '">' + esc(when(c.created_at)) + '</time></div><p>' + esc(c.body) + '</p></div>';
        }).join('') +
        '<div class="rv-t__a"><button type="button" class="rv-link" data-act="reply">Reply</button><button type="button" class="rv-link" data-act="' + (r.resolved ? 'reopen' : 'resolve') + '">' + (r.resolved ? 'Reopen' : 'Resolve') + '</button>' +
        (tg ? '' : '') + '</div>' +
        '<form class="rv-reply" data-form="reply" data-parent="' + r.id + '" hidden>' + nameField() + '<div class="rv-f"><label for="rvR' + r.id + '">Reply</label><textarea id="rvR' + r.id + '" name="body" rows="2" maxlength="4000" required></textarea></div><div class="rv-actions"><button type="submit" class="rv-btn rv-btn--primary">Reply</button><button type="button" class="rv-btn" data-act="cancel">Cancel</button></div></form>' +
        '</article>';
    }).join('');
    h += '</div>';
    var keep = $('#rvBody', panel), draft = keep ? keep.value : '';
    panel.innerHTML = h;
    if (draft && $('#rvBody', panel)) $('#rvBody', panel).value = draft;
  }
  function onPanelClick(e) {
    var b = e.target.closest('[data-act],[data-filter]'); if (!b) return;
    var act = b.getAttribute('data-act'), th = b.closest('.rv-thread');
    if (b.hasAttribute('data-filter')) { state.filter = b.getAttribute('data-filter'); drawPanel(); return; }
    if (act === 'close') { panel.hidden = true; return; }
    if (act === 'all') { state.target = null; drawPanel(); return; }
    if (act === 'goto') { flash(b.getAttribute('data-target')); return; }
    if (act === 'rename') { store('dxrv-name', ''); drawPanel(); return; }
    if (act === 'reply') { var f = $('.rv-reply', th); f.hidden = false; $('textarea', f).focus(); return; }
    if (act === 'cancel') { b.closest('form').hidden = true; return; }
    if (act === 'resolve' || act === 'reopen') {
      b.disabled = true;
      api('/comments', { method: 'PATCH', body: { page: P.slug, id: Number(th.getAttribute('data-id')), resolved: act === 'resolve' } })
        .then(function (j) { comments = comments.map(function (c) { return c.id === j.comment.id ? j.comment : c; }); afterComments(); toast(act === 'resolve' ? 'Resolved.' : 'Reopened.'); },
          function (err) { b.disabled = false; toast(err.message); });
    }
  }
  function onPanelSubmit(e) {
    e.preventDefault();
    var f = e.target, nameIn = $('[name=author]', f), body = $('[name=body]', f).value.trim();
    var author = nameIn ? nameIn.value.trim() : store('dxrv-name');
    if (!author) { nameIn && nameIn.focus(); toast('Add your name first.'); return; }
    if (!body) return;
    var parent = f.getAttribute('data-parent'), root = parent ? comments.filter(function (c) { return String(c.id) === parent; })[0] : null;
    var btn = $('[type=submit]', f); btn.disabled = true;
    api('/comments', { method: 'POST', body: { page: P.slug, target: root ? root.target : state.target, targetLabel: root ? root.target_label : state.label, parentId: parent ? Number(parent) : null, author: author, body: body } })
      .then(function (j) {
        store('dxrv-name', author); comments.push(j.comment);
        if (!parent) $('[name=body]', f).value = '';
        if (state.filter === 'resolved') state.filter = 'open';
        afterComments(); toast(parent ? 'Reply posted.' : 'Comment posted.');
      }, function (err) { btn.disabled = false; toast(err.message); });
  }
  function afterComments() { $$('.rv-cbtn,.rv-tbtn', app).forEach(function (b) { b.remove(); }); decorate(); if (panel && !panel.hidden) drawPanel(); }
  var refreshing = false;
  function refreshComments() {
    if (refreshing) return; refreshing = true;
    return api('/comments?page=' + encodeURIComponent(P.slug)).then(function (j) {
      refreshing = false;
      var changed = JSON.stringify(j.comments) !== JSON.stringify(comments);
      comments = j.comments; online = true; $('#rvOff').hidden = true;
      if (changed) {
        var active = document.activeElement, typing = panel && panel.contains(active) && active.tagName === 'TEXTAREA' && active.value;
        $$('.rv-cbtn,.rv-tbtn', app).forEach(function (b) { b.remove(); }); decorate();
        if (panel && !panel.hidden && !typing) drawPanel();
      }
    }, function (err) { refreshing = false; if (!online) offline(err.message); });
  }

  /* ---------- edit drawer ---------- */
  var LABELS = { eyebrow: 'Eyebrow', heading: 'Heading', sub: 'Sub-heading', body: 'Body', copyValue: 'Copy field value', copyLabel: 'Copy button label', buttonLabel: 'Button label', buttonHref: 'Button link',
    trust: 'Trust line', snippetFile: 'Code panel label', prompt: 'Prompt', chips: 'Tool chips', code: 'Code', caption: 'Caption', steps: 'Steps', title: 'Title', tabs: 'Tabs', label: 'Tab label', file: 'File name',
    linkLabel: 'Link label', linkHref: 'Link URL', cards: 'Tool cards', name: 'Tool name', text: 'Description', limits: 'Limits line', promptLabel: 'Prompt label', promptButton: 'Prompt button label',
    promptLinkLabel: 'Prompt link label', promptLinkHref: 'Prompt link URL', promptHelper: 'Prompt helper line', items: 'Questions', q: 'Question', a: 'Answer' };
  var drawer = null, renderT = null;
  function lbl(k) { return (P.labels && P.labels[k]) || LABELS[k] || k; }
  function sing(k) { return lbl(k).replace(/s$/, ''); }
  function isLong(k, v) { return k === 'code' || k === 'sub' || k === 'body' || k === 'a' || k === 'prompt' || String(v).length > 70; }
  function field(path, key, val) {
    var id = 'f-' + path.join('-'), long = isLong(key, val), dp = esc(JSON.stringify(path));
    var input = long ? '<textarea id="' + id + '" data-path="' + dp + '" rows="' + (key === 'code' ? 7 : 3) + '"' + (key === 'code' ? ' class="code" spellcheck="false"' : '') + '>' + esc(val) + '</textarea>'
      : '<input type="text" id="' + id + '" data-path="' + dp + '" value="' + esc(val) + '">';
    return '<div class="rv-f"><label for="' + id + '">' + esc(lbl(key)) + '</label>' + input + '</div>';
  }
  function group(path, obj) {
    var h = '';
    Object.keys(obj).forEach(function (k) {
      var v = obj[k], p = path.concat(k);
      if (typeof v === 'string') h += field(p, k, v);
      else if (Array.isArray(v) && (v.length === 0 || typeof v[0] === 'string')) {
        h += '<div class="rv-f"><label>' + esc(lbl(k)) + '</label>' + v.map(function (s, i) {
          return '<div class="rv-row"><input type="text" aria-label="' + esc(sing(k)) + ' ' + (i + 1) + '" data-path="' + esc(JSON.stringify(p.concat(i))) + '" value="' + esc(s) + '"><button type="button" class="rv-mini" data-rm="' + esc(JSON.stringify(p.concat(i))) + '" aria-label="Remove ' + esc(sing(k)) + ' ' + (i + 1) + '">×</button></div>';
        }).join('') + '<button type="button" class="rv-mini rv-mini--add" data-add="' + esc(JSON.stringify(p)) + '" data-kind="str">Add ' + esc(sing(k).toLowerCase()) + '</button></div>';
      } else if (Array.isArray(v)) {
        h += '<div class="rv-f"><label>' + esc(lbl(k)) + '</label>' + v.map(function (o, i) {
          return '<div class="rv-item"><div class="rv-item__h">' + esc(sing(k)) + ' ' + (i + 1) + '<button type="button" class="rv-mini" data-rm="' + esc(JSON.stringify(p.concat(i))) + '">Remove</button></div>' + group(p.concat(i), o) + '</div>';
        }).join('') + '<button type="button" class="rv-mini rv-mini--add" data-add="' + esc(JSON.stringify(p)) + '" data-kind="obj">Add ' + esc(sing(k).toLowerCase()) + '</button></div>';
      }
    });
    return h;
  }
  function getAt(path) { var o = C; for (var i = 0; i < path.length; i++) o = o[path[i]]; return o; }
  function setAt(path, v) { var o = C; for (var i = 0; i < path.length - 1; i++) o = o[path[i]]; o[path[path.length - 1]] = v; }
  function dirty() { return JSON.stringify(C) !== saved; }
  function markDirty() { var d = $('.rv-dh .dirty', drawer); if (d) d.hidden = !dirty(); var sv = $('#rvSave'); if (sv) sv.disabled = !dirty() || !online || !editingOn; }
  function scheduleRender() { clearTimeout(renderT); renderT = setTimeout(render, 150); markDirty(); }
  function buildForm() {
    $('.rv-db', drawer).innerHTML = P.sections.map(function (s, i) {
      return '<details' + (i === P.sections.length - 1 ? ' open' : '') + '><summary>' + esc(s[1]) + '</summary><div class="rv-group">' + group([s[0]], C[s[0]]) + '</div></details>';
    }).join('');
  }
  function openDrawer() {
    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.className = 'rv-drawer'; drawer.setAttribute('aria-label', 'Edit copy');
      drawer.innerHTML = '<div class="rv-dh"><b>Edit copy</b><span class="dirty" hidden>Unsaved changes</span><button type="button" class="rv-x" aria-label="Close">×</button></div>' +
        '<div class="rv-db"></div><div class="rv-df">' +
        '<div class="rv-f"><label for="rvNote">What changed (shown under Versions)</label><input type="text" id="rvNote" maxlength="200" placeholder="e.g. FAQ 4 reworded after Product review"></div>' +
        '<div class="rv-f" id="rvPassF"><label for="rvPass">Editor passcode</label><input type="password" id="rvPass" autocomplete="off"></div>' +
        '<div class="rv-actions"><button type="button" class="rv-btn rv-btn--primary" id="rvSave" disabled>Save new version</button><button type="button" class="rv-btn" id="rvDiscard">Discard changes</button></div>' +
        '<div class="rv-msg" id="rvMsg" aria-live="polite"></div></div>';
      document.body.appendChild(drawer);
      $('.rv-x', drawer).addEventListener('click', function () { drawer.hidden = true; });
      drawer.addEventListener('input', function (e) {
        var p = e.target.getAttribute('data-path'); if (!p) return;
        setAt(JSON.parse(p), e.target.value); scheduleRender();
      });
      drawer.addEventListener('click', function (e) {
        var rm = e.target.closest('[data-rm]'), add = e.target.closest('[data-add]');
        if (rm) { var p = JSON.parse(rm.getAttribute('data-rm')), arr = getAt(p.slice(0, -1)); arr.splice(p[p.length - 1], 1); buildForm(); scheduleRender(); }
        if (add) {
          var ap = JSON.parse(add.getAttribute('data-add')), a = getAt(ap);
          if (add.getAttribute('data-kind') === 'str') a.push('');
          else { var tmpl = {}; Object.keys(a[0] || { q: '', a: '' }).forEach(function (k) { tmpl[k] = (!a[0] || typeof a[0][k] === 'string') ? '' : []; }); a.push(tmpl); }
          buildForm(); scheduleRender();
        }
      });
      $('#rvDiscard', drawer).addEventListener('click', function () { C = JSON.parse(saved); buildForm(); render(); markDirty(); $('#rvMsg').textContent = 'Changes discarded.'; });
      $('#rvSave', drawer).addEventListener('click', save);
    }
    if (panel) panel.hidden = true;
    if (sstore('dxrv-pass')) $('#rvPass').value = sstore('dxrv-pass');
    $('#rvMsg').textContent = !online ? 'The review service isn’t reachable, so changes can preview but not save.' : !editingOn ? 'Saving is off: no editor passcode is set for this site (EDITOR_PASSCODE in Vercel).' : 'Changes preview live. Saving publishes a new version for everyone.';
    buildForm(); markDirty(); drawer.hidden = false;
  }
  function save() {
    if (!dirty()) return;
    var pass = $('#rvPass').value, note = $('#rvNote').value.trim() || 'Copy edits';
    if (!pass) { $('#rvPass').focus(); $('#rvMsg').textContent = 'Enter the editor passcode to save.'; return; }
    var btn = $('#rvSave'); btn.disabled = true; $('#rvMsg').textContent = 'Saving…';
    var author = store('dxrv-name') || 'Editor';
    api('/content', { method: 'POST', body: { page: P.slug, content: C, note: note, author: author, passcode: pass } }).then(function (j) {
      sstore('dxrv-pass', pass); saved = JSON.stringify(C); versions.unshift(j.version); setStatus(); markDirty();
      $('#rvNote').value = ''; $('#rvMsg').textContent = 'Saved as version ' + versions.length + '. Everyone sees it on their next page load.';
      toast('New version saved.');
    }, function (err) {
      if (err.status === 401) { sstore('dxrv-pass', null); $('#rvPass').value = ''; $('#rvPass').focus(); }
      $('#rvMsg').textContent = err.message; markDirty();
    });
  }
  window.addEventListener('beforeunload', function (e) { if (C && dirty()) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- boot ---------- */
  var base = fetch('content.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
  var remote = api('/content?page=' + encodeURIComponent(P.slug)).then(function (j) { return j; }, function (err) { return { error: err }; });
  Promise.all([base, remote]).then(function (r) {
    var j = r[1];
    C = (j && j.content) || r[0]; saved = JSON.stringify(C);
    bar(); render();
    if (j && j.error) { offline(j.error.message); }
    else { online = true; versions = j.versions || []; editingOn = !!j.editing; refreshComments(); }
    setStatus();
    setInterval(function () { if (!document.hidden && online) refreshComments(); }, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && online) refreshComments(); });
  }).catch(function () { app.innerHTML = '<p class="rv-fatal">The page content didn’t load. Reload to try again.</p>'; });
})();
