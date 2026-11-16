
(() => {
  "use strict";

  const DST = (window.DST = window.DST || {});

  const select = (selector, parent = document) =>
    parent.querySelector(selector);

  let deferredInstallPrompt = null;

  function getInstallButton() {
    return select("[data-install-button]");
  }

  function hideInstallButton() {
    const button = getInstallButton();

    if (button) {
      button.hidden = true;
      button.disabled = true;
    }
  }

  function showInstallButton() {
    const button = getInstallButton();

    if (button) {
      button.hidden = false;
      button.disabled = false;
    }
  }

  function setupInstallButton() {
    const button = getInstallButton();

    if (!button) return;

    hideInstallButton();

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;

      showInstallButton();
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      hideInstallButton();
    });

    button.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;

      button.disabled = true;

      try {
        await deferredInstallPrompt.prompt();

        const choice = await deferredInstallPrompt.userChoice;

        if (choice?.outcome === "accepted") {
          hideInstallButton();
        } else {
          button.disabled = false;
        }
      } catch (error) {
        console.error("DST install prompt error:", error);
        button.disabled = false;
      } finally {
        deferredInstallPrompt = null;
      }
    });
  }

  function isSameSiteHistoryEntry() {
    if (window.history.length <= 1) return false;

    try {
      return (
        document.referrer &&
        new URL(document.referrer).origin === window.location.origin
      );
    } catch {
      return false;
    }
  }

  function getBackFallback(button) {
    const customFallback = button.getAttribute("data-back-fallback");

    if (customFallback) {
      return customFallback;
    }

    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);

    if (segments.length <= 1) {
      return "../index.html";
    }

    return "../index.html";
  }

  function setupBackButtons() {
    const buttons = document.querySelectorAll("[data-back-button]");

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (isSameSiteHistoryEntry()) {
          window.history.back();
          return;
        }

        window.location.assign(getBackFallback(button));
      });
    });
  }

  function init() {
    setupInstallButton();
    setupBackButtons();
  }

  DST.navigation = {
    init,
    setupInstallButton,
    setupBackButtons
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
 
