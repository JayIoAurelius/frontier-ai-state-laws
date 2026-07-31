// Taxonomy tests: the nine-category ruling, encoded.
// Run: node --test test/taxonomy.test.js
// These read the REAL data file and the REAL shipped assets, so a hand-edit that
// reintroduces a retired cell fails the build.
//
// ---------------------------------------------------------------------------
// TEST MANIFEST — taxonomy restructure (12 categories -> 9), 2026-07-31
// ---------------------------------------------------------------------------
// T1 nine ruled categories, in order · T2 retired keys appear nowhere · T3 exactly one
// genuinely empty cell (minimum-bar-standards) · T4 that cell absorbs deployment-restraint
// and liability · T5 it carries both Woodside lines, attributed · T6 internal-use-risk is
// CA-led on 22757.12(d) · T7 independent-verification claims ANNUAL audits only ·
// T8 enforcement records AG-only + no private right of action · T9 thresholds-scoping and
// transparency-reports stay CONVERGED, not empty · T10 labels match the ruled wording ·
// T11 retired branding is gone from shipped files · T12 states.js is in sync with the JSON.
// H1-H16 prose-hygiene pass (halo round, 2026-07-31): dangling pronouns, overloaded
//        sentences, a phrase duplicated across four cells, and the board h2. Encoded as
//        the PROSE table near the bottom of this file, one row per finding.
// ---------------------------------------------------------------------------
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "states.json"), "utf8"));

// categoryRows is the groupBy layer the categories page renders from; load it the
// same way logic.test.js does so the ordering assertions cover the render path.
const vm = require("vm");
const sandbox = {
  window: {},
  document: { getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} },
  console,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "app.js"), "utf8"), sandbox);
const L = sandbox.window.Lawmap;

// The owner's ruling, encoded once. Order is load-bearing: it is the reading order
// of the categories page (leaders, then converged, then the empty cell).
const CATEGORY_KEYS = [
  "frontier-ai-framework",
  "transparency-reports",
  "incident-reporting",
  "whistleblower",
  "independent-verification",
  "enforcement",
  "thresholds-scoping",
  "internal-use-risk",
  "minimum-bar-standards",
];

// Deleted outright. No compressed legacy row, no remnant category, no provision tag.
const RETIRED_KEYS = [
  "published-safety-framework", "third-party-audit", "thresholds", "deployment-restraint",
  "liability", "researcher-safe-harbor", "private-right-of-action", "kill-switch",
];

function allProvisionRecords() {
  const out = [];
  for (const s of DATA.states) {
    for (const b of s.bills || []) {
      for (const p of b.provisions || []) out.push({ state: s.state, p: p });
    }
  }
  return out;
}

// T1
test("the taxonomy is exactly the nine ruled categories, in order", () => {
  assert.strictEqual(DATA.categories.length, 9, "the owner ruled nine categories, not twelve");
  assert.deepStrictEqual(DATA.categories.map((c) => c.category), CATEGORY_KEYS);
  // Same order must survive the groupBy layer that the page renders from.
  assert.deepStrictEqual(L.categoryRows(DATA).map((r) => r.category), CATEGORY_KEYS);
});

// T2
test("retired category keys appear nowhere — not in categories[], not on a provision", () => {
  const declared = new Set(DATA.categories.map((c) => c.category));
  for (const k of RETIRED_KEYS) {
    assert.ok(!declared.has(k), k + " must be deleted outright, with no remnant row");
  }
  for (const rec of allProvisionRecords()) {
    assert.ok(
      rec.p.category === null || CATEGORY_KEYS.includes(rec.p.category),
      rec.state + " provision still carries retired category " + rec.p.category
    );
  }
});

// T3
test("exactly one category is genuinely empty — the substantive minimum bar", () => {
  const empty = L.categoryRows(DATA).filter((r) => r.kind === "empty").map((r) => r.category);
  assert.deepStrictEqual(empty, ["minimum-bar-standards"]);
  // An empty cell with no explanation is a hole in the page, not a finding.
  for (const r of L.categoryRows(DATA).filter((x) => x.kind === "empty")) {
    assert.ok(r.frontier_note && r.frontier_note.length > 40, r.category + " needs a frontier_note");
  }
});

// T4
test("minimum-bar-standards absorbs the deployment-restraint and liability records", () => {
  const rows = L.categoryRows(DATA);
  const bar = rows.find((r) => r.category === "minimum-bar-standards");
  assert.strictEqual(bar.strongest_state, null, "no state has enacted a substantive quality bar");
  assert.strictEqual(bar.confidence, "high");
  const states = bar.provisions.map((p) => p.state);
  assert.ok(states.includes("NY"), "NY's removed prohibition must anchor this cell");
  assert.ok(states.includes("CA"), "CA's no-liability-for-harm record moves here");
  const ny = bar.provisions.find((p) => p.state === "NY");
  assert.match(ny.summary, /shall not deploy/, "the repealed prohibition text is the evidence");
});

// T5 — after the copy-voice swap this cell carries BOTH Woodside sentences: no minimum
// bar, and no mechanism for anyone to say stop. The second is the enforcement-gap closer.
test("minimum-bar-standards carries both Woodside lines, attributed", () => {
  const bar = DATA.categories.find((c) => c.category === "minimum-bar-standards");
  const text = bar.rationale + " " + (bar.frontier_note || "") + " " + bar.definition;
  assert.match(text, /nothing requiring those safety practices to meet any minimum bar for quality/);
  assert.match(text, /no way, in any of these laws, for anyone to say what you/,
    "the enforcement-gap closer must be in this cell");
  assert.match(text, /needs to stop/);
  assert.match(text, /Thomas Woodside/);
  assert.match(text, /Secure AI Project/);
  assert.match(text, /Transformer/);
});

// T6
test("internal-use-risk is a CA-led cell anchored on 22757.12(d)", () => {
  const rows = L.categoryRows(DATA);
  const iu = rows.find((r) => r.category === "internal-use-risk");
  assert.strictEqual(iu.kind, "leader");
  assert.strictEqual(iu.strongest_state, "CA");
  assert.strictEqual(iu.confidence, "medium");
  assert.match(iu.provision_cite, /22757\.12\(d\)/);
  assert.match(iu.provision_cite, /1421\(1\)\(d\)/, "NY's internal-use framework hook is cited");
  assert.match(iu.provision_cite, /Sec\. 10\(a\)/, "IL's framework-topic hook is cited");
  // The three-month OES transmission is the fact that makes CA the leader here.
  assert.match(iu.rationale, /three months/);
  const ca = iu.provisions.find((p) => p.state === "CA");
  assert.ok(ca, "CA's 22757.12(d) provision must sit in this cell, not in transparency-reports");
  assert.match(ca.cite, /22757\.12\(d\)/);
});

// T7
test("independent-verification claims ANNUAL audits, never 'the only audit requirement'", () => {
  const rows = L.categoryRows(DATA);
  const v = rows.find((r) => r.category === "independent-verification");
  assert.strictEqual(v.strongest_state, "IL");
  assert.match(v.rationale, /first state to require annual independent third-party audits/);
  assert.ok(v.provisions.length > 0);
  // The editorial override must win over any groupBy count.
  assert.ok(v.provisions.some((p) => p.state === "IL" && p.tag === "frontier-advancing"));
});

// T8
test("enforcement records AG-only enforcement and the absent private right of action", () => {
  const e = DATA.categories.find((c) => c.category === "enforcement");
  assert.strictEqual(e.strongest_state, "IL");
  assert.match(e.rationale, /AG-only in all three frontier states/);
  assert.match(e.rationale, /no private right of action anywhere/);
});

// T9
test("thresholds-scoping and transparency-reports stay CONVERGED, not empty", () => {
  const rows = L.categoryRows(DATA);
  const converged = rows.filter((r) => r.kind === "converged").map((r) => r.category).sort();
  assert.deepStrictEqual(converged, ["thresholds-scoping", "transparency-reports"]);
  const th = rows.find((r) => r.category === "thresholds-scoping");
  assert.strictEqual(th.empty, false, "labelling thresholds 'no passed law' would be false");
  assert.strictEqual(th.strongest_state, null);
  assert.ok(th.provisions.length >= 3, "thresholds provisions exist across states");
});

// T10
test("every category label matches the ruled wording", () => {
  const want = {
    "frontier-ai-framework": "Frontier AI framework (write, publish, follow)",
    "transparency-reports": "Transparency reports (incl. pre-deployment catastrophic-risk assessments)",
    "independent-verification": "Independent verification (annual third-party audits)",
    "thresholds-scoping": "Scope: thresholds and catastrophic-risk definitions",
    "internal-use-risk": "Internal-use risk",
    "minimum-bar-standards": "Substantive minimum-bar standards (incl. deployment restraint)",
  };
  for (const c of DATA.categories) {
    if (want[c.category]) assert.strictEqual(c.label, want[c.category], c.category + " label");
    assert.ok(c.label && c.label.length > 3, c.category + " needs a label");
  }
});

// T11
test("retired branding and category strings are gone from the shipped files", () => {
  const banned = [
    "published-safety-framework", "third-party-audit", "deployment-restraint",
    "researcher-safe-harbor", "private-right-of-action", "kill-switch",
    "AI Resilience Law Map", "Personal hackathon build",
  ];
  for (const f of ["index.html", "app.js", "render.js", path.join("data", "states.json")]) {
    const body = fs.readFileSync(path.join(ROOT, f), "utf8").toLowerCase();
    for (const b of banned) {
      assert.ok(!body.includes(b.toLowerCase()), f + " still contains banned string: " + b);
    }
  }
});

// T12 — data/states.js is generated from data/states.json by prep.py, by hand. The page
// loads the .js (file:// blocks fetch), so a forgotten prep.py run ships a stale taxonomy
// while every JSON-based assertion above still passes.
test("data/states.js is in sync with the canonical data/states.json", () => {
  const js = fs.readFileSync(path.join(ROOT, "data", "states.js"), "utf8");
  const m = /^\/\*[^\n]*\*\/\nwindow\.LAWMAP_DATA = ([\s\S]*);\n$/.exec(js);
  assert.ok(m, "states.js must be the generated wrapper — re-run prep.py");
  assert.deepStrictEqual(JSON.parse(m[1]), DATA, "stale states.js: re-run prep.py");
});

/* ---------- H1-H16: prose hygiene ----------------------------------------
   Copy assertions, not fact assertions: every fix preserves the numbers, dates, section
   cites and single-quoted statutory text of its cell. They exist so a later rewrite cannot
   reintroduce a pronoun with no antecedent, a 90-word sentence, or the recipient phrase
   that was duplicated across four cells. */
const CATS = Object.fromEntries(DATA.categories.map((c) => [c.category, c]));
const RENDER = fs.readFileSync(path.join(ROOT, "render.js"), "utf8");
// The full recipient phrase is statutory detail; it belongs in ONE cell (California's).
const FULL_AUTH = "including any law enforcement agency or public safety agency with jurisdiction";
const SHORT_AUTH = "to an authority with jurisdiction (as in California)";

/** One provision, disambiguated by a stable substring when a state has several in a cell. */
function prov(state, category, needle) {
  const hits = allProvisionRecords().filter((r) => r.state === state && r.p.category === category).map((r) => r.p);
  const p = needle ? hits.find((x) => x.summary.includes(needle)) : hits[0];
  assert.ok(p, "no " + state + " provision found in " + category);
  return p;
}

// [finding, text getter, must-contain[], must-NOT-contain[]]
const PROSE = [
  ["H1 CA internal-use gives the dangling 'it' a subject", () => prov("CA", "internal-use-risk").summary, ["or on another reasonable schedule it specifies — a large frontier developer must assess"], ["pursuant to another reasonable schedule specified by"]],
  ["H2 CA whistleblower opens with the subject the next 'it' refers to", () => prov("CA", "whistleblower").summary, ["SB 53 strengthens whistleblower protection"], ["Strengthened whistleblower protection"]],
  ["H3 CA incident reporting splits off the 24-hour clause", () => prov("CA", "incident-reporting").summary, ["serious physical injury. In that 24-hour case, the report goes to an authority", FULL_AUTH], []],
  ["H4 NY incident reporting compresses the authority phrase", () => prov("NY", "incident-reporting").summary, [SHORT_AUTH], [FULL_AUTH]],
  ["H4 IL incident reporting compresses the authority phrase", () => prov("IL", "incident-reporting").summary, [SHORT_AUTH], [FULL_AUTH]],
  ["H4 incident-reporting rationale compresses the authority phrase", () => CATS["incident-reporting"].rationale, [SHORT_AUTH], ["law enforcement or public safety agency with jurisdiction"]],
  ["H5 NY minimum-bar keeps the finding and the verbatim quote", () => prov("NY", "minimum-bar-standards").summary, ["REMOVED: the deployment prohibition", "shall not deploy a frontier model", "§ 1427 (Violations)"], ["were read in full", "did not migrate to another section"]],
  ["H5 the verification method survives as a method note", () => prov("NY", "minimum-bar-standards").source + " " + (prov("NY", "minimum-bar-standards").verification_note || ""), ["read in full", "did not migrate to another section"], []],
  ["H6 NY enforcement states the CA comparison in one clause", () => prov("NY", "enforcement", "REDUCED").summary, ["Still above California in one respect: repeat violations cost more."], ["cap of up to $1M in that"]],
  ["H7 NY whistleblower drops the ten-section enumeration", () => prov("NY", "whistleblower").summary, ["The enacted Article 44-B (§§ 1420–1429) contains no whistleblower or anti-retaliation section."], ["Loss of equity"]],
  ["H8 IL whistleblower joins its two clauses", () => prov("IL", "whistleblower").summary, ["Better process than California, which still holds the broader substantive trigger."], ["California still has the broader substantive trigger"]],
  ["H9 transparency rationale reads 'summary standard'", () => CATS["transparency-reports"].rationale, ["materially the same summary standard"], ["same summaries standard"]],
  ["H10 framework definition matches the label's write/publish/follow order", () => CATS["frontier-ai-framework"].definition, ["The developer must write, publish, and follow"], ["write, follow, and publicly publish"]],
  ["H11 the Weil counter-case moves out of the definition", () => CATS["independent-verification"].definition, ["take AI companies at their word."], ["Gabriel Weil", "laxity"]],
  ["H11 the Weil counter-case lands in the rationale, unaltered", () => CATS["independent-verification"].rationale, ["first state to require annual independent third-party audits", "instead drives it toward laxity", "— Gabriel Weil"], []],
  ["H12 minimum-bar definition ends the political-fact clause as a sentence", () => CATS["minimum-bar-standards"].definition, ["prescriptive safety requirements. That is the political fact this empty cell records."], ["requirements, which is the political fact"]],
  ["H13 thresholds definition breaks after the damages figure", () => CATS["thresholds-scoping"].definition, ["at least $1 billion in damages. "], ["$1 billion in damages; provide"]],
  ["H14 the footer maintainer line drops the 'every cell below' claim", () => DATA.maintainer, ["Jay Kim — corrections welcome; an unsourced claim is a bug."], ["every cell below"]],
  ["H15 the Illinois headline carries its introductory comma", () => DATA.states.find((s) => s.state === "IL").headline, ["On the enacted text, Illinois goes furthest"], ["On the enacted text Illinois"]],
  ["H16 the board h2 names the axes and the empty cell", () => RENDER, ["<h2>Strongest state on each axis &mdash; and the empty cell</h2>"], ["per thing AI resilience advocates actually want"]],
];

for (const [name, get, want, absent] of PROSE) {
  test("prose: " + name, () => {
    const text = get();
    for (const w of want) assert.ok(text.includes(w), "missing expected copy: " + w);
    for (const a of absent) assert.ok(!text.includes(a), "stale copy still shipped: " + a);
  });
}

// H4 (global) — the phrase was in four cells; the dedupe only holds if it stays in one.
test("prose: the full authority phrase appears exactly once in the data", () => {
  const body = fs.readFileSync(path.join(ROOT, "data", "states.json"), "utf8");
  assert.strictEqual(body.split(FULL_AUTH).length - 1, 1, "the full recipient phrase belongs to CA only");
});

// H3/H13 — the structural half of the fix: no cell may ship a runaway sentence again.
test("prose: no category definition or provision summary runs past 60 words in one sentence", () => {
  const longest = (text) => Math.max.apply(null, String(text).split(/(?<=[.;])\s+/)
    .map((s) => s.split(/\s+/).filter(Boolean).length));
  for (const c of DATA.categories) {
    assert.ok(longest(c.definition) <= 60, c.category + " definition has a runaway sentence");
  }
  for (const rec of allProvisionRecords()) {
    assert.ok(longest(rec.p.summary) <= 60, rec.state + " provision summary has a runaway sentence");
  }
});

// NOT TESTED (green-team starting points for the next round):
//   - the SUBSTANCE of each cell: nothing here reads a statute, so a cite that does not
//     support its claim passes. Primary-source verification is a human/verifier job.
//   - whether the strongest_state judgment is CORRECT — only that it is recorded and cited.
//   - the intro <template> prose in index.html is not cross-checked against the empty-cell
//     count, so the headline number can drift from categories[] silently.
//   - retired-string scanning covers index.html, app.js, render.js, data/states.json only —
//     NOT data/states.js (generated) or any doc under the Work.
//   - the PROSE table checks WORDING, not readability: it cannot tell whether a rewritten
//     sentence still says what the statute says. Fact-check remains a human job.
//   - the 60-word sentence guard splits on '.' and ';' only, so a comma-spliced monster or
//     a sentence ending in '?' slips through; it also does not cover rationale/frontier_note.
//   - nothing here checks that a pronoun HAS an antecedent in general — H1/H2 pin the two
//     known cases by substring, so a new dangling 'it' elsewhere passes.
