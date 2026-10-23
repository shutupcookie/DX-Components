/* HERE Docs MCP page: renders the page from its content JSON with the DX components.
   Elements marked data-rv-target are what reviewers can comment on. */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function nz(a) { return (a || []).filter(Boolean); }

  function heroCfg(h) {
    var k = DXHero.sample('snippet');
    k.eyebrow = h.eyebrow; k.heading = h.heading; k.sub = h.sub;
    k.copyField = { value: h.copyValue, label: h.copyLabel, copiedLabel: 'Copied' };
    k.primaryCta = { label: h.buttonLabel, href: h.buttonHref };
    k.trust = nz(h.trust);
    k.snippet = { file: h.snippetFile, prompt: h.prompt, chips: nz(h.chips), code: h.code, caption: h.caption };
    return { media: 'snippet', theme: 'dark', layout: 'horizontal', content: k, show: { caption: !!h.caption, trust: k.trust.length > 0 }, preventNav: true };
  }
  function setupCfg(s) {
    var k = DXHero.sample('tabs');
    k.eyebrow = s.eyebrow; k.heading = s.heading; k.sub = s.sub; k.steps = s.steps; k.tabs = s.tabs;
    k.copyField = { value: s.copyValue, label: s.copyLabel, copiedLabel: 'Copied' };
    k.secondaryCta = { label: s.linkLabel, href: s.linkHref };
    k.trust = nz(s.trust);
    return { media: 'tabs', theme: 'light', layout: 'horizontal', headingLevel: 2, content: k, show: { primaryCta: false, trust: k.trust.length > 0 }, preventNav: true };
  }
  function promptCfg(t) {
    var k = DXCta.sample();
    k.copyPrompt.label = t.promptLabel; k.copyPrompt.prompt = t.prompt; k.copyPrompt.buttonLabel = t.promptButton;
    k.copyPrompt.secondary = { label: t.promptLinkLabel, href: t.promptLinkHref, style: 'link' };
    k.copyPrompt.helper = nz(t.promptHelper);
    return { composition: 'single', action: 'copyPrompt', theme: 'light', context: false, content: k, show: { secondary: !!t.promptLinkLabel, helper: k.copyPrompt.helper.length > 0 }, preventNav: true };
  }
  function bandCfg(r) {
    var k = DXBanner.sample();
    k.button = { eyebrow: r.eyebrow, heading: r.heading, body: r.body, primary: { label: r.buttonLabel, href: r.buttonHref },
      secondary: { label: r.linkLabel, href: r.linkHref }, trust: nz(r.trust) };
    return { action: 'button', theme: 'dark', layout: 'split', content: k, show: { trust: k.button.trust.length > 0, secondary: !!r.linkLabel }, preventNav: true };
  }
  function wrap(target, label, comp, kind) {
    var w = document.createElement('div');
    w.className = 'rv-sec';
    w.setAttribute('data-rv-target', target); w.setAttribute('data-rv-label', label); w.setAttribute('data-rv-kind', 'section');
    w.setAttribute('data-comp', comp); w.setAttribute('data-comp-kind', kind);
    return w;
  }

  function render(C, app) {
    var keepOpen = Array.prototype.map.call(app.querySelectorAll('.faq details'), function (d) { return d.open; });
    app.innerHTML = '';
    var h = wrap('hero', '1 Hero', 'DX Hero 1 · DXH-SNP-H-DK', 'new'); DXHero.render(h, heroCfg(C.hero)); app.appendChild(h);
    var s = wrap('setup', '2 Set it up', 'DX Hero 6 · DXH-TAB-H-LT', 'new'); DXHero.render(s, setupCfg(C.setup)); app.appendChild(s);

    var t = C.tools, tw = wrap('tools', '3 What your agent can do', 'Existing · card grid', 'existing');
    tw.innerHTML = '<section class="sec sec--light" aria-label="' + esc(t.heading) + '"><div class="sec__in"><div class="sec__head">' +
      (t.eyebrow ? '<p class="sec__eyebrow">' + esc(t.eyebrow) + '</p>' : '') + '<h2 class="sec__h">' + esc(t.heading) + '</h2>' + (t.sub ? '<p class="sec__p">' + esc(t.sub) + '</p>' : '') + '</div>' +
      '<div class="cards">' + (t.cards || []).map(function (c) {
        return '<div class="tcard" data-rv-target="tool-' + esc(c.name) + '" data-rv-label="Tool card: ' + esc(c.name) + '"><code>' + esc(c.name) + '</code><p>' + esc(c.text) + '</p></div>';
      }).join('') + '</div>' + (t.limits ? '<p class="limits">' + esc(t.limits) + '</p>' : '') +
      '<div class="after-cards" data-cta-slot data-rv-target="prompt" data-rv-label="3b Try this prompt" data-comp="DX CTA 2 · DXC-SGL-PRM-LT" data-comp-kind="new"></div></div></section>';
    DXCta.render(tw.querySelector('[data-cta-slot]'), promptCfg(t));
    app.appendChild(tw);

    var b = wrap('run', '4 Run the code', 'DX Banner 1 · DXB-BTN-SP-DK', 'new'); DXBanner.render(b, bandCfg(C.runCode)); app.appendChild(b);

    var f = C.faq, fw = wrap('faq', '5 FAQ', 'Existing · FAQ accordion', 'existing');
    fw.innerHTML = '<section class="sec sec--canvas" aria-label="' + esc(f.heading) + '"><div class="sec__in"><div class="sec__head"><h2 class="sec__h">' + esc(f.heading) + '</h2></div><div class="faq">' +
      (f.items || []).map(function (it, i) {
        return '<details data-rv-target="faq-' + (i + 1) + '" data-rv-label="FAQ ' + (i + 1) + ': ' + esc(it.q) + '"' + ((keepOpen.length ? keepOpen[i] : i === 0) ? ' open' : '') + '><summary><span>' + esc(it.q) + '</span></summary><p>' + esc(it.a) + '</p></details>';
      }).join('') + '</div></div></section>';
    app.appendChild(fw);
  }

  window.DXReviewPage = {
    slug: 'docs-mcp',
    sections: [['hero', '1 Hero'], ['setup', '2 Set it up'], ['tools', '3 What your agent can do'], ['runCode', '4 Run the code'], ['faq', '5 FAQ']],
    render: render
  };
})();
