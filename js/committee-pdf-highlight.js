/* R19-K: use verified coordinates for the fixed V3 PDF; never infer positions on-device. */
(function (root) {
  "use strict";
  const SOURCE_SHA = "cab4c65eb15d5480d63da00a81a2e662f8c7857e0ae39ea80475733f5bc795e0";
  function select(index, target, page) {
    if (!index || !target || index.schema_version !== 1 ||
        index.source_sha256 !== SOURCE_SHA || index.source_pdf_pages !== 64 ||
        index.coordinate_space !== "normalized_top_left_cropbox") return null;
    if (!/^pdf-p\d{2}-l\d{2}$/.test(target.id || "")) return null;
    const row = index.entries?.[target.id];
    if (!row || row.page !== Number(page) || row.name !== target.name ||
        String(row.number || "") !== String(target.number || "")) return null;
    const rect = row.rect;
    if (!Array.isArray(rect) || rect.length !== 4 ||
        !rect.every(v => typeof v === "number" && Number.isFinite(v)) ||
        !(0 <= rect[0] && rect[0] < rect[2] && rect[2] <= 1 &&
          0 <= rect[1] && rect[1] < rect[3] && rect[3] <= 1)) return null;
    return rect;
  }
  function draw({index, target, page, viewport, overlay, canvas}) {
    if (!overlay || !canvas || !viewport) return null;
    overlay.replaceChildren();
    const rect = select(index, target, page);
    if (!rect) return null;
    const width = parseFloat(canvas.style.width) || viewport.width;
    const height = parseFloat(canvas.style.height) || viewport.height;
    if (!(width > 0 && height > 0)) return null;
    overlay.style.width = width + "px";
    overlay.style.height = height + "px";
    const mark = overlay.ownerDocument.createElement("span");
    mark.className = "committee-pdf-name-highlight";
    mark.setAttribute("aria-hidden", "true");
    mark.style.left = rect[0] * width + "px";
    mark.style.top = rect[1] * height + "px";
    mark.style.width = (rect[2]-rect[0]) * width + "px";
    mark.style.height = (rect[3]-rect[1]) * height + "px";
    overlay.appendChild(mark);
    return {top:rect[1]*height,height:(rect[3]-rect[1])*height};
  }
  root.NongkumCommitteeHighlight = Object.freeze({select, draw});
})(window);
