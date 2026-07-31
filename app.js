/* State Frontier AI Law Map — logic + rendering. No dependencies, no build step.
   Pure logic lives in window.Lawmap and is unit-tested in test/logic.test.js. */
(function () {
  "use strict";

  var STATUS_CLASS = {
    "frontier-law": "st-frontier",
    partial: "st-partial",
    orthogonal: "st-orthogonal",
    none: "st-none",
  };

  var TAG_LABEL = {
    baseline: "baseline (SB 53)",
    "copies-SB53": "copies SB 53",
    weaker: "weaker than SB 53",
    "frontier-advancing": "goes beyond SB 53",
    orthogonal: "AI usage law",
  };

  /* ---------- pure logic ---------- */

  function parseHash(hash) {
    var m = /^#\/([A-Za-z-]+)$/.exec(hash || "");
    if (!m) return { view: "map", key: null };
    var seg = m[1];
    if (seg.toLowerCase() === "categories") return { view: "categories", key: null };
    // The provenance record is its own route so the main page stays clean.
    if (seg.toLowerCase() === "citations") return { view: "citations", key: null };
    if (/^[A-Za-z]{2}$/.test(seg)) return { view: "state", key: seg.toUpperCase() };
    return { view: "map", key: null };
  }

  function stateByKey(data, key) {
    if (!key) return null;
    var k = String(key).toUpperCase();
    for (var i = 0; i < data.states.length; i++) {
      if (data.states[i].state === k) return data.states[i];
    }
    return null;
  }

  function statusClass(status) {
    return STATUS_CLASS[status] || STATUS_CLASS.none;
  }

  /* Every provision in the dataset, flattened, each carrying its state and bill. */
  function allProvisions(data) {
    var out = [];
    data.states.forEach(function (s) {
      (s.bills || []).forEach(function (b) {
        (b.provisions || []).forEach(function (p) {
          out.push(Object.assign({}, p, { state: s.state, state_name: s.state_name, bill: b.id }));
        });
      });
    });
    return out;
  }

  /* groupBy category. Orthogonal provisions carry category null by schema rule,
     so they can never be compared against SB 53 by accident. */
  function provisionsFor(data, category) {
    return allProvisions(data).filter(function (p) {
      return p.category === category;
    });
  }

  /* Three kinds of cell, not two. A category with no named leader is usually EMPTY
     (nobody passed it) — but thresholds has no leader because all three states landed on
     the SAME numbers. Rendering that as "no passed law" would be flatly false, so
     converged cells are marked in the data and rendered in their own section. */
  function cellKind(cat) {
    if (cat.cell_type === "converged") return "converged";
    return cat.strongest_state === null || cat.strongest_state === undefined ? "empty" : "leader";
  }

  function isEmptyCell(cat) {
    return cellKind(cat) === "empty";
  }

  /* Category page rows: groupBy over provisions, plus the editorial `strongest_state`
     override from the data file. The override wins — leadership is a judgment, not a count. */
  function categoryRows(data) {
    return data.categories.map(function (c) {
      var provs = provisionsFor(data, c.category);
      return Object.assign({}, c, {
        provisions: provs,
        kind: cellKind(c),
        empty: isEmptyCell(c),
        leader_provisions: provs.filter(function (p) {
          return p.state === c.strongest_state;
        }),
      });
    });
  }

  /* States that carry an actual record, ordered by how much law they have.
     Exists because Connecticut, Delaware and Rhode Island are a few pixels on a
     choropleth — a map that hides a state's law is worse than no map. */
  function signedDate(s) {
    var d = (s.bills || []).map(function (b) { return b.signed_date; }).filter(Boolean).sort();
    return d.length ? d[0] : "9999-99-99";
  }
  var STATUS_RANK = { "frontier-law": 0, partial: 1, orthogonal: 2, none: 9 };
  function rank(s) {
    // NOT `STATUS_RANK[x] || 9` — the top rank is 0, which is falsy.
    return Object.prototype.hasOwnProperty.call(STATUS_RANK, s) ? STATUS_RANK[s] : 9;
  }
  function reviewedStates(data) {
    return data.states
      .filter(function (s) { return s.status !== "none"; })
      .sort(function (a, b) {
        var d = rank(a.status) - rank(b.status);
        if (d !== 0) return d;
        // Then chronologically, so the chips read as the sequence in which the
        // SB 53 template spread rather than as an alphabetical accident.
        var da = signedDate(a), db = signedDate(b);
        if (da !== db) return da < db ? -1 : 1;
        return a.state.localeCompare(b.state);
      });
  }

  function ratchetedDown(data) {
    return allProvisions(data).filter(function (p) {
      return p.trajectory === "ratcheted-down";
    });
  }

  var Lawmap = {
    parseHash: parseHash,
    stateByKey: stateByKey,
    statusClass: statusClass,
    allProvisions: allProvisions,
    provisionsFor: provisionsFor,
    categoryRows: categoryRows,
    reviewedStates: reviewedStates,
    ratchetedDown: ratchetedDown,
    isEmptyCell: isEmptyCell,
    cellKind: cellKind,
    TAG_LABEL: TAG_LABEL,
  };
  if (typeof window !== "undefined") window.Lawmap = Lawmap;
})();
