// Copy-provenance tests: the owner's 2026-07-31 ruling that the site's voice must be
// BORROWED, not authored — verbatim(ish) passages from named sources, used as plain site
// copy with inline attribution, plus a complete citations record.
// Run: node --test test/copy.test.js  (also required by logic.test.js)
//
// ---------------------------------------------------------------------------
// TEST MANIFEST — copy-voice replacement, 2026-07-31
// ---------------------------------------------------------------------------
// C1  "every category cell carries a linkable definition_source" (data record, not rendered)
// C2  "every state with a headline carries a linkable headline_source" (data record, not rendered)
// C3  "the harvested passages are on the page, verbatim"
// C4  "the harvests' DO-NOT-REUSE passages appear nowhere"
// C5  "citations[] is complete and well-formed"
// C6  "the citations route exists and renders one entry per source"
// C7  "no job title is attached to Thomas Woodside (the sources disagree)"
// C8  "borrowed passages run as plain copy, never in quotation-mark styling"
// C9  "the sb53.info licence position is recorded in citations"
// C10 "the frozen chrome the owner kept is still on the page"
// C11 "the main page stays clean: provenance strings never render in a cell"
// ---------------------------------------------------------------------------
// Owner's ruling, 2026-07-31: the citations PAGE is the complete provenance record.
// The main page carries inline attribution only where a sentence plainly reads as one
// person's claim (Beckstead on Illinois, Woodside on the minimum bar, Weil on audits,
// the Secure AI Project gap sentence, the Delaney/Acharya internal-use lines). Category
// definitions and state headlines run unattributed on the page by design.
// ---------------------------------------------------------------------------
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "states.json"), "utf8"));
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const SHIPPED = ["index.html", "app.js", "render.js", path.join("data", "states.json")];

/** Everything the reader can see, as one string: the template copy plus all data copy. */
function allCopy() {
  return INDEX + "\n" + fs.readFileSync(path.join(ROOT, "data", "states.json"), "utf8");
}

/** Load app.js the way logic.test.js does, for the router assertion. */
function lawmap() {
  const sandbox = {
    window: {},
    document: { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} },
    console,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), sandbox);
  return sandbox.window.Lawmap;
}

// Passages borrowed into the page. Each entry is [source label, exact substring].
// Apostrophes are normalised out of the needles (index.html uses &rsquo;, JSON uses ')
// so one needle can cover both surfaces.
const BORROWED = [
  ["Secure AI Project", "no requirements that company safety practices be reasonable or follow best practices, or that anyone outside the company check that they are followed"],
  ["Woodside / Transformer", "nothing requiring those safety practices to meet any minimum bar for quality"],
  ["Woodside / Transformer", "for anyone to say what you"],
  ["Delaney & Acharya / AI Frontiers", "invisible to the public, policymakers, and third-party auditors"],
  ["Delaney & Acharya / AI Frontiers", "policymakers are flying blind"],
  ["Beckstead / Pritzker release", "first state to mandate independent third-party evaluations of AI safety practices"],
  ["Gandhi / Encode", "so the public doesn"],
  ["Weil / AI Frontiers", "instead drives it toward laxity"],
  ["Encode coalition letter", "write, publish, and follow safety and security protocols to manage the most severe risks"],
  ["Encode coalition letter", "Rather than prescribe specific technical standards that companies must follow"],
  ["Encode coalition letter", "transparency reports that include the results of their pre-deployment assessments of catastrophic risk"],
  ["Encode coalition letter", "tightly defined set of critical safety incidents"],
  ["Encode coalition letter", "report evidence of catastrophic risks as well as violations of SB 53 itself"],
  ["Gluck / FPF", "mechanism for the public to report critical safety incidents"],
  ["Gluck / FPF", "first state to enact a statute specifically targeting frontier artificial intelligence"],
  ["Gluck / FPF", "the death or serious injury of 50 or more people"],
  ["Gluck & Hales / FPF", "borrows the language of frontier AI laws, but not the full architecture"],
  ["Rice / FPF", "focusing instead on transparency"],
  ["FPF enacted-law chart", "36-month regulatory sandbox"],
  ["Kodama / sb53.info", "Only the California AG can bring suit"],
  ["Kodama / sb53.info", "vulnerable to theft by malicious outside actors"],
  ["Arbel / AI Frontiers", "little organized political appetite for"],
  ["O'Donoghue / AI Frontiers", "a prohibition, not preemption"],
  ["Ingold / AI Frontiers", "Justice Department task force to challenge state AI laws"],
  ["Gluck / FPF", "still a discussion draft"],
];

// Flagged by the harvests as factually wrong or stale. None may reach the page.
const DO_NOT_REUSE = [
  "more than 100 people",            // FPF Feb-2026 chart: SB 53 harm threshold is 50+
  "May 15",                          // FPF's Colorado signing date; enrolled act says 2026-05-14
  "should not be able to continue advancing", // reporter paraphrase, not Woodside's words
  "required to report to the Attorney General", // Encode letter mis-routes CA incident reports
  "effective June 30, 2026",         // Ingold on the never-effective Colorado SB 24-205
];

// C1
test("every category cell carries a linkable definition_source", () => {
  for (const c of DATA.categories) {
    assert.ok(c.definition_source, c.category + " needs a definition_source");
    assert.match(c.definition_source, /https?:\/\//, c.category + " definition_source needs a URL");
  }
});

// C2
test("every state with a headline carries a linkable headline_source", () => {
  for (const s of DATA.states) {
    // Unreviewed states carry a generic coverage note in our own voice — nothing to source.
    if (!s.headline || s.status === "none") continue;
    assert.ok(s.headline_source, s.state + " has a headline but no headline_source");
    assert.match(s.headline_source, /https?:\/\//, s.state + " headline_source needs a URL");
  }
});

// C3
test("the harvested passages are on the page, verbatim", () => {
  const copy = allCopy().replace(/&rsquo;|&#39;|\\u2019|’/g, "'").replace(/\\"/g, '"');
  for (const [src, needle] of BORROWED) {
    assert.ok(copy.includes(needle), "missing borrowed passage (" + src + "): " + needle);
  }
});

// C4
test("the harvests' DO-NOT-REUSE passages appear nowhere", () => {
  for (const f of SHIPPED) {
    const body = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const bad of DO_NOT_REUSE) {
      assert.ok(!body.includes(bad), f + " carries a flagged passage: " + bad);
    }
  }
});

// C5 — the citations record is the deliverable that survives a future rewrite, so it is
// checked harder than the prose: shape, uniqueness, and coverage of every attribution used.
test("citations[] is complete and well-formed", () => {
  const cites = DATA.citations;
  assert.ok(Array.isArray(cites) && cites.length >= 15, "expected a full citations list");
  const seen = new Set();
  for (const c of cites) {
    for (const k of ["source", "authors", "url", "used_in"]) {
      assert.ok(c[k] && String(c[k]).length > 2, "citation missing " + k + ": " + JSON.stringify(c));
    }
    assert.match(c.url, /^https?:\/\//, "citation url must be absolute: " + c.url);
    const key = c.source + "|" + c.url + "|" + c.used_in;
    assert.ok(!seen.has(key), "duplicate citation entry: " + key);
    seen.add(key);
  }
  // Every borrowed voice named in the copy must be findable in the citations list.
  const blob = JSON.stringify(cites);
  for (const name of [
    "Miles Kodama", "Secure AI Project", "Thomas Woodside", "Nick Beckstead",
    "Sunny Gandhi", "Encode", "Justine Gluck", "Daniel Hales", "Tatiana Rice",
    "Oscar Delaney", "Ashwin Acharya", "Gabriel Weil", "Yonathan Arbel",
    "Kristin O'Donoghue", "Tristan Ingold", "Henry Papadatos",
  ]) {
    assert.ok(blob.includes(name), "citations[] does not credit " + name);
  }
  // Primary law is a source too — the provision summaries rest on it.
  assert.match(blob, /legislature|enrolled act|bill text/i, "state legislature texts must be cited");
});

// C6
test("the citations route exists and renders one entry per source", () => {
  const L = lawmap();
  const r = L.parseHash("#/citations");
  assert.strictEqual(r.view, "citations", "#/citations must route to its own view");
  assert.ok(INDEX.includes('href="#/citations"'), "the citations route needs a nav link");

  const html = renderPanel("#/citations");
  for (const c of DATA.citations) {
    assert.ok(html.includes(c.url), "citations page omits " + c.url);
  }
  assert.ok(html.includes('href="' + DATA.citations[0].url + '"'), "citations must be clickable");
});

// C7 — the harvest found seven different titles for Woodside across sources; the site
// attributes by name and organisation only, so it cannot be wrong about a title.
test("no job title is attached to Thomas Woodside (the sources disagree)", () => {
  const copy = allCopy();
  for (const title of ["Policy Director", "Senior Policy Advisor", "policy adviser", "policy analyst"]) {
    assert.ok(!copy.includes(title), "shipped copy asserts a contested Woodside title: " + title);
  }
});

// C8 — the owner explicitly ruled out quotation-mark styling: borrowed text is plain site
// copy, and attribution rides an em dash. A regression here would re-introduce the
// scare-quote look that made the page read as a clip file.
test("borrowed passages run as plain copy, never in quotation-mark styling", () => {
  const copy = allCopy().replace(/&rsquo;|&#39;|’/g, "'");
  for (const [src, needle] of BORROWED) {
    const i = copy.indexOf(needle);
    if (i <= 0) continue;
    const before = copy.slice(Math.max(0, i - 12), i);
    assert.ok(!/(&ldquo;|&quot;|\\"|“)\s*$/.test(before),
      "borrowed passage is quote-styled (" + src + "): ..." + before + "|" + needle.slice(0, 30));
  }
  // And the attribution convention itself must be present on both surfaces.
  assert.match(INDEX, /class="attrib">&mdash; /, "index.html needs em-dash attribution spans");
  const blob = JSON.stringify(DATA);
  assert.ok(blob.includes("— Nick Beckstead"), "the Illinois claim must name Beckstead");
  assert.ok(blob.includes("— Gabriel Weil"), "the audit counterpoint must name Weil");
});

// C9
test("the sb53.info licence position is recorded in citations", () => {
  const sb = DATA.citations.filter((c) => c.url.includes("sb53.info"));
  assert.ok(sb.length >= 1, "sb53.info must be cited");
  assert.ok(sb.some((c) => /all rights reserved/i.test(c.note || "")),
    "sb53.info's all-rights-reserved footer must be recorded, not silently ignored");
});

// C10 — the chrome the owner froze. Copy work must not take any of it out.
test("the frozen chrome the owner kept is still on the page", () => {
  const frozen = [
    "<h1>State Laws Affecting Frontier US AI Companies</h1>",
    "This map measures distance from the SB 53 baseline on each axis",
    // Chrome renamed 2026-07-31 (halo round): the nav pill and two legend rows now say
    // what the board IS, and the grey states are "no statute found", not "not yet reviewed".
    ">The board &mdash; strongest state per axis &rarr;</a>",
    "Frontier AI law",
    "Partial &mdash; some SB 53 provisions",
    "Not frontier law &mdash; AI usage (deepfakes, hiring)",
    "No frontier statute found",
    "States shown grey have no comprehensive frontier AI statute in the trackers we checked",
    'href="mailto:jay.ifp.automation@gmail.com"',
  ];
  for (const f of frozen) assert.ok(INDEX.includes(f), "frozen chrome removed: " + f);
});

// C11 — the owner asked for a VERY clean main page: provenance lives on the citations
// page and in the data file, and must not leak back into a cell as a credit string.
test("the main page stays clean: provenance strings never render in a cell", () => {
  const cats = renderPanel("#/categories");
  for (const c of DATA.categories) {
    assert.ok(!cats.includes(c.definition_source),
      c.category + " renders its definition_source — that belongs on the citations page");
  }
  const il = renderPanel("#/IL");
  const s = DATA.states.find((x) => x.state === "IL");
  assert.ok(!il.includes(s.headline_source), "IL renders its headline_source");
});

// C12 — H5 moved New York's ten-section verification method out of the summary prose. For an
// ABSENCE claim the method is the evidence, so it must still reach the reader, not just the
// data file: a silent drop would turn a checked finding into an assertion.
test("a provision's verification_note renders in the state panel", () => {
  const ny = renderPanel("#/NY");
  const p = DATA.states.find((s) => s.state === "NY").bills[0].provisions
    .find((x) => x.category === "minimum-bar-standards");
  assert.ok(p.verification_note, "NY's removed-prohibition cell must carry its method note");
  assert.ok(ny.includes("all ten sections of the enacted article were read in full"),
    "the method note must render on the page, not sit unread in states.json");
});

/** Boot render.js against a stub DOM and return the rendered panel for one route. */
function renderPanel(hash) {
  const els = {
    panel: { innerHTML: "" },
    chips: { innerHTML: "" },
    stamp: { textContent: "" },
    maintainer: { textContent: "" },
    intro: { innerHTML: "<p>intro copy</p>" },
  };
  let domReady = null;
  const sandbox = {
    console,
    location: { hash: hash },
    document: {
      body: { setAttribute: function () {} },
      getElementById: function (id) { return els[id] || null; },
      querySelectorAll: function () { return []; },
      createElementNS: function () { return { textContent: "", appendChild: function () {} }; },
      addEventListener: function (ev, fn) { if (ev === "DOMContentLoaded") domReady = fn; },
    },
    window: { addEventListener: function () {} },
  };
  sandbox.globalThis = sandbox;
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "render.js"), "utf8"), sandbox);
  sandbox.window.LAWMAP_DATA = DATA;
  domReady();
  return els.panel.innerHTML;
}

// NOT TESTED (green-team starting points):
//   - whether a borrowed passage is FAITHFUL to its source: nothing here fetches the URL,
//     so a mis-transcription or an edit that changes meaning passes. Human/verifier job.
//   - whether used_in on a citation actually matches where the passage renders.
//   - whether our connective tissue makes a claim the cited source does not support.
//   - typography of the attribution (em dash vs en dash) in data-driven copy.
//   - the licence question for sb53.info is RECORDED, not resolved: no test can tell
//     whether permission was obtained.
