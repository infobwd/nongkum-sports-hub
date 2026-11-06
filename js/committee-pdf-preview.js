/* R19-I: Same-origin PDF.js committee reader reuses the program reader and its controls. */
(function(root){
"use strict";
const totalPages = 64;
const drive = "https://drive.google.com/file/d/1WwyCXlJYU8Iqxv3-l1QGsJzVUTDD4CoQ/view";
const dialog = document.getElementById("committeePdfDialog");
const frame = document.getElementById("committeePdfFrame");
const external = document.getElementById("committeePdfExternal");
const context = document.getElementById("committeePdfContext");
let returnFocus = null;
function pageNumber(input) {
  const n = Number(input);
  return Number.isInteger(n) && n >= 1 && n <= totalPages ? n : 1;
}
function readerUrl(page,embedded,reference) {
  const url = new URL("./committee-pdf-viewer.html", location.href);
  url.searchParams.set("doc", "committee");
  url.searchParams.set("page", String(page));
  if (embedded) url.searchParams.set("embedded", "1");
  // Only roster-provided entries on the same page get name highlighting.
  if (reference && Number(reference.pdf_page) === page &&
      /^\d+(?:\.\d+){1,3}$/.test(String(reference.number || "")) &&
      typeof reference.name === "string" && reference.name.trim().length >= 4 &&
      reference.name.length <= 160) {
    url.searchParams.set("number", reference.number);
    url.searchParams.set("name", reference.name);
  }
  return url.toString();
}
function open(page, reference) {
  const n = pageNumber(page);
  if (external) external.href = drive + "#page=" + n;
  if (!dialog || !frame || typeof dialog.showModal !== "function") {
    root.open(readerUrl(n,false,reference), "_blank", "noopener,noreferrer");
    return;
  }
  if (!dialog.open) {
    returnFocus = document.activeElement;
    dialog.showModal();
  }
  if (context) context.textContent = "เปิดต้นฉบับหน้า " + n + " จาก " + totalPages + " หน้า";
  frame.src = readerUrl(n,true,reference);
  document.getElementById("committeePdfClose")?.focus({preventScroll:true});
}
function close() {
  if (dialog?.open) dialog.close();
}
root.NongkumCommitteePdf = Object.freeze({open,close});
document.getElementById("committeePdfOpen")?.addEventListener("click",()=>open(1));
document.getElementById("committeePdfClose")?.addEventListener("click",close);
dialog?.addEventListener("close",()=>{
  frame?.removeAttribute("src"); // Stop rendering after closing; save mobile memory.
  if (returnFocus && typeof returnFocus.focus === "function" && returnFocus.isConnected)
    returnFocus.focus({preventScroll:true});
  returnFocus = null;
});
root.addEventListener("message",event=>{
  if (!dialog?.open || event.origin !== location.origin ||
      event.source !== frame?.contentWindow || event.data?.type !== "nongkum:close-pdf-viewer") return;
  close();
});
})(window);
