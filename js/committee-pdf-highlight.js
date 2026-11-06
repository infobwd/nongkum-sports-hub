/* R19-J: read-only PDF text-position highlights for verified committee draft entries.
   Loaded only by committee-pdf-viewer.html. Never writes or modifies the source PDF. */
(function (root) {
  "use strict";
  function compact(value) {
    return String(value || "").normalize("NFC")
      .replace(/[\u200b-\u200f\ufeff]/g, "").replace(/\s+/g, "");
  }
  function validTarget(target) {
    return target && /^\d+(?:\.\d+){1,3}$/.test(String(target.number || "")) &&
      typeof target.name === "string" && target.name.trim().length >= 4 &&
      target.name.length <= 160;
  }
  // PDF.js may split one printed row across several text items. Group by baseline;
  // never match a name by itself (it may recur on the same physical PDF page).
  function findLine(items, target) {
    if (!validTarget(target) || !Array.isArray(items)) return null;
    const lines = [];
    for (const item of items) {
      if (!item || !item.str || !Array.isArray(item.transform) ||
          !Number.isFinite(item.transform[4]) || !Number.isFinite(item.transform[5])) continue;
      const y = item.transform[5];
      let line = lines.find(l => Math.abs(l.y - y) <= 2.5);
      if (!line) { line = { y, items: [] }; lines.push(line); }
      line.items.push(item);
    }
    const number = compact(target.number);
    const name = compact(target.name);
    const matches = [];
    for (const line of lines) {
      line.items.sort((a, b) => a.transform[4] - b.transform[4]);
      const content = compact(line.items.map(item => item.str).join(" "));
      // Honor number boundaries: "14.2" must not match "14.2.4".
      const start = content.indexOf(number);
      if (start < 0 || (start > 0 && /[\d.]/.test(content[start - 1])) ||
          /[\d.]/.test(content[start + number.length] || "") ||
          !content.includes(name)) continue;
      matches.push(line);
    }
    return matches.length === 1 ? matches[0] : null;
  }
  function draw({items, target, viewport, overlay, canvas}) {
    if (!overlay || !canvas) return null;
    overlay.replaceChildren();
    const line = findLine(items, target);
    if (!line) return null;
    const bounds = [];
    for (const item of line.items) {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const h = Math.max(1, Math.hypot(item.transform[2] || 0, item.transform[3] || 0) * viewport.scale);
      const w = Math.abs(Number(item.width) || 0) * viewport.scale;
      if (![x,y,w,h].every(Number.isFinite) || w <= 0) continue;
      bounds.push({left:x,top:y-h*1.06,right:x+w,bottom:y+h*.15});
    }
    if (!bounds.length) return null;
    const left = Math.max(0, Math.min(...bounds.map(p => p.left)) - 3);
    const top = Math.max(0, Math.min(...bounds.map(p => p.top)) - 2);
    const right = Math.min(viewport.width, Math.max(...bounds.map(p => p.right)) + 3);
    const bottom = Math.min(viewport.height, Math.max(...bounds.map(p => p.bottom)) + 2);
    if (right <= left || bottom <= top || bottom-top > viewport.height * .08) return null;
    overlay.style.width = canvas.style.width;
    overlay.style.height = canvas.style.height;
    const mark = overlay.ownerDocument.createElement("span");
    mark.className = "committee-pdf-name-highlight";
    mark.setAttribute("aria-hidden", "true");
    mark.style.left = left + "px";
    mark.style.top = top + "px";
    mark.style.width = right-left + "px";
    mark.style.height = bottom-top + "px";
    overlay.appendChild(mark);
    return {top, height:bottom-top};
  }
  root.NongkumCommitteeHighlight = Object.freeze({compact,findLine,draw});
})(window);
