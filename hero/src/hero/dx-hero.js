/* DX Hero renderer — one function, 8 variants.
   DXHero.render(el, config) draws the component into el and wires tabs + copy.
   Every interaction is pushed to window.adobeDataLayer as "dx_hero_interaction". */
(function (root) {
  'use strict';

  var ICON = {
    copy: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" stroke="currentColor" stroke-width="1.4"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h9.5M9 4.5 12.5 8 9 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dot: '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var VARIANTS = [
    { n: 1, media: 'snippet', layout: 'horizontal', theme: 'dark' },
    { n: 2, media: 'snippet', layout: 'horizontal', theme: 'light' },
    { n: 3, media: 'snippet', layout: 'vertical', theme: 'dark' },
    { n: 4, media: 'snippet', layout: 'vertical', theme: 'light' },
    { n: 5, media: 'tabs', layout: 'horizontal', theme: 'dark' },
    { n: 6, media: 'tabs', layout: 'horizontal', theme: 'light' },
    { n: 7, media: 'tabs', layout: 'vertical', theme: 'dark' },
    { n: 8, media: 'tabs', layout: 'vertical', theme: 'light' }
  ];
  function variantOf(c) {
    for (var i = 0; i < VARIANTS.length; i++) {
      var v = VARIANTS[i];
      if (v.media === c.media && v.layout === c.layout && v.theme === c.theme) return v;
    }
    return VARIANTS[0];
  }
  function variantId(c) {
    return 'DXH-' + (c.media === 'tabs' ? 'TAB' : 'SNP') + '-' + (c.layout === 'horizontal' ? 'H' : 'V') + '-' + (c.theme === 'dark' ? 'DK' : 'LT');
  }
  function variantName(c) {
    return (c.media === 'tabs' ? 'Code snippet tabs' : 'Code snippet') + ' · ' +
      (c.layout === 'horizontal' ? 'Horizontal' : 'Vertical') + ' · ' + (c.theme === 'dark' ? 'Dark' : 'Light');
  }

  /* Sample copy: HERE Documentation MCP (draft — Product verifies configs) */
  var SAMPLE = {
    snippet: {
      eyebrow: 'HERE Documentation MCP',
      heading: 'Give your AI coding agent the official HERE docs',
      sub: 'The HERE documentation MCP is a free MCP server that connects Claude, Cursor, Copilot or any HTTP MCP client to current HERE guides, API references and changelogs.',
      steps: [
        { title: 'Add the server', body: 'Drop `https://docs.here.com/mcp` into your tool\'s MCP config. That is the whole install.' },
        { title: 'Verify the tools', body: 'Ask your agent to list the HERE documentation MCP tools before you start building.' },
        { title: 'Ship accurate code', body: 'Ask for routes, maps or geocoding and your agent cites current HERE documentation.' }
      ],
      copyField: { value: 'https://docs.here.com/mcp', label: 'Copy the MCP URL', copiedLabel: 'Copied' },
      primaryCta: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up' },
      secondaryCta: { label: 'See setup', href: '#setup' },
      trust: ['Free', 'No HERE account needed', 'Any HTTP MCP client'],
      snippet: {
        file: 'AI coding agent · routes-request.http',
        prompt: 'Using the HERE documentation MCP server, show me the code for an API request to get a route from Chicago to St. Louis.',
        chips: ['search', 'get-endpoint', 'fetch'],
        code: 'GET https://router.hereapi.com/v8/routes\n  ?transportMode=car\n  &origin=41.8781,-87.6298\n  &destination=38.6270,-90.1994\n  &return=summary\n  &apiKey=YOUR_API_KEY',
        caption: 'Illustration. Final image: capture from the Claude walkthrough.'
      }
    },
    tabs: {
      eyebrow: 'Set it up',
      heading: 'Connected in under a minute',
      sub: 'Add one URL to your AI tool\'s MCP configuration. No API key, no HERE account, no authentication.',
      steps: [
        { title: 'Add the server', body: 'Add `https://docs.here.com/mcp` to your tool\'s MCP config as an HTTP server. Pick your client for the exact config.' },
        { title: 'Test the connection', body: 'Start a new chat and ask: "List the tools available from the HERE documentation MCP server."' },
        { title: 'Build, and check the trace', body: 'Ask for HERE code, then check the tool trace to confirm your agent used the MCP.' }
      ],
      copyField: { value: 'https://docs.here.com/mcp', label: 'Copy URL', copiedLabel: 'Copied' },
      primaryCta: { label: 'Get a free API key', href: 'https://platform.here.com/sign-up' },
      secondaryCta: { label: 'Step-by-step walkthrough', href: '#walkthrough' },
      trust: ['Works with any MCP client that supports HTTP'],
      tabs: [
        { label: 'VS Code', file: '.vscode/mcp.json', code: '{\n  "servers": {\n    "here-docs": {\n      "url": "https://docs.here.com/mcp",\n      "type": "http"\n    }\n  }\n}' },
        { label: 'Claude Code', file: 'Terminal', code: '# Add the HERE documentation MCP server\n$ claude mcp add --transport http here-docs https://docs.here.com/mcp\n\n# Check it is connected\n$ claude mcp list' },
        { label: 'Cursor', file: '.cursor/mcp.json', code: '{\n  "mcpServers": {\n    "here-docs": {\n      "url": "https://docs.here.com/mcp"\n    }\n  }\n}' },
        { label: 'Kiro', file: '.kiro/settings/mcp.json', code: '{\n  "mcpServers": {\n    "here-docs": {\n      "url": "https://docs.here.com/mcp"\n    }\n  }\n}' }
      ]
    }
  };

  function defaults(media) {
    var tabs = media === 'tabs';
    return {
      steps: tabs, copyField: true, copyFieldPlacement: tabs ? 'panel' : 'cta',
      primaryCta: true, secondaryCta: tabs, trust: true, prompt: !tabs, caption: false
    };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function rich(s) { return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>'); }

  /* Tiny highlighter for JSON, HTTP query strings and shell */
  function hl(code) {
    return String(code).split('\n').map(function (line) {
      if (/^\s*(\/\/|#)/.test(line)) return '<span class="c">' + esc(line) + '</span>';
      var out = '', last = 0, m;
      var re = /("(?:[^"\\]|\\.)*")(\s*:)?|([?&])([A-Za-z_\[\]\.]+)(=)|^(\$ )/g;
      while ((m = re.exec(line))) {
        out += esc(line.slice(last, m.index));
        if (m[1]) out += '<span class="' + (m[2] ? 'k' : 's') + '">' + esc(m[1]) + '</span>' + (m[2] ? esc(m[2]) : '');
        else if (m[3]) out += esc(m[3]) + '<span class="k">' + esc(m[4]) + '</span>=';
        else if (m[6]) out += '<span class="p">$</span> ';
        last = re.lastIndex;
        if (m[0] === '') re.lastIndex++;
      }
      return out + esc(line.slice(last));
    }).join('\n');
  }

  function track(rootEl, action, label, extra) {
    var c = rootEl.__dxh || {};
    var payload = {
      event: 'dx_hero_interaction',
      dxHero: Object.assign({ action: action, label: label || '', variant: variantId(c), page: (root.location && root.location.pathname) || '' }, extra || {})
    };
    try { (root.adobeDataLayer = root.adobeDataLayer || []).push(payload); } catch (e) {}
    try { rootEl.dispatchEvent(new CustomEvent('dxhero:interaction', { bubbles: true, detail: payload })); } catch (e) {}
  }

  function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
    } catch (e) {}
    return Promise.resolve(fallback());
    function fallback() {
      var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', '');
      t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(t);
    }
  }

  function copyField(cf, where) {
    return '<div class="dxh__field' + (where === 'panel' ? ' dxh__panel-foot' : '') + '">' +
      '<span class="dxh__field-value">' + esc(cf.value) + '</span>' +
      '<button type="button" class="dxh__btn dxh__btn--primary dxh__btn--small" data-dxh-copy="field" data-copy-value="' + esc(cf.value) + '" data-label="' + esc(cf.label) + '" data-copied="' + esc(cf.copiedLabel || 'Copied') + '">' +
      ICON.copy + '<span>' + esc(cf.label) + '</span></button></div>';
  }

  function build(c) {
    var k = c.content, s = c.show, tabs = c.media === 'tabs';
    var hTag = c.headingLevel === 2 ? 'h2' : 'h1';
    var h = '';

    // Text column
    h += '<div class="dxh__text">';
    h += '<div class="dxh__head">';
    if (k.eyebrow) h += '<p class="dxh__eyebrow" data-slot="2">' + esc(k.eyebrow) + '</p>';
    h += '<' + hTag + ' class="dxh__title" data-slot="1">' + esc(k.heading) + '</' + hTag + '>';
    h += '</div>';
    if (k.sub) h += '<p class="dxh__sub" data-slot="3">' + rich(k.sub) + '</p>';

    var stepsHtml = '';
    if (s.steps && k.steps && k.steps.length) {
      stepsHtml = '<ol class="dxh__steps" data-slot="4">' + k.steps.map(function (st, i) {
        return '<li class="dxh__step"><span class="dxh__step-num" aria-hidden="true">0' + (i + 1) + '</span>' +
          '<p class="dxh__step-title">' + esc(st.title) + '</p><p class="dxh__step-body">' + rich(st.body) + '</p></li>';
      }).join('') + '</ol>';
    }
    if (c.layout === 'horizontal') h += stepsHtml;

    var hasField = s.copyField && k.copyField && s.copyFieldPlacement === 'cta';
    var hasBtns = (s.primaryCta && k.primaryCta) || (s.secondaryCta && k.secondaryCta);
    if (hasField || hasBtns) {
      h += '<div class="dxh__cta" data-slot="6">';
      if (hasField) h += copyField(k.copyField, 'cta');
      if (hasBtns) {
        h += '<div class="dxh__cta-row">';
        if (s.primaryCta && k.primaryCta) h += '<a class="dxh__btn ' + (hasField ? 'dxh__btn--secondary' : 'dxh__btn--primary') + '" data-dxh-cta="primary" href="' + esc(k.primaryCta.href) + '">' + esc(k.primaryCta.label) + '</a>';
        if (s.secondaryCta && k.secondaryCta) {
          var link = !!(hasField || (s.primaryCta && k.primaryCta));
          h += '<a class="dxh__btn ' + (link ? 'dxh__btn--link' : 'dxh__btn--secondary') + '" data-dxh-cta="secondary" href="' + esc(k.secondaryCta.href) + '">' + esc(k.secondaryCta.label) + (link ? ICON.arrow : '') + '</a>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
    if (s.trust && k.trust && k.trust.length) {
      h += '<p class="dxh__trust" data-slot="7">' + k.trust.map(function (t) { return '<span>' + ICON.dot + esc(t) + '</span>'; }).join('') + '</p>';
    }
    h += '</div>';

    if (c.layout === 'vertical') h += stepsHtml;

    // Media column
    h += '<div class="dxh__media"><div data-slot="5"><div class="dxh__panel">';
    if (!tabs) {
      var sn = k.snippet;
      h += '<div class="dxh__panel-head"><span class="dxh__dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="dxh__file">' + esc(sn.file) + '</span>' +
        '<button type="button" class="dxh__copy" data-dxh-copy="code" data-label="Copy" data-copied="Copied">' + ICON.copy + '<span>Copy</span></button></div>';
      if (s.prompt && sn.prompt) {
        h += '<div class="dxh__prompt"><b>Prompt</b>' + esc(sn.prompt) + '</div>';
        if (sn.chips && sn.chips.length) h += '<div class="dxh__chips" aria-label="Tools called">' + sn.chips.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
      }
      h += '<pre class="dxh__code" data-code><code>' + hl(sn.code) + '</code></pre>';
    } else {
      var uid = 'dxh' + Math.random().toString(36).slice(2, 8);
      var active = Math.min(c.activeTab || 0, k.tabs.length - 1);
      h += '<div class="dxh__tabs" role="tablist" aria-label="Choose your client">';
      k.tabs.forEach(function (t, i) {
        h += '<button type="button" class="dxh__tab" role="tab" id="' + uid + '-t' + i + '" aria-controls="' + uid + '-p' + i + '" aria-selected="' + (i === active) + '" tabindex="' + (i === active ? 0 : -1) + '" data-tab="' + i + '">' + esc(t.label) + '</button>';
      });
      h += '</div>';
      k.tabs.forEach(function (t, i) {
        h += '<div class="dxh__tabpanel" role="tabpanel" id="' + uid + '-p' + i + '" aria-labelledby="' + uid + '-t' + i + '"' + (i === active ? '' : ' hidden') + '>' +
          '<div class="dxh__subhead"><span class="dxh__file">' + esc(t.file) + '</span>' +
          '<button type="button" class="dxh__copy" data-dxh-copy="code" data-label="Copy" data-copied="Copied">' + ICON.copy + '<span>Copy</span></button></div>' +
          '<pre class="dxh__code" data-code><code>' + hl(t.code) + '</code></pre></div>';
      });
      if (s.copyField && k.copyField && s.copyFieldPlacement === 'panel') h += copyField(k.copyField, 'panel');
    }
    h += '</div>';
    if (s.caption && !tabs && k.snippet.caption) h += '<p class="dxh__caption">' + esc(k.snippet.caption) + '</p>';
    h += '</div></div>';

    var cls = ['dxh', 'dxh--' + c.theme, 'dxh--' + c.layout, 'dxh--' + c.media];
    if (!hasField && !hasBtns && !(s.steps)) cls.push('dxh--bare');
    if (c.annotate) cls.push('dxh--annotate');
    return { cls: cls.join(' '), html: '<div class="dxh__inner"><div class="dxh__grid">' + h + '</div></div>' };
  }

  function wire(el, c) {
    el.addEventListener('click', function (e) {
      var tab = e.target.closest('.dxh__tab');
      if (tab) { select(tab); return; }
      var btn = e.target.closest('[data-dxh-copy]');
      if (btn) {
        var kind = btn.getAttribute('data-dxh-copy'), text;
        if (kind === 'field') text = btn.getAttribute('data-copy-value');
        else {
          var scope = btn.closest('.dxh__tabpanel') || btn.closest('.dxh__panel');
          var pre = scope.querySelector('[data-code]'); text = pre ? pre.textContent : '';
        }
        copyText(text);
        var span = btn.querySelector('span');
        btn.classList.add('is-copied'); span.textContent = btn.getAttribute('data-copied');
        btn.querySelector('svg').outerHTML = ICON.check;
        clearTimeout(btn.__t);
        btn.__t = setTimeout(function () {
          btn.classList.remove('is-copied'); span.textContent = btn.getAttribute('data-label');
          btn.querySelector('svg').outerHTML = ICON.copy;
        }, 1800);
        var activeTab = el.querySelector('.dxh__tab[aria-selected="true"]');
        track(el, kind === 'field' ? 'copy_url' : 'copy_code', activeTab ? activeTab.textContent : '');
        return;
      }
      var cta = e.target.closest('[data-dxh-cta]');
      if (cta) {
        track(el, 'cta_click', cta.textContent, { slot: cta.getAttribute('data-dxh-cta') });
        if (c.preventNav) e.preventDefault();
      }
    });
    el.addEventListener('keydown', function (e) {
      var tab = e.target.closest('.dxh__tab'); if (!tab) return;
      var all = Array.prototype.slice.call(el.querySelectorAll('.dxh__tab'));
      var i = all.indexOf(tab), n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % all.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + all.length) % all.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = all.length - 1;
      if (n !== null) { e.preventDefault(); select(all[n]); all[n].focus(); }
    });
    function select(tab) {
      var all = el.querySelectorAll('.dxh__tab');
      Array.prototype.forEach.call(all, function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
        var p = el.querySelector('#' + t.getAttribute('aria-controls')); if (p) p.hidden = !on;
      });
      if (c.onTab) c.onTab(+tab.getAttribute('data-tab'));
      track(el, 'tab_switch', tab.textContent);
    }
  }

  function normalize(cfg) {
    var c = Object.assign({ media: 'snippet', theme: 'dark', layout: 'horizontal' }, cfg || {});
    c.show = Object.assign(defaults(c.media), c.show || {});
    c.content = c.content || clone(SAMPLE[c.media]);
    return c;
  }

  function render(el, cfg) {
    var c = normalize(cfg);
    var out = build(c);
    var host = document.createElement('section');
    host.className = out.cls;
    host.setAttribute('aria-label', c.content.heading || 'Hero');
    host.setAttribute('data-variant', variantId(c));
    host.innerHTML = out.html;
    host.__dxh = c;
    wire(host, c);
    el.innerHTML = '';
    el.appendChild(host);
    return host;
  }

  root.DXHero = {
    render: render, normalize: normalize, defaults: defaults, sample: function (m) { return clone(SAMPLE[m]); },
    variants: VARIANTS, variantOf: variantOf, variantId: variantId, variantName: variantName, highlight: hl
  };
})(window);
