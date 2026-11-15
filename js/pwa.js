/* R31 — PWA registration and optional install action; no private data stored. */
(function () {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const script = document.currentScript;
  const root = script && script.src ? new URL("../", script.src) : new URL("./", location.href);
  let installPrompt = null;

  function showInstallButton() {
    const button = document.getElementById("pwaInstallButton");
    if (!button || !installPrompt) return;
    button.hidden = false;
    button.addEventListener("click", async () => {
      const prompt = installPrompt;
      installPrompt = null;
      button.hidden = true;
      try {
        await prompt.prompt();
        if (prompt.userChoice) await prompt.userChoice;
      } catch (_) {
        // The built-in browser menu remains available.
      }
    }, { once: true });
  }

  // These events are supported by Chromium on eligible sites; Safari uses
  // Share > Add to Home Screen, explained on install.html instead.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    const button = document.getElementById("pwaInstallButton");
    if (button) button.hidden = true;
  });

  const menu = document.querySelector(".program-more-panel");
  if (menu && !menu.querySelector("[data-pwa-install]")) {
    const link = document.createElement("a");
    link.className = "program-more-link";
    link.href = new URL("install.html", root).href;
    link.dataset.pwaInstall = "true";
    link.innerHTML = '<span class="program-more-icon" aria-hidden="true">📱</span><span><strong>ติดตั้งแอปบนมือถือ</strong><small>เปิดได้จากหน้าจอหลัก ไม่ต้องค้นหาลิงก์</small></span>';
    menu.appendChild(link);
  }

  function register() {
    if (!("serviceWorker" in navigator)) return;
    const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !local) return;
    navigator.serviceWorker.register(new URL("sw.js", root).href, {
      scope: root.pathname
    }).catch(() => {
      // Never block the normal website if the browser disallows workers.
    });
  }
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
})();
