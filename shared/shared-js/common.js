
/* =========================================================
   DST SKIN CATALOGUE
   COMMON.JS
   Shared utilities for GTO and TOE3
   ========================================================= */

"use strict";

(() => {

    const DST = window.DST || {};


    /* -----------------------------------------------------
       01. GENERAL HELPERS
       ----------------------------------------------------- */

    DST.utils = {

        // Select a single element
        select(selector, parent = document) {
            return parent.querySelector(selector);
        },

        // Select multiple elements
        selectAll(selector, parent = document) {
            return Array.from(parent.querySelectorAll(selector));
        },

        // Get URL parameters
        getParam(name) {
            return new URLSearchParams(window.location.search).get(name);
        },

        // Normalize text for searching
        normalizeText(value) {
            return String(value ?? "")
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim();
        },

        // Capitalize the first letter
        capitalize(value) {
            const text = String(value ?? "").trim();

            if (!text) return "";

            return text.charAt(0).toUpperCase() + text.slice(1);
        },

        // Check whether a value is a non-empty string
        isNonEmptyString(value) {
            return typeof value === "string" && value.trim().length > 0;
        },

        // Generate a unique identifier
        createId(prefix = "dst") {
            return `${prefix}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`;
        }

    };


    /* -----------------------------------------------------
       02. ASYNCHRONOUS HELPERS
       ----------------------------------------------------- */

    DST.async = {

        // Fetch JSON data
        async fetchJSON(url) {

            try {

                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(
                        `Request failed: ${response.status}`
                    );
                }

                return await response.json();

            } catch (error) {

                console.error(
                    `[DST] Could not load JSON: ${url}`,
                    error
                );

                throw error;
            }
        },

        // Debounce rapidly repeated function calls
        debounce(callback, delay = 250) {

            let timeout;

            return function (...args) {

                clearTimeout(timeout);

                timeout = setTimeout(() => {
                    callback.apply(this, args);
                }, delay);

            };
        }

    };


    /* -----------------------------------------------------
       03. CLIPBOARD
       ----------------------------------------------------- */

    DST.clipboard = {

        async copy(value) {

            const text = String(value ?? "");

            if (!text.trim()) {
                return false;
            }

            try {

                if (navigator.clipboard && window.isSecureContext) {

                    await navigator.clipboard.writeText(text);
                    return true;

                }

                // Fallback for browsers without Clipboard API
                const textarea = document.createElement("textarea");

                textarea.value = text;
                textarea.setAttribute("readonly", "");
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                textarea.style.pointerEvents = "none";

                document.body.appendChild(textarea);

                textarea.select();

                const copied = document.execCommand("copy");

                textarea.remove();

                return copied;

            } catch (error) {

                console.error("[DST] Clipboard operation failed:", error);

                return false;
            }

        }

    };


    /* -----------------------------------------------------
       04. IMAGE UTILITIES
       ----------------------------------------------------- */

    DST.images = {

        // Apply a fallback when an image fails to load
        applyFallback(image, fallback = "") {

            if (!(image instanceof HTMLImageElement)) {
                return;
            }

            image.addEventListener("error", () => {

                if (fallback && image.src !== fallback) {

                    image.src = fallback;

                } else {

                    image.classList.add("image-error");

                    image.removeAttribute("src");
                }

            }, { once: true });

        },

        // Check whether a URL is a valid HTTPS image URL
        isValidImageURL(value) {

            try {

                const url = new URL(value);

                return url.protocol === "https:";

            } catch {

                return false;

            }

        }

    };


    /* -----------------------------------------------------
       05. PAGE UTILITIES
       ----------------------------------------------------- */

    DST.page = {

        // Update the browser page title
        setTitle(title) {

            if (typeof title === "string" && title.trim()) {
                document.title = `${title} | DST SKIN CATALOGUE`;
            }

        },

        // Update elements displaying the current year
        updateCurrentYear() {

            const year = new Date().getFullYear();

            DST.utils.selectAll("[data-current-year]")
                .forEach(element => {
                    element.textContent = year;
                });

        },

        // Scroll to the top of the page
        scrollToTop() {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }

    };


    /* -----------------------------------------------------
       06. SHARED INITIALIZATION
       ----------------------------------------------------- */

    DST.init = function () {

        DST.page.updateCurrentYear();

    };


    // Expose the shared utilities
    window.DST = DST;


    // Initialize after the document is ready
    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", DST.init, {
            once: true
        });

    } else {

        DST.init();

    }

})();
                  
