/* Page examples builder. Renders a page from a section list using the DX components,
   labels each section with its component and variant, and lists the build. */
(function (root) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  function heroEntry(c) {
    var n = DXHero.normalize(c), k = n.content, s = n.show;
    var f = { media: n.media, theme: n.theme, layout: n.layout, headingLevel: n.headingLevel || 1, eyebrow: k.eyebrow, heading: k.heading, subheading: k.sub };
    if (s.steps) f.steps = k.steps;
    if (s.copyField) { f.copyField = { value: k.copyField.value, buttonLabel: k.copyField.label }; f.copyFieldPlacement = s.copyFieldPlacement; }
    if (s.primaryCta) f.primaryCta = k.primaryCta;
    if (s.secondaryCta) f.secondaryCta = k.secondaryCta;
    if (s.trust) f.trustItems = k.trust;
    if (n.media === 'snippet') f.snippet = { label: k.snippet.file, code: k.snippet.code, prompt: s.prompt ? k.snippet.prompt : undefined };
    else f.tabs = k.tabs.map(function (t) { return { label: t.label, fileName: t.file, code: t.code }; });
    return { contentType: 'dxHero', variant: DXHero.variantId(n), fields: f };
  }
  function ctaEntry(c) {
    var n = DXCta.normalize(c), d = n.content[n.action], s = n.show;
    var f = { composition: n.composition, action: n.action, theme: n.theme };
    if (n.composition === 'list') { f.heading = n.content.list.title; f.items = n.content.list.items; if (s.helper) f.helperItems = n.content.list.helper; }
    else {
      if (n.composition === 'card') { f.heading = n.content.card[n.action].heading; f.description = n.content.card[n.action].description; }
      else if (s.label) f.label = d.label;
      if (n.action === 'copyUrl') f.value = d.value;
      if (n.action === 'copyPrompt') f.prompt = d.prompt;
      if (n.action === 'copyCode') f.snippet = { fileName: d.label, code: d.code };
      f.buttonLabel = d.buttonLabel;
      if (s.secondary) f.secondaryCta = d.secondary;
      if (s.helper) f.helperItems = d.helper;
    }
    return { contentType: 'dxCta', variant: DXCta.variantId(n), fields: f };
  }
  function bannerEntry(c) {
    var n = DXBanner.normalize(c), k = n.content[n.action];
    var f = { action: n.action, layout: n.layout, theme: n.theme, eyebrow: k.eyebrow, heading: k.heading, body: k.body };
    if (n.action === 'button') f.primaryCta = k.primary;
    f.secondaryCta = k.secondary; f.trustItems = k.trust; f.backgroundArt = n.show.art;
    return { contentType: 'ctaBand (extended)', variant: DXBanner.variantId(n), fields: f };
  }

  function build(page) {
    var host = document.getElementById('page'), rows = [], entries = [];
    page.sections.forEach(function (sec, i) {
      var wrap = el('div', 'sec-wrap');
      var label, kind = 'new', entry = null;
      if (sec.type === 'hero') {
        DXHero.render(wrap, Object.assign({ preventNav: true }, sec.cfg));
        var hv = DXHero.variantOf(DXHero.normalize(sec.cfg));
        entry = heroEntry(sec.cfg); label = 'DX Hero ' + hv.n + ' · ' + entry.variant;
      } else if (sec.type === 'banner') {
        DXBanner.render(wrap, Object.assign({ preventNav: true, modalHost: document.body }, sec.cfg));
        var bv = DXBanner.variantOf(DXBanner.normalize(sec.cfg));
        entry = bannerEntry(sec.cfg); label = 'DX Banner ' + bv.n + ' · ' + entry.variant;
      } else {
        // Existing section, optionally with an embedded DX CTA
        kind = 'existing';
        var s = el('section', 'sec ' + (sec.ground === 'canvas' ? 'sec--canvas' : 'sec--light'));
        s.setAttribute('aria-label', sec.heading);
        var inner = '<div class="sec__in"><div class="sec__head">' + (sec.eyebrow ? '<p class="sec__eyebrow">' + esc(sec.eyebrow) + '</p>' : '') +
          '<h2 class="sec__h">' + esc(sec.heading) + '</h2>' + (sec.sub ? '<p class="sec__p">' + esc(sec.sub) + '</p>' : '') + '</div>';
        if (sec.type === 'cards') inner += '<div class="cards">' + sec.cards.map(function (c) { return '<div class="tcard"><code>' + esc(c[0]) + '</code><p>' + esc(c[1]) + '</p></div>'; }).join('') + '</div>' + (sec.limits ? '<p class="limits">' + esc(sec.limits) + '</p>' : '');
        if (sec.type === 'faq') inner += '<div class="faq">' + sec.items.map(function (q, j) { return '<details' + (j === 0 ? ' open' : '') + '><summary>' + esc(q[0]) + '</summary><p>' + q[1] + '</p></details>'; }).join('') + '</div>';
        if (sec.type === 'list') inner += '<div data-cta-slot></div>';
        inner += (sec.cta && sec.type !== 'list' ? '<div class="after-cards" data-cta-slot></div>' : '') + '</div>';
        s.innerHTML = inner; wrap.appendChild(s);
        label = sec.existingLabel;
        if (sec.type !== 'list') {
          rows.push({ n: i + 1, name: sec.name, comp: sec.existingLabel, kind: 'existing', entry: sec.existingEntry, note: sec.note });
          entries.push({ contentType: sec.existingEntry, note: 'existing component, content only', fields: { heading: sec.heading } });
        }
        if (sec.cta) {
          var slot = s.querySelector('[data-cta-slot]');
          var cw = el('div', ''); slot.appendChild(cw);
          DXCta.render(cw, Object.assign({ context: false, preventNav: true, modalHost: document.body }, sec.cta));
          var ce = ctaEntry(sec.cta), cv = DXCta.variantOf(DXCta.normalize(sec.cta));
          slot.setAttribute('data-comp', 'DX CTA ' + cv.n + ' · ' + ce.variant); slot.setAttribute('data-comp-kind', 'new');
          rows.push({ n: (i + 1) + (sec.type === 'list' ? '' : 'b'), name: sec.ctaName || sec.name, comp: 'DX CTA ' + cv.n, kind: 'new', variant: ce.variant, entry: 'dxCta', note: sec.ctaNote });
          entries.push(ce);
        }
        if (sec.type !== 'list') { wrap.setAttribute('data-comp', label); wrap.setAttribute('data-comp-kind', 'existing'); }
        host.appendChild(wrap);
        return;
      }
      wrap.setAttribute('data-comp', label); wrap.setAttribute('data-comp-kind', kind);
      rows.push({ n: i + 1, name: sec.name, comp: label.split(' · ')[0], kind: 'new', variant: entry.variant, entry: entry.contentType, note: sec.note });
      entries.push(entry);
      host.appendChild(wrap);
    });

    // Build list
    var tb = document.getElementById('buildRows');
    tb.innerHTML = rows.map(function (r) {
      return '<tr><td>' + esc(r.n) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.comp) + '</td><td>' + (r.variant ? '<code>' + esc(r.variant) + '</code>' : '—') + '</td><td><code>' + esc(r.entry) + '</code></td><td><span class="pill ' + (r.kind === 'new' ? 'pill--new">New component' : 'pill--ex">Existing') + '</span>' + (r.note ? '<span class="flag">' + esc(r.note) + '</span>' : '') + '</td></tr>';
    }).join('');
    var json = JSON.stringify({ page: page.url, entries: entries }, null, 2);
    var btn = document.getElementById('copyEntries');
    btn.addEventListener('click', function () {
      var done = function () { btn.textContent = 'Copied page entries'; setTimeout(function () { btn.textContent = 'Copy page entries (JSON)'; }, 1800); };
      try { navigator.clipboard.writeText(json).then(done, fb); } catch (e) { fb(); }
      function fb() { var t = document.createElement('textarea'); t.value = json; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove(); done(); }
    });

    // Overlay toggle
    var tg = document.getElementById('toggleComps');
    function set(on) { document.body.classList.toggle('show-components', on); tg.setAttribute('aria-pressed', String(on)); try { localStorage.setItem('dx-ex-show', on ? '1' : '0'); } catch (e) {} }
    var start = false; try { start = localStorage.getItem('dx-ex-show') === '1'; } catch (e) {}
    set(start);
    tg.addEventListener('click', function () { set(!document.body.classList.contains('show-components')); });
  }
  root.DXExample = { build: build };
})(window);
