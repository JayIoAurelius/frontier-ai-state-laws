// Rendering smoke tests for render.js.
// Run: node --test test/render.test.js
//
// ---------------------------------------------------------------------------
// TEST MANIFEST — taxonomy restructure (12 -> 9), 2026-07-31
// ---------------------------------------------------------------------------
// R1 "the categories page renders all nine cells, once each"
// R2 "the categories page sorts the nine into six leaders, two converged, one empty"
// R3 "the empty cell shows its evidence, including the attributed minimum-bar quote"
// R4 "the framing lines the owner froze are still on the page"
// R5 "a per-state panel renders the reassigned provisions"
// R6 "the hero block names the three live gaps, not the five SB 1047-era asks"
// R7 "the NY warning box is titled respectfully"
// R8 "the SB 53 explainer box leads with Kodama's before/after line" (copy-voice swap)
// R9 "the citations page renders as its own route, off the main page"
//
// Page chrome (header stack, nav tiers, legend labels, footer, intro ORDER, and the
// whole <style> block) is covered next door in test/chrome.test.js — S1-S7 + P1-P7 of
// the 2026-07-31 halo-hunter pass. Split for the 300-line cap, not by subject.
// ---------------------------------------------------------------------------
// render.js is browser code with no exports, so it is driven the way the browser
// drives it: a stub DOM, then the DOMContentLoaded handler it registers. That is
// deliberately closer to production than calling an extracted pure function.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "states.json"), "utf8"));
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/** Boot render.js against a stub DOM and return a handle for driving the router. */
function boot(hash) {
  const els = {
    panel: { innerHTML: "" },
    chips: { innerHTML: "" },
    stamp: { textContent: "" },
    maintainer: { textContent: "" },
    intro: { innerHTML: "<p>intro copy</p>" },
  };
  let domReady = null;
  const hashHandlers = [];
  const sandbox = {
    console,
    location: { hash: hash },
    document: {
      body: { setAttribute: function () {} },
      getElementById: function (id) { return els[id] || null; },
      // No SVG in the stub: the map paths are decoration for these assertions.
      querySelectorAll: function () { return []; },
      createElementNS: function () { return { textContent: "", appendChild: function () {} }; },
      addEventListener: function (ev, fn) { if (ev === "DOMContentLoaded") domReady = fn; },
    },
    window: {
      addEventListener: function (ev, fn) { if (ev === "hashchange") hashHandlers.push(fn); },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "render.js"), "utf8"), sandbox);
  sandbox.window.LAWMAP_DATA = DATA;
  assert.ok(domReady, "render.js must register a DOMContentLoaded handler");
  domReady();
  return {
    html: function () { return els.panel.innerHTML; },
    go: function (h) {
      sandbox.location.hash = h;
      hashHandlers.forEach(function (fn) { fn(); });
      return els.panel.innerHTML;
    },
    chips: function () { return els.chips.innerHTML; },
  };
}

function countOf(haystack, needle) {
  return haystack.split(needle).length - 1;
}

// R1
test("the categories page renders all nine cells, once each", () => {
  const html = boot("#/categories").html();
  assert.strictEqual(DATA.categories.length, 9);
  for (const c of DATA.categories) {
    // Labels are HTML-escaped on the way out; only "&" would differ, and none contain one.
    assert.strictEqual(countOf(html, "<h3>" + c.label + "</h3>"), 1,
      c.category + " must render exactly one heading");
  }
});

// R2
test("the categories page sorts the nine into six leaders, two converged, one empty", () => {
  const html = boot("#/categories").html();
  assert.strictEqual(countOf(html, 'class="cat cat-conv"'), 2, "two converged cells");
  assert.strictEqual(countOf(html, 'class="cat cat-empty"'), 1, "one empty cell");
  assert.strictEqual(countOf(html, 'class="leader">'), 6, "six cells name a leading state");
  assert.strictEqual(countOf(html, ">The empty cell</h2>"), 1, "singular header for one empty cell");
});

// R3
test("the empty cell shows its evidence, including the attributed minimum-bar quote", () => {
  const html = boot("#/categories").html();
  const cell = html.slice(html.indexOf('class="cat cat-empty"'));
  assert.match(cell, /Substantive minimum-bar standards/);
  assert.match(cell, /nothing requiring those safety practices to meet any minimum bar for quality/);
  assert.match(cell, /Thomas Woodside/);
  assert.match(cell, /shall not deploy/, "NY's repealed prohibition is the evidence behind the cell");
  assert.match(cell, /tagged provision/, "the supporting provisions must be reachable");
});

// R4
test("the framing lines the owner froze are still on the page", () => {
  // S5 (2026-07-31) renamed the board pill; the *idea* — strongest state per axis — is
  // what the owner froze, not the old "goes furthest" phrasing.
  assert.ok(INDEX.includes("The board &mdash; strongest state per axis &rarr;</a>"),
    "the categories nav pill names the board");
  // S4 moved this line out of the header into the left column; it must still ship.
  assert.ok(INDEX.includes("This map measures distance from the SB 53 baseline on each axis"),
    "the distance-not-desirability line is frozen wording");
});

// R5
test("a per-state panel renders the reassigned provisions", () => {
  const app = boot("#/categories");
  const ca = app.go("#/CA");
  assert.match(ca, /California/);
  assert.match(ca, /INTERNAL use of frontier models/, "CA's internal-use duty still renders");
  assert.match(ca, /22757\.12\(d\)/);
  const ny = app.go("#/NY");
  assert.match(ny, /shall not deploy/);
  assert.match(ny, /ratcheted down/, "the trajectory badge survives the recategorisation");
});

/** Strip tags and the handful of entities this page uses, so copy can be pinned exactly. */
function plain(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&mdash;/g, "—")
    .replace(/&rarr;/g, "→")
    .replace(/&rsquo;/g, "’")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// R6 — Jay's ruling 2026-07-31: the five SB 1047-era asks are dead copy, and the hero's
// voice is borrowed, not authored. The block names the same three live gaps, but in the
// words of the people who argue them, with internal-use first (the owner's "big thing").
// Each gap must still map to a cell in the restructured taxonomy.
test("the hero block names the three live gaps, in borrowed words, not the five SB 1047-era asks", () => {
  const tpl = INDEX.slice(INDEX.indexOf('<template id="intro">'), INDEX.indexOf("</template>"));
  const text = plain(tpl);
  assert.ok(text.includes("The gaps are the headline"), "ruled header wording");
  // Secure AI Project's own sentence carries two of the three gaps at once.
  assert.ok(text.includes("there are still no requirements that company safety practices be reasonable or follow best practices, or that anyone outside the company check that they are followed"));
  assert.ok(text.includes("— Secure AI Project"));
  // Internal use leads, in Delaney and Acharya's words.
  assert.ok(text.includes("Internal-use transparency."));
  assert.ok(text.includes("invisible to the public, policymakers, and third-party auditors"));
  // S2 (2026-07-31) trimmed the borrowed passage to its first two sentences. The
  // "flying blind" sentence now lives only in data/states.json's citations record,
  // which is where copy.test.js C3 verifies it verbatim.
  assert.ok(!text.includes("policymakers are flying blind"),
    "the third borrowed sentence must be trimmed out of the hero");
  assert.ok(text.includes("— Oscar Delaney and Ashwin Acharya"));
  // Then the minimum bar, in Woodside's.
  assert.ok(text.includes("Substantive standards."));
  assert.ok(text.includes("nothing requiring those safety practices to meet any minimum bar for quality"));
  assert.ok(text.includes("— Thomas Woodside, Secure AI Project"));
  // Then verification, which stays in our verified voice because the fact is ours.
  assert.ok(text.includes("Independent verification."));
  assert.ok(text.includes("Illinois is the first state to require annual third-party audits (signed July 2026)"));
  assert.ok(text.includes("See the full board →"));
  assert.ok(tpl.includes('href="#/categories"'), "the board link stays wired");
  // The retired asks must not survive anywhere in the hero.
  for (const dead of ["private right of action", "researcher safe harbor", "shutdown requirement", "Five things"]) {
    assert.ok(!text.toLowerCase().includes(dead.toLowerCase()), "dead copy survives: " + dead);
  }
  // And each named gap must be backed by the data, not just asserted in prose.
  const bar = DATA.categories.find((c) => c.category === "minimum-bar-standards");
  assert.strictEqual(bar.strongest_state, null, "'no state requires' needs an empty cell behind it");
  assert.strictEqual(DATA.categories.find((c) => c.category === "independent-verification").strongest_state, "IL");
  assert.strictEqual(DATA.categories.find((c) => c.category === "internal-use-risk").strongest_state, "CA");
});

// R7
test("the NY warning box is titled respectfully, not as a dig at other trackers", () => {
  const ny = boot("#/NY").html();
  assert.ok(ny.includes("<strong>Reading note.</strong>"), "the warn box carries the neutral title");
  assert.ok(!/Stale-tracker/i.test(ny), "the competitor-poking label must be gone");
  // The content of the warning itself is unchanged.
  assert.match(ny, /Rpld &amp; add Art 44-B/);
});

// R8 — the explainer box no longer opens in our voice. It opens on the sb53.info
// before/after sentence, and only then hands off to our baseline-comparison sentence.
test("the SB 53 explainer box leads with Jay's template framing, no Kodama attribution", () => {
  const tpl = INDEX.slice(INDEX.indexOf('<template id="intro">'), INDEX.indexOf("</template>"));
  const text = plain(tpl);
  assert.ok(text.includes("is the first legislation in the United States regulating frontier AI companies"));
  assert.ok(text.includes("have largely copied SB 53, with a few tweaks"));
  assert.ok(text.includes("what the combined body of state law entails"));
  assert.ok(!text.includes("Miles Kodama"), "explainer carries no inline attribution");
  const baseline = text.indexOf("is read against SB 53: it copies SB 53, falls short of it, or goes beyond it.");
  assert.ok(baseline >= 0, "the reading rule survives");
  assert.ok(text.includes("Click any state for the comparison."), "the wayfinding line survives");
});

// R9 — the citations record is a separate route, so the main page stays clean.
test("the citations page renders as its own route, off the main page", () => {
  const app = boot("#/");
  const cites = app.go("#/citations");
  assert.match(cites, /Citations/);
  assert.ok(DATA.citations.length >= 15, "the citations record must be complete");
  for (const c of DATA.citations) {
    assert.ok(cites.includes(c.source), "citations page omits source " + c.source);
    assert.ok(cites.includes(c.used_in), "citations page omits the used_in mapping for " + c.source);
  }
  // It must not be bolted onto the landing view.
  const landing = app.go("#/");
  assert.ok(!landing.includes(DATA.citations[0].used_in), "citations must not render on the map view");
});

// NOT TESTED (green-team starting points):
//   - real layout/CSS: the stub DOM cannot catch a broken grid, overflow, or colour contrast.
//   - the SVG map wiring (querySelectorAll returns [] here), including click and keyboard routing.
//   - escaping of characters the stub never sees (no label or cite currently contains "&").
//   - whether a cell's cite actually supports the claim; nothing here reads a statute.
