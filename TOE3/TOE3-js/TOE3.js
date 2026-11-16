
/* =========================================================
   DST SKIN CATALOGUE
   Truckers of Europe 3
   Main application engine
========================================================= */

(() => {
  "use strict";

  const DST = window.DST;

  if (!DST || !DST.utils || !DST.async) {
    console.error("[DST TOE3] Shared utilities could not be loaded.");
    return;
  }

  const CONFIG = {
    skinsURL: "TOE3-data/TOE3-skins.json",
    catalogueURL: "TOE3-data/TOE3-catalogue.json",
    homePage: "TOE3-home.html",
    searchPage: "TOE3-search.html",
    browsePage: "TOE3-browse.html",
    skinPage: "TOE3-skin.html",
    fallbackImage: "../shared/shared-assets/site-logo.png",
    suggestionLimit: 5
  };

  const state = {
    skins: [],
    catalogue: null,
    loaded: false,
    loadError: null
  };

  const $ = (selector, parent = document) =>
    parent.querySelector(selector);

  const $$ = (selector, parent = document) =>
    Array.from(parent.querySelectorAll(selector));

  /* -------------------------------------------------------
     TEXT AND DATA UTILITIES
  ------------------------------------------------------- */

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || "";
  }

  function getBrand(brandId) {
    const brands = state.catalogue?.brands || [];

    const normalized = normalize(brandId);

    return brands.find(brand =>
      normalize(brand.id) === normalized ||
      normalize(brand.name) === normalized ||
      (brand.aliases || []).some(alias =>
        normalize(alias) === normalized
      )
    ) || null;
  }

  function getPart(partId) {
    const parts = state.catalogue?.parts || [];
    const normalized = normalize(partId);

    return parts.find(part =>
      normalize(part.id) === normalized ||
      normalize(part.name) === normalized ||
      (part.aliases || []).some(alias =>
        normalize(alias) === normalized
      )
    ) || null;
  }

  function getBrandName(brandId) {
    return getBrand(brandId)?.name || brandId || "";
  }

  function getPartName(partId) {
    return getPart(partId)?.name || DST.utils.capitalize(partId || "");
  }

  function getSkinId(skin) {
    return String(skin?.id || skin?.skinId || "");
  }

  function getSkinDisplayName(skin) {
    if (skin?.displayName) return skin.displayName;

    return [
      skin?.skinName || "Unnamed skin",
      skin?.vehicleName || ""
    ].filter(Boolean).join(" | ");
  }

  function getSkinBrand(skin) {
    return getBrandName(skin?.brand);
  }

  function getSkinSearchText(skin) {
    const values = [
      skin.skinName,
      skin.displayName,
      skin.brand,
      skin.vehicleName,
      skin.partType,
      ...(Array.isArray(skin.brandAliases) ? skin.brandAliases : [])
    ];

    const brand = getBrand(skin.brand);

    if (brand) {
      values.push(brand.name, brand.realManufacturer);
      values.push(...(brand.aliases || []));
    }

    return normalize(values.filter(Boolean).join(" "));
  }

  function getValidSkins() {
    return state.skins.filter(skin =>
      skin &&
      typeof skin === "object" &&
      getSkinId(skin) &&
      skin.skinName &&
      skin.vehicleName &&
      ["cabin", "trailer"].includes(normalize(skin.partType)) &&
      DST.images.isValidImageURL(skin.imageUrl)
    );
  }

  function uniqueSkins(skins) {
    const seen = new Set();

    return skins.filter(skin => {
      const id = getSkinId(skin);

      if (!id || seen.has(id)) return false;

      seen.add(id);
      return true;
    });
  }

  /* -------------------------------------------------------
     IMAGE HANDLING
  ------------------------------------------------------- */

  function createImage(url, alt, className) {
    const image = document.createElement("img");

    image.className = className || "";
    image.alt = alt || "TOE3 custom skin";
    image.loading = "lazy";
    image.decoding = "async";

    const validURL = DST.images.isValidImageURL(url);

    image.src = validURL ? url : CONFIG.fallbackImage;

    image.addEventListener("error", () => {
      if (image.dataset.fallbackApplied === "true") return;

      image.dataset.fallbackApplied = "true";
      image.src = CONFIG.fallbackImage;
    });

    return image;
  }

  /* -------------------------------------------------------
     SKIN CARD RENDERING
  ------------------------------------------------------- */

  function createSkinCard(skin) {
    const link = document.createElement("a");

    link.className = "skin-card";
    link.href = `${CONFIG.skinPage}?id=${encodeURIComponent(getSkinId(skin))}`;

    const image = createImage(
      skin.imageUrl,
      getSkinDisplayName(skin),
      "skin-card-image"
    );

    const content = document.createElement("div");
    content.className = "skin-card-content";

    const title = document.createElement("h3");
    title.className = "skin-card-title";
    title.textContent = getSkinDisplayName(skin);

    const meta = document.createElement("p");
    meta.className = "skin-card-meta";
    meta.textContent = [
      getSkinBrand(skin),
      getPartName(skin.partType)
    ].filter(Boolean).join(" · ");

    content.append(title, meta);
    link.append(image, content);

    return link;
  }

  function renderCards(container, skins, emptyTitle, emptyMessage) {
    if (!container) return;

    container.replaceChildren();

    const records = uniqueSkins(skins);

    if (!records.length) {
      const empty = document.createElement("div");

      empty.className = "results-state";

      const heading = document.createElement("strong");
      heading.textContent = emptyTitle || "No skins found";

      const message = document.createElement("span");
      message.textContent = emptyMessage ||
        state.catalogue?.display?.emptyCollectionMessage ||
        "No skins have been added to this collection yet.";

      empty.append(heading, message);
      container.append(empty);

      return;
    }

    records.forEach(skin => {
      container.append(createSkinCard(skin));
    });
  }

  /* -------------------------------------------------------
     PAGE STATUS AND LOADING
  ------------------------------------------------------- */

  function showPageError(message) {
    const status = $("[data-toe3-home-status]");

    if (status) {
      status.hidden = false;
      status.textContent = message;
    }

    const searchStatus = $("[data-toe3-results-grid]");

    if (searchStatus) {
      renderCards(
        searchStatus,
        [],
        "Catalogue unavailable",
        message
      );
    }

    const browseGrid = $("[data-toe3-browse-grid]");

    if (browseGrid) {
      renderCards(
        browseGrid,
        [],
        "Catalogue unavailable",
        message
      );
    }

    const loading = $("[data-toe3-skin-loading]");

    if (loading) {
      loading.hidden = true;
    }

    const error = $("[data-toe3-skin-error]");

    if (error) {
      error.hidden = false;

      const title = $("[data-toe3-error-title]", error);
      const description = $("[data-toe3-error-message]", error);

      if (title) title.textContent = "Catalogue unavailable";
      if (description) description.textContent = message;
    }
  }

  async function loadCatalogue() {
    try {
      const [skins, catalogue] = await Promise.all([
        DST.async.fetchJSON(CONFIG.skinsURL),
        DST.async.fetchJSON(CONFIG.catalogueURL)
      ]);

      if (!Array.isArray(skins)) {
        throw new Error("The TOE3 skin data must be a JSON array.");
      }

      if (!catalogue || !Array.isArray(catalogue.brands)) {
        throw new Error("The TOE3 catalogue configuration is invalid.");
      }

      state.skins = uniqueSkins(skins);
      state.catalogue = catalogue;
      state.loaded = true;

      return true;
    } catch (error) {
      console.error("[DST TOE3] Catalogue loading failed:", error);

      state.loadError = error;
      return false;
    }
  }

  /* -------------------------------------------------------
     HOME PAGE
  ------------------------------------------------------- */

  function renderHome() {
    const container = $("[data-toe3-latest-grid]");
    const status = $("[data-toe3-home-status]");

    if (!container) return;

    const skins = getValidSkins();

    const sorted = [...skins].sort((a, b) =>
      String(b.addedAt || "").localeCompare(String(a.addedAt || ""))
    );

    renderCards(
      container,
      sorted.slice(0, 6),
      "The catalogue is ready",
      "New TOE3 skins will appear here when they are added."
    );

    if (status) {
      status.hidden = true;
    }
  }

  /* -------------------------------------------------------
     SEARCH ENGINE
  ------------------------------------------------------- */

  function searchSkins(query) {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) return [];

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return uniqueSkins(getValidSkins().filter(skin => {
      const searchable = getSkinSearchText(skin);

      return terms.every(term => searchable.includes(term));
    }));
  }

  function createSuggestion(skin) {
    const link = document.createElement("a");

    link.className = "toe-suggestion-item";
    link.href = `${CONFIG.skinPage}?id=${encodeURIComponent(getSkinId(skin))}`;
    link.textContent = getSkinDisplayName(skin);

    return link;
  }

  function setupSearch() {
    const input = $("[data-toe3-search-input]");

    if (!input) return;

    const clearButton = $("[data-toe3-search-clear]");
    const suggestionPanel = $("[data-toe3-suggestion-panel]");
    const suggestionList = $("[data-toe3-suggestion-list]");
    const seeMoreButton = $("[data-toe3-see-more]");
    const resultsSection = $("[data-toe3-results-section]");
    const resultsGrid = $("[data-toe3-results-grid]");
    const resultsQuery = $("[data-toe3-results-query]");
    const resultsCount = $("[data-toe3-results-count]");
    const defaultState = $("[data-toe3-default-state]");

    const initialQuery = getParam("q");
    const showAll = getParam("view") === "all";

    let currentMatches = [];

    function updateResults(query, matches) {
      if (resultsQuery) {
        resultsQuery.textContent = query
          ? `Results for "${query}"`
          : "All TOE3 skins";
      }

      if (resultsCount) {
        resultsCount.textContent =
          `${matches.length} ${matches.length === 1 ? "skin" : "skins"}`;
      }

      renderCards(
        resultsGrid,
        matches,
        "No matching skins",
        "Try another skin name, vehicle, brand or category."
      );

      if (resultsSection) {
        resultsSection.hidden = false;
      }

      if (defaultState) {
        defaultState.hidden = true;
      }
    }

    function hideSuggestions() {
      if (suggestionPanel) suggestionPanel.hidden = true;
      if (suggestionList) suggestionList.replaceChildren();
    }

    function updateSearch() {
      const query = input.value.trim();

      if (clearButton) {
        clearButton.hidden = !query;
      }

      if (!query) {
        currentMatches = [];
        hideSuggestions();

        if (resultsSection) resultsSection.hidden = true;
        if (defaultState) defaultState.hidden = false;

        return;
      }

      currentMatches = searchSkins(query);

      if (suggestionList) {
        suggestionList.replaceChildren();

        currentMatches
          .slice(0, CONFIG.suggestionLimit)
          .forEach(skin => {
            suggestionList.append(createSuggestion(skin));
          });
      }

      if (suggestionPanel) {
        suggestionPanel.hidden = currentMatches.length === 0;
      }

      if (seeMoreButton) {
        seeMoreButton.hidden =
          currentMatches.length <= CONFIG.suggestionLimit;
      }

      if (showAll || resultsSection && !resultsSection.hidden) {
        updateResults(query, currentMatches);
      }
    }

    input.addEventListener("input", updateSearch);

    input.addEventListener("keydown", event => {
      if (event.key === "Enter" && input.value.trim()) {
        event.preventDefault();

        window.location.href =
          `${CONFIG.searchPage}?view=all&q=${encodeURIComponent(input.value.trim())}`;
      }

      if (event.key === "Escape") {
        hideSuggestions();
      }
    });

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        input.value = "";
        input.focus();
        updateSearch();
      });
    }

    if (seeMoreButton) {
      seeMoreButton.addEventListener("click", () => {
        if (!input.value.trim()) return;

        window.location.href =
          `${CONFIG.searchPage}?view=all&q=${encodeURIComponent(input.value.trim())}`;
      });
    }

    document.addEventListener("click", event => {
      if (
        suggestionPanel &&
        !suggestionPanel.contains(event.target) &&
        event.target !== input
      ) {
        hideSuggestions();
      }
    });

    if (initialQuery) {
      input.value = initialQuery;
      updateSearch();

      if (showAll) {
        updateResults(initialQuery, currentMatches);
      }
    } else if (showAll) {
      updateResults("", getValidSkins());
    }
  }

  /* -------------------------------------------------------
     BROWSE PAGE
  ------------------------------------------------------- */

  function renderBrowse() {
    const results = $("[data-toe3-browse-results]");

    if (!results) return;

    const kind = normalize(getParam("kind"));
    const value = getParam("value");

    if (!kind || !value) return;

    const title = $("[data-toe3-browse-title]");
    const description = $("[data-toe3-browse-description]");
    const count = $("[data-toe3-browse-count]");
    const grid = $("[data-toe3-browse-grid]");

    results.hidden = false;

    let matches = [];
    let heading = "Collection";
    let supportingText = "";

    if (kind === "part") {
      const part = getPart(value);

      if (!part) {
        heading = "Collection not found";
        supportingText = "This skin category does not exist.";
      } else {
        heading = `${part.name} skins`;
        supportingText = `Browse all ${part.name.toLowerCase()} skins in the TOE3 catalogue.`;

        matches = getValidSkins().filter(skin =>
          normalize(skin.partType) === normalize(part.id)
        );
      }
    } else if (kind === "brand") {
      const brand = getBrand(value);

      if (!brand) {
        heading = "Brand not found";
        supportingText = "This manufacturer is not listed in the TOE3 catalogue.";
      } else {
        heading = `${brand.name} skins`;
        supportingText = `Browse the ${brand.name} collection.`;

        matches = getValidSkins().filter(skin =>
          normalize(getBrand(skin.brand)?.id) === normalize(brand.id)
        );

        if (brand.status === "coming-soon" && !matches.length) {
          supportingText =
            state.catalogue?.display?.comingSoonMessage ||
            "This brand's skin collection is coming soon.";
        }
      }
    } else {
      heading = "Invalid collection";
      supportingText = "The requested collection type is not supported.";
    }

    if (title) title.textContent = heading;
    if (description) description.textContent = supportingText;

    if (count) {
      count.textContent =
        `${matches.length} ${matches.length === 1 ? "skin" : "skins"}`;
    }

    renderCards(
      grid,
      matches,
      heading === "Invalid collection" ? heading : "No skins yet",
      supportingText ||
        state.catalogue?.display?.emptyCollectionMessage
    );

    results.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start"
    });
  }

  /* -------------------------------------------------------
     SKIN DETAIL PAGE
  ------------------------------------------------------- */

  function setDetailValue(selector, value) {
    const element = $(selector);

    if (element) {
      element.textContent = value || "";
    }
  }

  function setDetailVisibility(selector, visible) {
    const element = $(selector);

    if (element) {
      element.hidden = !visible;
    }
  }

  async function copyImageURL(url) {
    if (!url || !DST.images.isValidImageURL(url)) {
      return false;
    }

    try {
      if (DST.clipboard?.copy) {
        await DST.clipboard.copy(url);
        return true;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        return true;
      }

      return false;
    } catch (error) {
      console.error("[DST TOE3] Copy failed:", error);
      return false;
    }
  }

  function renderSkinDetail() {
    const content = $("[data-toe3-skin-content]");

    if (!content) return;

    const loading = $("[data-toe3-skin-loading]");
    const error = $("[data-toe3-skin-error]");

    if (loading) loading.hidden = true;

    const id = getParam("id");

    const skin = getValidSkins().find(record =>
      getSkinId(record) === id
    );

    if (!skin) {
      if (error) {
        error.hidden = false;

        setDetailValue(
          "[data-toe3-error-title]",
          "Skin not found"
        );

        setDetailValue(
          "[data-toe3-error-message]",
          "This skin may have been removed or the link may be incorrect."
        );
      }

      content.hidden = true;
      return;
    }

    if (error) error.hidden = true;

    const image = $("[data-toe3-skin-image]");

    if (image) {
      image.src = skin.imageUrl;
      image.alt = getSkinDisplayName(skin);
      image.loading = "eager";
      image.decoding = "async";

      image.onerror = () => {
        image.onerror = null;
        image.src = CONFIG.fallbackImage;
      };
    }

    const displayName = getSkinDisplayName(skin);
    const brandName = getSkinBrand(skin);
    const vehicleName = skin.vehicleName;
    const partName = getPartName(skin.partType);

    setDetailValue("[data-toe3-skin-name]", displayName);
    setDetailValue("[data-toe3-skin-description]", skin.description || "");
    setDetailValue("[data-toe3-brand]", brandName);
    setDetailValue("[data-toe3-vehicle]", vehicleName);
    setDetailValue("[data-toe3-part-type]", partName);
    setDetailValue("[data-toe3-breadcrumb-current]", displayName);

    setDetailVisibility("[data-toe3-detail='brand']", Boolean(brandName));
    setDetailVisibility("[data-toe3-detail='vehicle']", Boolean(vehicleName));
    setDetailVisibility("[data-toe3-detail='part']", Boolean(partName));

    document.title = `${displayName} | DST SKIN CATALOGUE`;

    const copyButton = $("[data-toe3-copy-image]");
    const copyStatus = $("[data-toe3-copy-status]");

    if (copyButton) {
      copyButton.disabled = !DST.images.isValidImageURL(skin.imageUrl);

      copyButton.onclick = async () => {
        copyButton.disabled = true;

        const copied = await copyImageURL(skin.imageUrl);

        if (copyStatus) {
          copyStatus.textContent = copied
            ? "Image URL copied."
            : "Could not copy the image URL. Please try again.";
        }

        copyButton.disabled = false;
      };
    }

    content.hidden = false;
  }

  /* -------------------------------------------------------
     GLOBAL INITIALIZATION
  ------------------------------------------------------- */

  async function init() {
    if (typeof DST.page?.updateCurrentYear === "function") {
      DST.page.updateCurrentYear();
    }

    const loaded = await loadCatalogue();

    if (!loaded) {
      showPageError(
        "The TOE3 catalogue could not be loaded. Please check your connection and try again."
      );

      return;
    }

    renderHome();
    setupSearch();
    renderBrowse();
    renderSkinDetail();

    if (typeof DST.page?.setTitle === "function") {
      DST.page.setTitle("DST SKIN CATALOGUE");
    }

    console.info(
      `[DST TOE3] Ready. ${getValidSkins().length} valid skin records loaded.`
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

})();
