// Page-chrome and stylesheet tests for index.html.
// Run: node --test test/chrome.test.js
//
// ---------------------------------------------------------------------------
// TEST MANIFEST — halo-hunter structure + polish pass, 2026-07-31
// ---------------------------------------------------------------------------
// S1  "the intro leads with the gaps block and only then explains SB 53"
// S2  "the hero copy carries the polarity-first and trimmed-passage fixes"
// S3  "the SB 53 explainer is two sentences, in the owner's own words"
// S4  "the header stack is one subtitle; the scope note moved to the left column"
// S5  "nav demotes the state pills, renames the board pill, and #/ is not current on a state view"
// S6  "the legend and left-column heading say what they mean"
// S7  "the maintainer span is closed and the footer carries no duplicated promise"
// P1  "layout: no viewport-height magic number, flex column shell, capped measure"
// P2/P3 "type and colour: demoted --orth, links decoupled from map green, ringed swatches"
// P4  "the scope note is styled as a left-ruled aside"
// P5  "the board and citations views centre a single readable column"
// P6  "rails, radii tokens and the 4/8 spacing snap"
// P7  "citation chips and the details/summary affordance"
//
// Rendering behaviour (routes, panels, the intro's *content*) is covered next door in
// test/render.test.js. This file exists because the two together exceed the 300-line
// cap, and because chrome regressions have a different cause: a careless copy edit or a
// stylesheet tidy-up, not a logic change.
//
// These assert against index.html as TEXT, deliberately. The stub DOM used by
// render.test.js has no layout engine and no cascade, so a CSS defect (the old
// viewport-height magic number, the Map pill highlighting on a state view) is invisible
// to it. Text pins are crude but they catch the exact defects the review named.
// ---------------------------------------------------------------------------
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// Document regions, sliced once. Slicing keeps each assertion honest about WHERE a
// string lives: "not in the header" is a different claim from "not on the page".
const INTRO = INDEX.slice(INDEX.indexOf('<template id="intro">'), INDEX.indexOf("</template>"));
const STYLE = INDEX.slice(INDEX.indexOf("<style>"), INDEX.indexOf("</style>"));
const HEADER = INDEX.slice(INDEX.indexOf("<header>"), INDEX.indexOf("</header>"));
const FOOTER = INDEX.slice(INDEX.indexOf("<footer>"), INDEX.indexOf("</footer>"));

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

/** WCAG relative luminance, for checking a swatch that backs white text. */
function relativeLuminance(hex) {
  const ch = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Contrast ratio against white (#fff), the text colour on every pill and badge. */
function contrastWithWhite(hex) {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

// ---------------------------------------------------------------------------
// S1-S7 — structure. These pin document ORDER and exact chrome copy, which is what a
// careless edit silently reverses: the page still renders, it just argues badly.
// ---------------------------------------------------------------------------

// S1 — the gaps are the story; the SB 53 explainer is background. Before this pass the
// page opened with background, so the reader met the baseline before the point.
test("the intro leads with the gaps block and only then explains SB 53", () => {
  const gapsHead = INTRO.indexOf("<h2>The gaps are the headline</h2>");
  const shows = INTRO.indexOf("<h4>What this map shows</h4>");
  const sb53 = INTRO.indexOf("California&rsquo;s SB 53");
  const verification = INTRO.indexOf("<strong>Independent verification.</strong>");
  const board = INTRO.indexOf("See the full board");
  assert.ok(gapsHead > 0, "the gaps header must be an h2, not an h4");
  assert.ok(!INTRO.includes("<h4>The gaps are the headline</h4>"), "h4 must be promoted");
  assert.ok(shows > 0, "the SB 53 explainer needs its own h4");
  assert.ok(gapsHead < shows, "gaps block precedes the explainer heading");
  assert.ok(verification < shows, "all three gaps precede the explainer");
  assert.ok(shows < sb53, "the explainer heading sits above the SB 53 paragraphs");
  // The board link stands on its own line, not trailing the Illinois sentence, where it
  // read as part of the audit claim.
  assert.ok(board > verification, "board link follows the third gap");
  assert.match(INTRO.slice(board - 40, board), /<p>\s*<a href="#\/categories">$/,
    "the board link must be its own paragraph");
});

// S2 — polarity first. "One state requires anything here" reads as a count; "Only one
// state" reads as the gap, which is the claim the block is making.
test("the hero copy carries the polarity-first and trimmed-passage fixes", () => {
  assert.ok(INTRO.includes("<strong>Internal-use transparency.</strong> Only one state requires anything here:"),
    "gap polarity must lead the internal-use paragraph");
  assert.ok(!/[^y] One state requires anything here/.test(INTRO),
    "the bare 'One state' phrasing is gone");
  assert.ok(INTRO.includes('invisible to the public, policymakers, and third-party auditors. <span class="attrib">'),
    "the trimmed passage ends on the auditors sentence, attribution kept");
  assert.ok(!INTRO.includes("flying blind"), "third borrowed sentence trimmed");
  assert.ok(!INTRO.includes("sabotaged"), "third borrowed sentence trimmed");
  assert.ok(INTRO.includes("(signed July 2026), but audits do not begin until 2028"),
    "the concessive 'but' replaces the flat 'and' — the delay cuts against the first state claim");
});

// S3 — the owner's own framing. Only the sentence boundary changes. His words, and
// especially "entails", must survive verbatim: a reworded explainer is a regression here
// even if it reads well.
test("the SB 53 explainer is two sentences, in the owner's own words", () => {
  assert.ok(INTRO.includes("for state-level legislation since. Most state bills focused on frontier AI companies have largely copied SB 53, with a few tweaks."),
    "the 60-word sentence must split at the colon");
  assert.ok(!INTRO.includes("legislation since: most state bills"), "the colon splice is gone");
  assert.ok(INTRO.includes("what the combined body of state law entails"),
    "the owner's 'entails' is untouched");
});

// S4 — the header was carrying a definition, a thesis and a scope caveat before the
// reader saw the map. The caveat belongs next to the thing it qualifies.
test("the header stack is one subtitle; the scope note moved to the left column", () => {
  assert.ok(HEADER.includes('<p class="sub">The strongest state law on each axis &mdash; and the gaps no state has filled.</p>'),
    ".sub is exactly the axis/gaps line");
  assert.ok(!HEADER.includes("AI resilience"), "the definition sentence is deleted from the header");
  assert.ok(!HEADER.includes('class="sub2"'), "the scope note must leave the header");
  const legendCaveat = INDEX.indexOf("States shown grey have no comprehensive frontier AI statute");
  const scope = INDEX.indexOf('<p class="sub2">');
  assert.ok(scope > legendCaveat, "the scope note renders under the grey-states caveat");
  assert.ok(INDEX.indexOf('id="chips"') > scope, "and above the chips block");
});

// S5 — four state shortcuts styled as peers of Map and Board made the nav read as eight
// equal destinations. Also fixes a real defect: the current-state selector highlighted
// Map whenever a state was open, so the nav lied about where you were.
test("nav demotes the state pills, renames the board pill, and never marks #/ current on a state view", () => {
  for (const st of ["#/CA", "#/NY", "#/IL"]) {
    assert.match(HEADER, new RegExp('<a class="statelink" href="' + st.replace("/", "\\/") + '"'),
      st + " must be a secondary-tier text link");
  }
  assert.ok(STYLE.includes("nav a.statelink"), "the secondary tier needs its own rule");
  const rule = STYLE.slice(STYLE.indexOf("nav a.statelink"));
  assert.match(rule.slice(0, 200), /border-color:transparent|border:0/, "state links lose their border");
  assert.match(rule.slice(0, 200), /background:none|background:transparent/, "state links lose their background");
  assert.ok(HEADER.includes("The board &mdash; strongest state per axis &rarr;"), "board pill renamed");
  assert.ok(!HEADER.includes("Goes furthest vs. the SB 53 baseline"), "old pill wording gone");
  assert.ok(!STYLE.includes('body[data-view="state"] nav a[href="#/"]'),
    "a clicked state must not highlight the Map pill");
  assert.ok(STYLE.includes('body[data-view="map"] nav a[href="#/"]'), "map view still highlights Map");
});

// S6 — the old labels described our process ("not yet reviewed") or over-claimed a
// taxonomy ("AI usage law"). Both now say what the colour means to a reader.
test("the legend and left-column heading say what they mean", () => {
  assert.ok(INDEX.includes("No frontier statute found"), "grey label renamed");
  assert.ok(!INDEX.includes("Not yet reviewed"), "the 'not yet reviewed' label is gone");
  assert.ok(INDEX.includes("Not frontier law &mdash; AI usage (deepfakes, hiring)"), "usage label renamed");
  assert.ok(!INDEX.includes("AI usage law (deepfakes, hiring, consumer disclosure)"), "old usage label gone");
  assert.ok(INDEX.includes("The seven states with a record &mdash; click for the SB 53 comparison"),
    "the chips heading tells the reader the affordance");
});

// S7 — the maintainer span was never closed, so every following node inherited it, and
// the footer repeated the sourcing promise the citations page already makes.
test("the maintainer span is closed and the footer carries no duplicated promise", () => {
  assert.ok(FOOTER.includes('<span id="maintainer"></span>'), "the span must be closed and empty");
  assert.ok(!FOOTER.includes("Every provision on this site carries its source"),
    "the sourced promise is duplicated chrome");
  assert.ok(FOOTER.includes('href="mailto:jay.ifp.automation@gmail.com"'), "corrections mailto stays");
  // Balance across the whole document, which the unclosed span broke.
  assert.strictEqual(countOf(INDEX, "<span"), countOf(INDEX, "</span>"), "span tags balance");
  assert.strictEqual(countOf(INDEX, "<template"), countOf(INDEX, "</template>"), "template tags balance");
});

// ---------------------------------------------------------------------------
// P1-P7 — polish. Regression pins on the specific stylesheet defects the review named.
// ---------------------------------------------------------------------------

// P1 — the old main had height:calc(100vh - Npx), which hard-coded the header+footer
// height: any wrapped line in either one, at any width, broke the fold.
test("layout: no viewport-height magic number, flex column shell, capped measure", () => {
  assert.ok(!STYLE.includes("calc(100vh - 132px)"), "the magic height must go");
  assert.match(STYLE, /body\{[^}]*display:flex[^}]*flex-direction:column[^}]*min-height:100vh/,
    "the shell is a flex column");
  assert.match(STYLE, /main\{[^}]*flex:1 1 auto[^}]*min-height:0/, "main grows instead of being pinned");
  assert.ok(STYLE.includes("minmax(420px,1.25fr) minmax(360px,1fr)"), "map column gets the wider track");
  assert.match(STYLE, /\.lede,#panel p\{max-width:62ch\}/, "prose measure capped at 62ch");
});

// P2 / P3 — the purple --orth read as a fourth status with equal weight to the greens,
// and prose links borrowed the map's frontier green, so every link looked like a status.
test("type and colour: demoted --orth, links decoupled from map green, ringed swatches", () => {
  assert.match(STYLE, /h1\{font:600 clamp\(26px,2\.3vw,34px\)\/1\.15 var\(--serif\)/);
  assert.match(STYLE, /h2\{font:600 21px\/1\.3 var\(--serif\)/, "h2 set once, in the serif shorthand");
  assert.match(STYLE, /\.sub\{[^}]*font-size:15\.5px[^}]*max-width:62ch/);
  const orth = /--orth:(#[0-9a-f]{6})/i.exec(STYLE);
  assert.ok(orth, "--orth must be defined");
  assert.strictEqual(orth[1].toLowerCase(), "#5f6875", "the purple is demoted to a slate grey");
  // The demoted colour still backs white-text pills and chips, so it must clear WCAG AA.
  assert.ok(contrastWithWhite(orth[1]) >= 4.5,
    "--orth must hold 4.5:1 against white text, got " + contrastWithWhite(orth[1]).toFixed(2));
  assert.match(STYLE, /a\{color:var\(--ink\);text-decoration-color:#a9b1ba;text-underline-offset:2px\}/,
    "links must not borrow the map's frontier green");
  assert.ok(STYLE.includes("nav a:hover{border-color:var(--accent);color:var(--accent)}"), "nav hover kept");
  assert.match(STYLE, /\.legend i\{[^}]*box-shadow:inset 0 0 0 1px rgba\(18,22,28,\.20\)/,
    "the pale grey swatch needs an edge against the white card");
});

// P4 — the scope note is an aside now that it sits in the column, not header dressing.
test("the scope note is styled as a left-ruled aside, not italic body text", () => {
  const rule = STYLE.slice(STYLE.indexOf(".sub2{"), STYLE.indexOf("}", STYLE.indexOf(".sub2{")));
  assert.match(rule, /font-size:12\.5px/);
  assert.match(rule, /font-style:normal/);
  assert.match(rule, /border-left:2px solid var\(--line\)/);
  assert.match(rule, /padding-left:12px/);
});

// P5 — with the map hidden, the board and citations views were one 1fr column of
// edge-to-edge prose at any window width.
test("the board and citations views centre a single readable column", () => {
  assert.match(STYLE, /body\[data-view="categories"\] #panel,\s*body\[data-view="citations"\] #panel\{max-width:880px;margin:0 auto;padding:34px 32px 80px\}/);
  assert.match(STYLE, /\.cat\{max-width:none\}/, "the 72ch cap is released in the board view");
});

// P6 — three different horizontal rails (26/22/30px) and five ad-hoc radii.
test("rails, radii tokens and the 4/8 spacing snap", () => {
  assert.match(STYLE, /header\{[^}]*padding:18px 32px/);
  assert.match(STYLE, /#mapwrap\{padding:20px 32px/);
  assert.match(STYLE, /#panel\{padding:28px 36px 72px/);
  assert.match(STYLE, /--r-s:3px;--r-m:5px/, "radii tokens defined");
  assert.match(STYLE, /#chips \.chip\{[^}]*border-radius:var\(--r-m\)/);
  assert.match(STYLE, /\.meta span\{[^}]*border-radius:var\(--r-s\)/);
  assert.match(STYLE, /\.cite\{[^}]*border-radius:var\(--r-s\)/);
  assert.match(STYLE, /\.tag\{[^}]*border-radius:var\(--r-s\)/);
  assert.match(STYLE, /\.warn\{[^}]*border-radius:0 var\(--r-m\) var\(--r-m\) 0/);
  assert.match(STYLE, /h4\{[^}]*margin:32px 0 12px/);
  assert.match(STYLE, /\.bill\{margin-top:28px;padding-top:20px/);
  assert.match(STYLE, /\.cat\{[^}]*padding:20px 0/);
  assert.match(STYLE, /\.credit\{margin-top:16px/);
  assert.match(STYLE, /nav\{margin-top:16px/);
  // 999px survives only on the three genuinely pill-shaped elements: nav a, .pill, .conf.
  assert.strictEqual(countOf(STYLE, "999px"), 3, "no stray fully-round radii");
});

// P7 — cites are the page's visual signature and appear in dense runs, so they get a
// tighter size and a paler ground. Disclosure rows read as a label, not body copy.
test("citation chips and the details/summary affordance", () => {
  assert.match(STYLE, /\.cite\{[^}]*font-size:11\.5px/);
  assert.match(STYLE, /\.cite\{[^}]*background:#f4f6f3/);
  assert.match(STYLE, /\.cite\{[^}]*line-height:1\.5/);
  assert.match(STYLE, /summary\{[^}]*list-style:none/);
  assert.match(STYLE, /summary\{[^}]*text-transform:uppercase/);
  assert.match(STYLE, /summary::-webkit-details-marker\{display:none\}/);
  assert.match(STYLE, /summary::before\{content:"\+"/);
  // A CSS escape, not an HTML entity: the style element is raw text, so "&ndash;" would
  // print the literal characters. This bit once, hence the pin.
  assert.match(STYLE, /details\[open\]>summary::before\{content:"\\2013"\}/);
  assert.ok(!/content:"&#/.test(STYLE), "no HTML entities inside CSS content strings");
});

// NOT TESTED (green-team starting points):
//   - real layout: no engine here, so a broken grid, an overflow, or an unreadable line
//     length at a specific viewport width will still ship green.
//   - the @media(max-width:860px) block is asserted nowhere; the mobile stack is unpinned.
//   - computed cascade: these are text pins, so a later rule overriding an earlier one
//     (specificity or order) passes while the rendered page is wrong.
//   - contrast is checked for --orth only; --partial, --warn, --empty, --none-pill and
//     every hard-coded hex in the stylesheet are unverified against their text colour.
//   - focus-visible styling and keyboard traversal of the nav and chips.
//   - whether the maintainer span is actually populated at runtime (render.js writes it;
//     this file only asserts the empty, closed element ships).
