/* DX Banner renderer. Requires dx-cta.js (DXCta) for copy and download actions.
   DXBanner.render(el, config) draws a full-width band and wires its action.
   Button clicks push "dx_banner_interaction"; copy/download events come from DX CTA. */
(function (root) {
  'use strict';

  var ICON = {
    arrow: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tick: '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var ACTIONS = ['button', 'copyUrl', 'copyCode', 'download'];
  var NAMES = { button: 'Button', copyUrl: 'Copy URL', copyCode: 'Copy code', download: 'Download', split: 'Split', stacked: 'Stacked' };
  var CODES = { button: 'BTN', copyUrl: 'URL', copyCode: 'COD', download: 'DWN', split: 'SP', stacked: 'ST' };
  var DEFAULT_LAYOUT = { button: 'split', copyUrl: 'split', copyCode: 'stacked', download: 'split' };
  var VARIANTS = [];
  ACTIONS.forEach(function (a, i) {
    ['dark', 'light'].forEach(function (t, j) { VARIANTS.push({ n: i * 2 + j + 1, action: a, theme: t, layout: DEFAULT_LAYOUT[a] }); });
  });
  function variantId(c) { return 'DXB-' + CODES[c.action] + '-' + CODES[c.layout] + '-' + (c.theme === 'dark' ? 'DK' : 'LT'); }
  function variantOf(c) { for (var i = 0; i < VARIANTS.length; i++) if (VARIANTS[i].action === c.action && VARIANTS[i].theme === c.theme) return VARIANTS[i]; return VARIANTS[0]; }
  function variantName(c) { return NAMES[c.action] + ' · ' + NAMES[c.layout] + ' · ' + (c.theme === 'dark' ? 'Dark' : 'Light'); }

  /* Sample copy per action (draft; offers and configs await Product) */
  var SAMPLE = {
    button: {
      eyebrow: 'Run the code', heading: 'Your agent wrote the code. Run it with a free API key.',
      body: 'Create a HERE Platform account to get your key, then run the request your agent wrote.',
      primary: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up' },
      secondary: { label: 'Not ready to add a card? Plan an evaluation with us', href: '#evaluation' },
      trust: ['Free to start', 'Docs and code samples included']
    },
    copyUrl: {
      eyebrow: 'HERE Documentation MCP', heading: 'Connect your agent in one line',
      body: 'Add this URL to your tool’s MCP config as an HTTP server. No API key, no HERE account.',
      secondary: { label: 'See setup for VS Code, Cursor and Claude Code', href: '#setup' },
      trust: ['Free', 'Any HTTP MCP client']
    },
    copyCode: {
      eyebrow: 'HERE Routing API', heading: 'Run a truck route in one call',
      body: 'Copy the request, add your API key and run it in your terminal or browser.',
      secondary: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up' },
      trust: ['Replace YOUR_API_KEY with your key']
    },
    download: {
      eyebrow: 'Sample map data', heading: 'Test real HERE map data before you commit',
      body: 'Samples in RDF and Shapefile formats, plus 3D Landmarks. Free for evaluation.',
      secondary: { label: 'See what is in the data', href: '#datasets' },
      trust: ['Short form, then download links']
    }
  };
  function sample() {
    var s = JSON.parse(JSON.stringify(SAMPLE));
    s.cta = root.DXCta ? root.DXCta.sample() : {};
    return s;
  }
  function defaults() { return { eyebrow: true, secondary: true, trust: true, art: true }; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function track(host, action, label) {
    var c = host.__dxb || {};
    var payload = { event: 'dx_banner_interaction', dxBanner: { action: action, label: label || '', variant: variantId(c), page: (root.location && root.location.pathname) || '' } };
    try { (root.adobeDataLayer = root.adobeDataLayer || []).push(payload); } catch (e) {}
    try { host.dispatchEvent(new CustomEvent('dxbanner:interaction', { bubbles: true, detail: payload })); } catch (e) {}
  }

  function normalize(cfg) {
    var c = Object.assign({ action: 'button', theme: 'dark' }, cfg || {});
    c.layout = c.layout || DEFAULT_LAYOUT[c.action];
    c.show = Object.assign(defaults(), c.show || {});
    c.content = c.content || sample();
    return c;
  }

  function render(el, cfg) {
    var c = normalize(cfg), k = c.content[c.action], s = c.show;
    var host = document.createElement('section');
    host.className = 'dxb dxb--' + c.theme + ' dxb--' + c.layout + ' dxb--' + c.action + (c.annotate ? ' dxb--annotate' : '');
    host.setAttribute('aria-label', k.heading || 'Banner');
    host.setAttribute('data-variant', variantId(c));
    var hTag = c.headingLevel === 3 ? 'h3' : 'h2';
    var h = (s.art && c.theme === 'dark') ? '<div class="dxb__art" aria-hidden="true"></div>' : '';
    h += '<div class="dxb__inner"><div class="dxb__grid"><div class="dxb__text">';
    if (s.eyebrow && k.eyebrow) h += '<p class="dxb__eyebrow" data-slot="1">' + esc(k.eyebrow) + '</p>';
    h += '<' + hTag + ' class="dxb__title" data-slot="2">' + esc(k.heading) + '</' + hTag + '>';
    if (k.body) h += '<p class="dxb__body" data-slot="3">' + esc(k.body) + '</p>';
    h += '</div><div class="dxb__action">';
    if (c.action === 'button') {
      h += '<div class="dxb__row"><a class="dxb__btn" data-slot="4" data-dxb-cta="primary" href="' + esc(k.primary.href) + '">' + esc(k.primary.label) + '</a>';
      if (s.secondary && k.secondary && k.secondary.label) h += '<a class="dxb__link" data-slot="5" data-dxb-cta="secondary" href="' + esc(k.secondary.href) + '">' + esc(k.secondary.label) + ICON.arrow + '</a>';
      h += '</div>';
    } else {
      h += '<div data-slot="4" data-dxb-block style="width:100%"></div>';
      if (s.secondary && k.secondary && k.secondary.label) h += '<a class="dxb__link" data-slot="5" data-dxb-cta="secondary" href="' + esc(k.secondary.href) + '">' + esc(k.secondary.label) + ICON.arrow + '</a>';
    }
    if (s.trust && k.trust && k.trust.filter(Boolean).length) h += '<p class="dxb__trust" data-slot="6">' + k.trust.filter(Boolean).map(function (t) { return '<span>' + ICON.tick + esc(t) + '</span>'; }).join('') + '</p>';
    h += '</div></div></div>';
    host.innerHTML = h;
    host.__dxb = c;

    // Copy / download actions are DX CTA blocks
    var slot = host.querySelector('[data-dxb-block]');
    if (slot && root.DXCta) {
      root.DXCta.render(slot, { composition: 'block', action: c.action, theme: c.theme, context: false, content: c.content.cta, preventNav: c.preventNav, modalHost: c.modalHost });
    }
    host.addEventListener('click', function (e) {
      var a = e.target.closest('[data-dxb-cta]');
      if (a) { track(host, 'cta_click', a.textContent, a.getAttribute('data-dxb-cta')); if (c.preventNav) e.preventDefault(); }
    });

    el.innerHTML = ''; el.appendChild(host);
    // Inline form placement: show the page's form section under the band (preview stand-in)
    if (c.action === 'download' && c.content.cta.download.formBehavior === 'inline' && c.showFormSection !== false && root.DXCta) {
      root.DXCta.renderFormBlock(el, c.theme === 'dark' ? 'light' : 'dark', c.content.cta);
    }
    return host;
  }

  root.DXBanner = { render: render, normalize: normalize, sample: sample, defaults: defaults, actions: ACTIONS, names: NAMES, variants: VARIANTS, defaultLayout: DEFAULT_LAYOUT, variantId: variantId, variantOf: variantOf, variantName: variantName };
})(window);
