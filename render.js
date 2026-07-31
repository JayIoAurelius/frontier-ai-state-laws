/* State Frontier AI Law Map — DOM rendering. Pure logic lives in app.js (window.Lawmap),
   which is where the unit tests point. This file is presentation only. */
(function () {
  "use strict";
  var L = window.Lawmap;
  var TAG_LABEL = L.TAG_LABEL;
  var stateByKey = L.stateByKey, statusClass = L.statusClass;
  var categoryRows = L.categoryRows;
  var reviewedStates = L.reviewedStates, parseHash = L.parseHash;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function conf(c) {
    if (!c) return "";
    return '<span class="conf conf-' + esc(c) + '" title="confidence in this record">' + esc(c) + "</span>";
  }

  function sourceLine(src) {
    var html = esc(src).replace(/(https?:\/\/[^\s]+)/g, function (u) {
      return '<a href="' + u + '" target="_blank" rel="noopener">' + u + "</a>";
    });
    return '<div class="src">source: ' + html + "</div>";
  }

  function provisionHTML(p) {
    var h = '<div class="prov tag-' + esc(p.tag) + '">';
    h += '<div class="prov-tags"><span class="tag">' + esc(TAG_LABEL[p.tag] || p.tag) + "</span>";
    if (p.trajectory === "ratcheted-down") h += '<span class="tag traj">&#9660; ratcheted down</span>';
    h += conf(p.confidence) + "</div>";
    h += "<p>" + esc(p.summary) + "</p>";
    if (p.trajectory_note) h += '<p class="annot">' + esc(p.trajectory_note) + "</p>";
    if (p.cite) h += '<div class="cite">' + esc(p.cite) + "</div>";
    // How the claim was checked, kept out of the summary prose but not off the page:
    // for absence claims ("this section is gone") the method IS the evidence.
    if (p.verification_note) h += '<div class="note">' + esc(p.verification_note) + "</div>";
    h += sourceLine(p.source);
    return h + "</div>";
  }

  function billHTML(b) {
    var h = '<section class="bill"><h3>' + esc(b.id) + " &mdash; " + esc(b.name) + "</h3>";
    h += '<div class="meta">';
    if (b.signed_date) h += "<span>Signed " + esc(b.signed_date) + "</span>";
    else if (b.signed_date_note) h += '<span class="contested">Signing date contested</span>';
    if (b.amended_date) h += "<span>Amended " + esc(b.amended_date) + "</span>";
    if (b.effective) h += "<span>Effective " + esc(b.effective) + "</span>";
    if (b.status) h += "<span>" + esc(b.status) + "</span>";
    h += "</div>";
    h += '<p><a class="primary" href="' + esc(b.text_url) + '" target="_blank" rel="noopener">Official bill text &rarr;</a>';
    if (b.amendment_url) h += ' <a class="primary" href="' + esc(b.amendment_url) + '" target="_blank" rel="noopener">Amendment &rarr;</a>';
    if (b.original_text_url) h += ' <a class="primary" href="' + esc(b.original_text_url) + '" target="_blank" rel="noopener">Original text &rarr;</a>';
    h += "</p>";
    if (b.warning) h += '<div class="warn"><strong>Reading note.</strong> ' + esc(b.warning) + "</div>";
    if (b.signed_date_note) h += '<div class="note">' + esc(b.signed_date_note) + "</div>";
    if (b.note) h += '<div class="note">' + esc(b.note) + "</div>";

    if ((b.explainers || []).length) {
      h += "<h4>Explainers</h4><ul class=\"explainers\">";
      b.explainers.forEach(function (e) {
        h += '<li><a href="' + esc(e.url) + '" target="_blank" rel="noopener">' + esc(e.title || e.url) + "</a>";
        h += '<span class="annot">' + esc(e.annotation) + "</span>";
        if (e.publisher || e.date) {
          h += '<span class="byline">' + esc(e.publisher || "") + (e.date ? " &middot; " + esc(e.date) : "") + "</span>";
        }
        if (e.date_warning) h += '<span class="stale">&#9888; ' + esc(e.date_warning) + "</span>";
        h += "</li>";
      });
      h += "</ul>";
    } else {
      h += '<p class="muted">Curated explainer links not yet added for this bill.</p>';
    }

    if ((b.provisions || []).length) {
      h += "<h4>Provisions, tagged against the SB 53 baseline</h4>";
      b.provisions.forEach(function (p) {
        h += provisionHTML(p);
      });
    }
    return h + "</section>";
  }

  function stateHTML(data, key) {
    var s = stateByKey(data, key);
    if (!s) return "<p>Unknown state.</p>";
    var h = '<div class="panel-head"><h2>' + esc(s.state_name) + "</h2>";
    h += '<span class="pill ' + statusClass(s.status) + '">' + esc(s.status.replace(/-/g, " ")) + "</span></div>";
    if (s.headline) h += '<p class="lede">' + esc(s.headline) + "</p>";
    if (!s.bills.length) {
      h += '<p class="muted">No comprehensive AI resilience law has been reviewed for this state. That is a statement about this map’s coverage, not a claim that no bill exists.</p>';
      return h;
    }
    s.bills.forEach(function (b) {
      h += billHTML(b);
    });
    return h;
  }

  function categoriesHTML(data) {
    var rows = categoryRows(data);
    var filled = rows.filter(function (r) { return r.kind === "leader"; });
    var converged = rows.filter(function (r) { return r.kind === "converged"; });
    var empty = rows.filter(function (r) { return r.kind === "empty"; });
    var h = "<h2>Strongest state on each axis &mdash; and the empty cell</h2>";
    h += '<p class="lede">Fifteen other maps will tell you which states have an AI law. This is the ranking: for each provision advocates have pushed for, which passed law goes furthest, and why.</p>';

    filled.forEach(function (r) {
      h += '<div class="cat"><div class="cat-head"><h3>' + esc(r.label) + "</h3>";
      h += '<span class="leader">' + esc(r.strongest_state) + "</span>" + conf(r.confidence) + "</div>";
      h += '<p class="def">' + esc(r.definition) + "</p>";
      h += '<div class="cite">' + esc(r.provision_cite) + "</div>";
      h += '<p class="annot">' + esc(r.rationale) + "</p>";
      if (r.provisions.length) {
        h += '<details><summary>' + r.provisions.length + " tagged provision" + (r.provisions.length === 1 ? "" : "s") + " across states</summary>";
        r.provisions.forEach(function (p) {
          h += '<div class="prov-mini"><b>' + esc(p.state) + "</b> " + provisionHTML(p) + "</div>";
        });
        h += "</details>";
      }
      h += "</div>";
    });

    converged.forEach(function (r) {
      h += '<div class="cat cat-conv"><div class="cat-head"><h3>' + esc(r.label) + "</h3>";
      h += '<span class="leader conv">converged &mdash; no leader</span>' + conf(r.confidence) + "</div>";
      h += '<p class="def">' + esc(r.definition) + "</p>";
      h += '<p class="annot">' + esc(r.frontier_note) + "</p>";
      if (r.provisions.length) {
        h += '<details><summary>' + r.provisions.length + " tagged provisions across states</summary>";
        r.provisions.forEach(function (p) {
          h += '<div class="prov-mini"><b>' + esc(p.state) + "</b> " + provisionHTML(p) + "</div>";
        });
        h += "</details>";
      }
      h += "</div>";
    });

    h += '<h2 class="frontier-head">The empty cell' + (empty.length === 1 ? "" : "s") + "</h2>";
    h += '<p class="lede">Not an oversight in the data, and not a case where the states merely agree. No state has passed this. It is the frontier of AI resilience legislation, and the most important thing on this page.</p>';
    empty.forEach(function (r) {
      h += '<div class="cat cat-empty"><div class="cat-head"><h3>' + esc(r.label) + "</h3>";
      h += '<span class="leader none">no passed law</span>' + conf(r.confidence) + "</div>";
      h += '<p class="def">' + esc(r.definition) + "</p>";
      h += '<p class="annot">' + esc(r.frontier_note) + "</p>";
      // An empty cell can still have evidence behind it — New York's repealed prohibition is
      // the strongest record on the board. Render it, or the claim reads as an assertion.
      if (r.rationale) h += '<p class="annot">' + esc(r.rationale) + "</p>";
      if (r.provisions.length) {
        h += "<details><summary>" + r.provisions.length + " tagged provision" + (r.provisions.length === 1 ? "" : "s") + " across states</summary>";
        r.provisions.forEach(function (p) {
          h += '<div class="prov-mini"><b>' + esc(p.state) + "</b> " + provisionHTML(p) + "</div>";
        });
        h += "</details>";
      }
      h += "</div>";
    });

    return h;
  }

  /* The provenance record. Much of this page's copy is borrowed from named people, used as
     plain site copy with attribution only where a sentence plainly reads as one person's
     claim. This page is where every borrowing is mapped back to its author and URL, so a
     later rewrite can tell at a glance what came from where. */
  function citationsHTML(data) {
    var cites = data.citations || [];
    var h = "<h2>Citations</h2>";
    h += '<p class="lede">Most of the framing copy on this site is borrowed from the people who argue these questions in public, and runs as plain site copy rather than as block quotation. Every borrowed passage is listed here with its author, its URL, and the part of the site that uses it. Statutory facts in the provision rows are ours, verified against the enacted text, and each carries its own source line.</p>';
    cites.forEach(function (c) {
      h += '<div class="cat"><div class="cat-head"><h3>' + esc(c.source) + "</h3></div>";
      h += '<p class="def">' + esc(c.authors) + "</p>";
      h += '<p class="annot">' + esc(c.used_in) + "</p>";
      if (c.note) h += '<div class="note">' + esc(c.note) + "</div>";
      h += sourceLine(c.url);
      h += "</div>";
    });
    return h;
  }

  function federalHTML(data) {
    var f = data.federal;
    if (!f) return "";
    var h = '<div class="fed"><h3>Federal status</h3><p class="lede">' + esc(f.headline) + "</p>";
    f.items.forEach(function (i) {
      h += '<div class="prov">' + conf(i.confidence) + "<p>" + esc(i.summary) + "</p>" + sourceLine(i.source) + "</div>";
    });
    return h + "</div>";
  }

  /* ---------- wiring ---------- */

  function boot(data) {
    var panel = document.getElementById("panel");
    var paths = document.querySelectorAll("#usmap path");

    Array.prototype.forEach.call(paths, function (el) {
      var s = stateByKey(data, el.id);
      el.setAttribute("class", statusClass(s ? s.status : "none"));
      el.setAttribute("tabindex", "0");
      el.setAttribute("role", "link");
      var label = (s ? s.state_name : el.id) + (s && s.status !== "none" ? " — " + s.status.replace(/-/g, " ") : " — not yet reviewed");
      el.setAttribute("aria-label", label);
      var t = document.createElementNS("http://www.w3.org/2000/svg", "title");
      t.textContent = label;
      el.appendChild(t);
      el.addEventListener("click", function () { location.hash = "#/" + el.id; });
      el.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); location.hash = "#/" + el.id; }
      });
    });

    function render() {
      var r = parseHash(location.hash);
      Array.prototype.forEach.call(paths, function (el) {
        el.classList.toggle("sel", r.view === "state" && el.id === r.key);
      });
      document.body.setAttribute("data-view", r.view);
      if (r.view === "categories") panel.innerHTML = categoriesHTML(data);
      else if (r.view === "citations") panel.innerHTML = citationsHTML(data);
      else if (r.view === "state") panel.innerHTML = stateHTML(data, r.key);
      else panel.innerHTML = document.getElementById("intro").innerHTML + federalHTML(data);
      panel.scrollTop = 0;
    }

    // Chip row: the map alone would hide Connecticut behind four pixels.
    var chips = document.getElementById("chips");
    if (chips) {
      chips.innerHTML = reviewedStates(data)
        .map(function (s) {
          return '<a class="chip ' + statusClass(s.status) + '" href="#/' + s.state + '">' +
            '<b>' + esc(s.state) + "</b> " + esc(s.state_name) + "</a>";
        })
        .join("");
    }

    window.addEventListener("hashchange", render);
    document.getElementById("stamp").textContent = "Last updated " + data.last_updated;
    document.getElementById("maintainer").textContent = data.maintainer;
    render();
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function () {
      if (window.LAWMAP_DATA) boot(window.LAWMAP_DATA);
    });
  }
})();
