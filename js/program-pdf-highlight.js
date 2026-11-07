/* R23 Phase 1 — PDF V2 exact-row highlights. Fail closed on any revision mismatch. */
(function (root) {
  "use strict";
  const SOURCE_SHA = "1cd0d0166fe202b2b69e18f5ec2e1c2d80439386767a1826bf21d7d5da9e0bbf";
  const EXCLUDED = "football-p07-มัธยมหญิง-020-repeated-final";
  const ID = /^[A-Za-z0-9_.\u0E00-\u0E7F-]{1,180}$/;
  function select(index, fixtureId, page) {
    if (!index || !ID.test(String(fixtureId || "")) || fixtureId === EXCLUDED ||
        index.schema_version !== 1 || index.source_sha256 !== SOURCE_SHA ||
        index.source_program_sha256 !== SOURCE_SHA ||
        index.source_pdf !== "assets/souvenir-2569-v2.pdf" ||
        index.source_pdf_pages !== 41 ||
        index.coordinate_space !== "normalized_top_left_cropbox" ||
        index.qa?.active_total !== 236 || index.qa?.unresolved !== 0 ||
        !index.entries || Object.keys(index.entries).length !== 236) return null;
    const row = index.entries[fixtureId];
    if (!row || row.page !== Number(page) || ![ "match", "track_event" ].includes(row.kind) ||
        !/^(?:[1-9]|[1-4][0-9]|50)$/.test(String(row.number || "")) ||
        typeof row.division !== "string" || !row.division.trim() ||
        !String(fixtureId).startsWith(row.sport_id + "-") ||
        !["pdf_match_number_column","pdf_athletics_heading"].includes(row.evidence))
      return null;
    const r = row.rect;
    if (!Array.isArray(r) || r.length !== 4 ||
        !r.every(n => typeof n === "number" && Number.isFinite(n)) ||
        !(0 <= r[0] && r[0] < r[2] && r[2] <= 1 &&
          0 <= r[1] && r[1] < r[3] && r[3] <= 1)) return null;
    return row;
  }
  function draw({index, fixtureId, page, viewport, overlay, canvas}) {
    if (!overlay || !canvas || !viewport) return null;
    overlay.replaceChildren();
    const row = select(index, fixtureId, page);
    if (!row) return null;
    const width = parseFloat(canvas.style.width) || viewport.width;
    const height = parseFloat(canvas.style.height) || viewport.height;
    if (!(width > 0 && height > 0)) return null;
    overlay.style.width = width + "px";
    overlay.style.height = height + "px";
    const r = row.rect;
    const mark = overlay.ownerDocument.createElement("span");
    mark.className = "program-pdf-fixture-highlight";
    mark.setAttribute("aria-hidden", "true");
    mark.style.left = r[0] * width + "px";
    mark.style.top = r[1] * height + "px";
    mark.style.width = (r[2] - r[0]) * width + "px";
    mark.style.height = (r[3] - r[1]) * height + "px";
    overlay.appendChild(mark);
    return {top:r[1]*height,height:(r[3]-r[1])*height,number:row.number,
      kind:row.kind,division:row.division};
  }
  root.NongkumProgramPdfHighlight = Object.freeze({select,draw,SOURCE_SHA});
})(window);
