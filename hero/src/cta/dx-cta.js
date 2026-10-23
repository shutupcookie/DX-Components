/* DX CTA renderer.
   DXCta.render(el, config) draws one CTA (optionally inside a mock page section)
   and wires copy, download → Marketo form (modal or inline), and analytics.
   Every interaction pushes "dx_cta_interaction" to window.adobeDataLayer. */
(function (root) {
  'use strict';

  var ICON = {
    copy: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" stroke="currentColor" stroke-width="1.4"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dl: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 12.5h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5h8l4 4V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 20V3.5Z" stroke="currentColor" stroke-width="1.5"/><path d="M14 3.5V8h4M12 11v5.5M9.5 14l2.5 2.5 2.5-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tick: '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  var COMPOSITIONS = ['single', 'pair', 'list', 'card'];
  var ACTIONS = ['copyUrl', 'copyCode', 'copyPrompt', 'download'];
  var VALID = {
    single: ['copyUrl', 'copyPrompt', 'download'],
    pair: ['copyUrl', 'copyPrompt', 'download'],
    list: ['copyUrl'],
    card: ['copyCode', 'copyPrompt']
  };
  var DEFAULT_ACTION = { single: 'copyUrl', pair: 'copyUrl', list: 'copyUrl', card: 'copyCode' };
  var NAMES = {
    single: 'Single', pair: 'Pair', list: 'List', card: 'Card',
    copyUrl: 'Copy URL', copyCode: 'Copy code', copyPrompt: 'Copy prompt', download: 'Download'
  };
  var CODES = { single: 'SGL', pair: 'PAR', list: 'LST', card: 'CRD', copyUrl: 'URL', copyCode: 'COD', copyPrompt: 'PRM', download: 'DWN' };
  var VARIANTS = [];
  COMPOSITIONS.forEach(function (c, i) {
    ['dark', 'light'].forEach(function (t, j) { VARIANTS.push({ n: i * 2 + j + 1, composition: c, theme: t, action: DEFAULT_ACTION[c] }); });
  });

  function variantId(c) { return 'DXC-' + CODES[c.composition] + '-' + CODES[c.action] + '-' + (c.theme === 'dark' ? 'DK' : 'LT'); }
  function variantOf(c) { for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].composition === c.composition && VARIANTS[i].theme === c.theme) return VARIANTS[i]; return VARIANTS[0]; }
  function variantName(c) { return NAMES[c.composition] + ' · ' + NAMES[c.action] + ' · ' + (c.theme === 'dark' ? 'Dark' : 'Light'); }

  /* ---- Sample content (HERE Documentation MCP, Routing, Sample Map Data) ---- */
  var SAMPLE = {
    copyUrl: {
      label: 'HERE documentation MCP URL', value: 'https://docs.here.com/mcp', buttonLabel: 'Copy the MCP URL', copiedLabel: 'Copied',
      secondary: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up', style: 'secondary' },
      helper: ['Free', 'No HERE account needed', 'Any HTTP MCP client']
    },
    copyPrompt: {
      label: 'Try this prompt', tag: 'Prompt', buttonLabel: 'Copy prompt', copiedLabel: 'Copied',
      prompt: 'Using the HERE documentation MCP server, show me the code for a HERE Routing API request for a truck route from Chicago to St. Louis.',
      secondary: { label: 'Set up the MCP server', href: '#setup', style: 'link' },
      helper: ['Works in Claude, Cursor and Copilot']
    },
    copyCode: {
      label: 'truck-route.http', buttonLabel: 'Copy', copiedLabel: 'Copied',
      code: 'GET https://router.hereapi.com/v8/routes\n  ?transportMode=truck\n  &origin=41.8781,-87.6298\n  &destination=38.6270,-90.1994\n  &return=summary\n  &apiKey=YOUR_API_KEY',
      secondary: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up', style: 'link' },
      helper: ['Replace YOUR_API_KEY with your key']
    },
    download: {
      label: 'Sample datasets', title: 'HERE sample map data', meta: 'RDF, Shapefile and 3D Landmarks samples · free for evaluation',
      buttonLabel: 'Download sample data', formId: '3451', formBehavior: 'modal', formAnchor: '#sample-data-form',
      formHeading: 'Get the sample data', formText: 'Tell us about your project. Your download links appear on the next screen and arrive by email.',
      secondary: { label: 'See what is in the data', href: '#datasets', style: 'link' },
      helper: ['Free for evaluation', 'Short form, then download links']
    },
    list: {
      title: 'Connection details',
      items: [
        { label: 'MCP server URL', value: 'https://docs.here.com/mcp' },
        { label: 'Server name', value: 'here-docs' },
        { label: 'Routing API base URL', value: 'https://router.hereapi.com/v8' },
        { label: 'Geocoding API base URL', value: 'https://geocode.search.hereapi.com/v1' }
      ],
      secondary: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up', style: 'link' },
      helper: ['Base URLs need an API key; the MCP URL does not']
    },
    card: {
      copyCode: { heading: 'Try a truck route in one call', description: 'Copy the request, add your API key and run it.' },
      copyPrompt: { heading: 'Ask your agent', description: 'Paste this into any agent connected to the HERE documentation MCP.' }
    },
    ctx: {
      copyUrl: { eyebrow: 'HERE Documentation MCP', h: 'Connect your agent in one line', p: 'The HERE documentation MCP server speaks HTTP. Add this URL to your tool’s MCP config and your agent can search current HERE guides and API references.' },
      copyPrompt: { eyebrow: 'Test the connection', h: 'Ask your agent something real', p: 'Once the server is connected, paste this prompt into your agent and check the tool trace.' },
      download: { eyebrow: 'Sample map data', h: 'Test real HERE map data before you commit', p: 'Load the samples into your GIS tool or pipeline and check coverage, formats and attributes.' },
      list: { eyebrow: 'Reference', h: 'Everything your agent or app needs to connect', p: 'Copy each value into your config. The API base URLs work with a free API key.' },
      article: { h: 'How to plan a truck-safe route with the HERE Routing API', paras: [
        'Trucks need routes that respect weight, height and hazardous-goods restrictions. The HERE Routing API handles these when you set the transport mode to truck.',
        'Start with one request: an origin, a destination and the truck mode. The response includes a summary with duration and length, so you can check the route before you add vehicle attributes.',
        'Next, add the vehicle’s dimensions and weight. The router then avoids bridges, tunnels and roads the truck cannot use.'
      ], sub: 'Add vehicle attributes' }
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sample() { return clone(SAMPLE); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function hl(code) {
    return String(code).split('\n').map(function (line) {
      if (/^\s*(\/\/|#)/.test(line)) return '<span class="c">' + esc(line) + '</span>';
      var out = '', last = 0, m, re = /("(?:[^"\\]|\\.)*")(\s*:)?|([?&])([A-Za-z_\[\]\.]+)(=)|^(\$ )/g;
      while ((m = re.exec(line))) {
        out += esc(line.slice(last, m.index));
        if (m[1]) out += '<span class="' + (m[2] ? 'k' : 's') + '">' + esc(m[1]) + '</span>' + (m[2] ? esc(m[2]) : '');
        else if (m[3]) out += esc(m[3]) + '<span class="k">' + esc(m[4]) + '</span>=';
        else if (m[6]) out += '<span class="p">$</span> ';
        last = re.lastIndex; if (m[0] === '') re.lastIndex++;
      }
      return out + esc(line.slice(last));
    }).join('\n');
  }

  function defaults(composition) {
    return {
      single: { label: true, helper: true, secondary: false },
      pair: { label: true, helper: true, secondary: true },
      list: { label: true, helper: false, secondary: false },
      card: { label: true, helper: true, secondary: true }
    }[composition];
  }

  /* ---- Pieces ---- */
  function copyBtn(kind, label, copied, cls) {
    return '<button type="button" class="dxc-btn ' + (cls || 'dxc-btn--primary dxc-btn--sm') + '" data-dxc-copy="' + kind + '" data-label="' + esc(label) + '" data-copied="' + esc(copied || 'Copied') + '" data-slot="4">' + ICON.copy + '<span>' + esc(label) + '</span></button>';
  }
  function helper(items) {
    items = (items || []).filter(Boolean); if (!items.length) return '';
    return '<p class="dxc-help" data-slot="6">' + items.map(function (t) { return '<span>' + ICON.tick + esc(t) + '</span>'; }).join('') + '</p>';
  }
  function secondary(sec, forceLink) {
    if (!sec || !sec.label) return '';
    var link = forceLink || sec.style === 'link';
    return '<a class="dxc-btn ' + (link ? 'dxc-btn--link' : 'dxc-btn--secondary') + '" href="' + esc(sec.href || '#') + '" data-dxc-cta="secondary" data-slot="5">' + esc(sec.label) + (link ? ICON.arrow : '') + '</a>';
  }
  function fieldBlock(d) {
    return '<div class="dxc-field"><span class="dxc-field__value" data-slot="3" data-copy-src>' + esc(d.value) + '</span>' + copyBtn('url', d.buttonLabel, d.copiedLabel) + '</div>';
  }
  function promptBlock(d) {
    return '<div class="dxc-prompt"><div class="dxc-prompt__top"><span class="dxc-tag">' + esc(d.tag || 'Prompt') + '</span>' +
      copyBtn('prompt', d.buttonLabel, d.copiedLabel, 'dxc-btn--ghost') + '</div><p class="dxc-prompt__text" data-slot="3" data-copy-src>' + esc(d.prompt) + '</p></div>';
  }
  function codeBlock(d) {
    return '<div class="dxc-code" data-slot="3"><div class="dxc-code__head"><span class="dxc-code__file">' + esc(d.label) + '</span>' +
      '<button type="button" class="dxc-copy-mini" data-dxc-copy="code" data-label="' + esc(d.buttonLabel || 'Copy') + '" data-copied="' + esc(d.copiedLabel || 'Copied') + '" data-slot="4">' + ICON.copy + '<span>' + esc(d.buttonLabel || 'Copy') + '</span></button></div>' +
      '<pre data-copy-src><code>' + hl(d.code) + '</code></pre></div>';
  }
  function dlBlock(d) {
    return '<div class="dxc-dl"><span class="dxc-dl__icon">' + ICON.file + '</span><div class="dxc-dl__txt" data-slot="3"><p class="dxc-dl__title">' + esc(d.title) + '</p><p class="dxc-dl__meta">' + esc(d.meta) + '</p></div>' +
      '<button type="button" class="dxc-btn dxc-btn--primary" data-dxc-download data-slot="4">' + ICON.dl + '<span>' + esc(d.buttonLabel) + '</span></button></div>';
  }
  function actionBlock(action, d) {
    if (action === 'copyUrl') return fieldBlock(d);
    if (action === 'copyPrompt') return promptBlock(d);
    if (action === 'copyCode') return codeBlock(d);
    return dlBlock(d);
  }

  function formHtml(d, uid) {
    return '<form class="dxc-form" data-dxc-form novalidate>' +
      '<h3 class="dxc-form__h" id="' + uid + '-fh">' + esc(d.formHeading) + '</h3><p class="dxc-form__p">' + esc(d.formText) + '</p>' +
      '<div class="dxc-form__grid"><label>First name<input type="text" autocomplete="given-name"></label><label>Last name<input type="text" autocomplete="family-name"></label></div>' +
      '<label>Business email<input type="email" autocomplete="email"></label>' +
      '<div class="dxc-form__grid"><label>Company<input type="text" autocomplete="organization"></label><label>Country<select><option>Germany</option><option>India</option><option>United Kingdom</option><option>United States</option></select></label></div>' +
      '<label>Intended use<select><option>Evaluate for a product</option><option>Proof of concept</option><option>Research</option><option>Other</option></select></label>' +
      '<label class="dxc-check"><input type="checkbox">Email me about HERE products and events (optional)</label>' +
      '<button type="submit" class="dxc-btn dxc-btn--primary">' + ICON.dl + '<span>Get the sample data</span></button>' +
      '<p class="dxc-form__meta">Prototype stand-in for Marketo form ' + esc(d.formId) + '</p></form>';
  }
  function formDone() {
    return '<div class="dxc-form__done"><b>Your sample data is ready</b><p>Download links for each dataset are below and in your inbox.</p>' +
      '<p><a class="dxc-btn dxc-btn--link" href="#" onclick="return false">RDF sample' + ICON.arrow + '</a></p>' +
      '<p><a class="dxc-btn dxc-btn--link" href="#" onclick="return false">Shapefile sample' + ICON.arrow + '</a></p>' +
      '<p><a class="dxc-btn dxc-btn--link" href="#" onclick="return false">3D Landmarks sample' + ICON.arrow + '</a></p></div>';
  }

  /* ---- Composition ---- */
  function build(c) {
    var k = c.content, s = c.show, a = c.action, d = k[a];
    var h = '';
    if (c.composition === 'single') {
      h += '<div class="dxc-stack">';
      if (s.label && d.label) h += '<p class="dxc-label" data-slot="2">' + esc(d.label) + '</p>';
      h += actionBlock(a, d);
      if (s.secondary) h += secondary(d.secondary, true);
      if (s.helper) h += helper(d.helper);
      h += '</div>';
    } else if (c.composition === 'pair') {
      h += '<div class="dxc-stack" style="width:100%">';
      if (s.label && d.label) h += '<p class="dxc-label" data-slot="2">' + esc(d.label) + '</p>';
      h += '<div class="dxc-pair' + (a === 'copyPrompt' ? ' dxc-pair--prompt' : '') + '">' + actionBlock(a, d) + (s.secondary ? secondary(d.secondary, a !== 'copyUrl') : '') + '</div>';
      if (s.helper) h += helper(d.helper);
      h += '</div>';
    } else if (c.composition === 'list') {
      var L = k.list;
      h += '<div class="dxc-stack" style="width:100%"><div class="dxc-list">';
      if (s.label && L.title) h += '<p class="dxc-list__title" data-slot="1">' + esc(L.title) + '</p>';
      h += '<ul class="dxc-list__rows">' + L.items.map(function (it, i) {
        return '<li class="dxc-list__row"><span class="dxc-list__k"' + (i === 0 ? ' data-slot="2"' : '') + '>' + esc(it.label) + '</span>' +
          '<span class="dxc-list__v" data-copy-src' + (i === 0 ? ' data-slot="3"' : '') + '>' + esc(it.value) + '</span>' +
          '<button type="button" class="dxc-btn dxc-btn--ghost" data-dxc-copy="url" data-item="' + esc(it.label) + '" data-label="Copy" data-copied="Copied" aria-label="Copy ' + esc(it.label) + '"' + (i === 0 ? ' data-slot="4"' : '') + '>' + ICON.copy + '<span>Copy</span></button></li>';
      }).join('') + '</ul></div>';
      if (s.secondary) h += secondary(L.secondary, true);
      if (s.helper) h += helper(L.helper);
      h += '</div>';
    } else { // card
      var C = k.card[a] || {};
      h += '<div class="dxc-card"><h3 class="dxc-card__h" data-slot="1">' + esc(C.heading) + '</h3>';
      if (s.label && C.description) h += '<p class="dxc-card__d" data-slot="2">' + esc(C.description) + '</p>';
      h += actionBlock(a, d);
      var foot = (s.helper ? helper(d.helper) : '') + (s.secondary ? secondary(d.secondary, true) : '');
      if (foot) h += '<div class="dxc-card__foot">' + foot + '</div>';
      h += '</div>';
    }
    return h;
  }

  function context(c, inner) {
    var x = c.content.ctx, a = c.action;
    if (c.composition === 'card') {
      var A = x.article;
      return '<div class="dxc-ctx"><div class="dxc-ctx__in"><div class="dxc-article"><div class="dxc-article__body">' +
        '<p class="dxc-ctx__eyebrow">Developer blog</p><h3 class="dxc-ctx__h">' + esc(A.h) + '</h3>' +
        A.paras.slice(0, 2).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        '<h4>' + esc(A.sub) + '</h4><p>' + esc(A.paras[2]) + '</p></div><div>' + inner + '</div></div></div></div>';
    }
    var t = c.composition === 'list' ? x.list : x[a];
    var form = (a === 'download' && c.content.download.formBehavior === 'inline')
      ? '<div class="dxc-formblock" id="' + c.uid + '-form">' + formHtml(c.content.download, c.uid) + '</div>' : '';
    return '<div class="dxc-ctx"><div class="dxc-ctx__in"><div class="dxc-ctx__head"><p class="dxc-ctx__eyebrow">' + esc(t.eyebrow) + '</p><h3 class="dxc-ctx__h">' + esc(t.h) + '</h3><p class="dxc-ctx__p">' + esc(t.p) + '</p></div>' + inner + form + '</div></div>';
  }

  /* ---- Behaviour ---- */
  function track(host, action, label, extra) {
    var c = host.__dxc || {};
    var payload = { event: 'dx_cta_interaction', dxCta: Object.assign({ action: action, label: label || '', variant: variantId(c), page: (root.location && root.location.pathname) || '' }, extra || {}) };
    try { (root.adobeDataLayer = root.adobeDataLayer || []).push(payload); } catch (e) {}
    try { host.dispatchEvent(new CustomEvent('dxcta:interaction', { bubbles: true, detail: payload })); } catch (e) {}
  }
  function copyText(text) {
    return new Promise(function (resolve) {
      function fallback() {
        var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select(); var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t); resolve(ok);
      }
      try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { resolve(true); }, fallback); return; } } catch (e) {}
      fallback();
    });
  }
  function selectText(node) {
    try { var r = document.createRange(); r.selectNodeContents(node); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch (e) {}
  }
  function setBtn(btn, state) {
    var span = btn.querySelector('span'), svg = btn.querySelector('svg');
    btn.classList.remove('is-done', 'is-fallback');
    if (state === 'done') { btn.classList.add('is-done'); span.textContent = btn.getAttribute('data-copied'); svg.outerHTML = ICON.check; }
    else if (state === 'fallback') { btn.classList.add('is-fallback'); span.textContent = /Mac/.test(navigator.platform) ? 'Press ⌘C' : 'Press Ctrl+C'; }
    else { span.textContent = btn.getAttribute('data-label'); svg.outerHTML = ICON.copy; }
  }

  function openModal(host, c) {
    var d = c.content.download, uid = c.uid;
    var wrap = document.createElement('div');
    wrap.className = 'dxc-modal dxc-modal--' + c.theme;
    wrap.innerHTML = '<div class="dxc-modal__box" role="dialog" aria-modal="true" aria-labelledby="' + uid + '-fh"><button type="button" class="dxc-modal__x" aria-label="Close">' + ICON.x + '</button>' + formHtml(d, uid) + '</div>';
    var opener = document.activeElement;
    (c.modalHost || document.body).appendChild(wrap);
    var first = wrap.querySelector('input'); if (first) first.focus();
    function close() { wrap.remove(); document.removeEventListener('keydown', onKey); if (opener && opener.focus) opener.focus(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.closest('.dxc-modal__x')) close(); });
    wireForm(wrap, host);
  }
  function wireForm(scope, host) {
    var f = scope.querySelector('[data-dxc-form]'); if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault(); track(host, 'form_submit_preview', 'Marketo ' + (host.__dxc.content.download.formId || ''));
      f.innerHTML = formDone();
    });
  }

  function wire(host, c) {
    host.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-dxc-copy]');
      if (btn) {
        var kind = btn.getAttribute('data-dxc-copy');
        var scope = btn.closest('.dxc-list__row, .dxc-field, .dxc-prompt, .dxc-code');
        var src = scope && scope.querySelector('[data-copy-src]');
        var text = src ? src.textContent : '';
        copyText(text).then(function (ok) {
          if (ok) setBtn(btn, 'done'); else { setBtn(btn, 'fallback'); if (src) selectText(src); }
          clearTimeout(btn.__t); btn.__t = setTimeout(function () { setBtn(btn, 'idle'); }, 1800);
        });
        track(host, kind === 'url' ? 'copy_url' : kind === 'code' ? 'copy_code' : 'copy_prompt', btn.getAttribute('data-item') || btn.getAttribute('data-label'));
        return;
      }
      var dl = e.target.closest('[data-dxc-download]');
      if (dl) {
        var d = c.content.download;
        track(host, 'download_click', d.buttonLabel, { formBehavior: d.formBehavior, formId: d.formId });
        if (d.formBehavior === 'inline') {
          var fb = host.querySelector('.dxc-formblock') || document.querySelector(d.formAnchor);
          if (fb) {
            fb.scrollIntoView({ behavior: 'smooth', block: 'start' });
            fb.classList.add('is-flash'); setTimeout(function () { fb.classList.remove('is-flash'); }, 1200);
            var i = fb.querySelector('input'); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 350);
          }
        } else openModal(host, c);
        return;
      }
      var cta = e.target.closest('[data-dxc-cta]');
      if (cta) { track(host, 'cta_click', cta.textContent, { slot: cta.getAttribute('data-dxc-cta') }); if (c.preventNav) e.preventDefault(); }
    });
    wireForm(host, host);
  }

  function normalize(cfg) {
    var c = Object.assign({ composition: 'single', theme: 'dark', context: true }, cfg || {});
    if (!c.action || VALID[c.composition].indexOf(c.action) < 0) c.action = DEFAULT_ACTION[c.composition];
    c.show = Object.assign(defaults(c.composition), c.show || {});
    c.content = c.content || sample();
    c.uid = 'dxc' + Math.random().toString(36).slice(2, 8);
    return c;
  }

  function render(el, cfg) {
    var c = normalize(cfg);
    var host = document.createElement('div');
    host.className = 'dxc dxc--' + c.theme + ' dxc--' + c.composition + (c.annotate ? ' dxc--annotate' : '');
    host.setAttribute('data-variant', variantId(c));
    var inner = build(c);
    host.innerHTML = c.context ? context(c, inner) : inner;
    host.__dxc = c;
    wire(host, c);
    el.innerHTML = ''; el.appendChild(host);
    return host;
  }

  root.DXCta = {
    render: render, normalize: normalize, defaults: defaults, sample: sample, highlight: hl,
    compositions: COMPOSITIONS, actions: ACTIONS, valid: VALID, defaultAction: DEFAULT_ACTION, names: NAMES,
    variants: VARIANTS, variantId: variantId, variantOf: variantOf, variantName: variantName
  };
})(window);
