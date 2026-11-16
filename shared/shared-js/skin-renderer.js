
(() => {
  "use strict";

  const DST = (window.DST = window.DST || {});

  const select = (selector, parent = document) =>
    parent.querySelector(selector);

  function setText(element, value) {
    if (!element) return;

    element.textContent =
      value == null || value === "" ? "" : String(value);
  }

  function setImage(image, imageUrl, fallback) {
    if (!image) return;

    image.alt = "Skin preview";
    image.loading = "lazy";

    if (DST.images?.applyFallback) {
      DST.images.applyFallback(image, fallback);
    }

    if (
      typeof imageUrl === "string" &&
      DST.images?.isValidImageURL?.(imageUrl)
    ) {
      image.src = imageUrl;
    } else if (fallback) {
      image.src = fallback;
    } else {
      image.removeAttribute("src");
    }
  }

  function showElement(element, visible) {
    if (!element) return;

    element.hidden = !visible;
  }

  function renderFields(record, fieldMap = {}) {
    Object.entries(fieldMap).forEach(([selector, field]) => {
      const element = select(selector);
      const value = record?.[field];

      setText(element, value);
      showElement(element, value != null && value !== "");
    });
  }

  function render(record, options = {}) {
    const {
      selectors = {},
      fallbackImage = "",
      fields = {},
      onMissing = null
    } = options;

    if (!record) {
      if (typeof onMissing === "function") {
        onMissing();
      }

      const title = select(selectors.title || "[data-skin-title]");
      const description = select(
        selectors.description || "[data-skin-description]"
      );

      setText(title, "Skin not found");
      setText(description, "This skin may have been removed or the link is invalid.");

      showElement(
        select(selectors.container || "[data-skin-container]"),
        true
      );

      showElement(
        select(selectors.content || "[data-skin-content]"),
        false
      );

      return false;
    }

    const container = select(
      selectors.container || "[data-skin-container]"
    );

    const content = select(
      selectors.content || "[data-skin-content]"
    );

    const image = select(
      selectors.image || "[data-skin-image]"
    );

    const title = select(
      selectors.title || "[data-skin-title]"
    );

    const description = select(
      selectors.description || "[data-skin-description]"
    );

    showElement(container, true);
    showElement(content, true);

    setText(title, record.displayName || record.skinName || "Untitled skin");
    setText(description, record.description || "");

    setImage(image, record.imageUrl, fallbackImage);

    renderFields(record, {
      "[data-skin-brand]": "brand",
      "[data-skin-vehicle]": "vehicleName",
      "[data-skin-type]": "vehicleType",
      "[data-skin-part]": "partType",
      ...fields
    });

    return true;
  }

  function findById(records, id) {
    if (!Array.isArray(records) || !id) return null;

    return (
      records.find((record) => {
        const recordId = record?.id ?? record?.skinId;

        return recordId != null && String(recordId) === String(id);
      }) || null
    );
  }

  function getCurrentSkinId(parameter = "id") {
    const params = new URLSearchParams(window.location.search);
    return params.get(parameter);
  }

  DST.skinRenderer = {
    render,
    renderFields,
    findById,
    getCurrentSkinId
  };
})();
        
