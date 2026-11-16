
(() => {
  "use strict";

  const DST = (window.DST = window.DST || {});

  const SUGGESTION_LIMIT = 5;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getSearchableFields(record, config = {}) {
    const fields = config.fields || [
      "skinName",
      "displayName",
      "brand",
      "brandAliases",
      "vehicleName",
      "vehicleType",
      "partType",
      "aliases"
    ];

    return fields.flatMap((field) => {
      const value = record?.[field];

      if (Array.isArray(value)) {
        return value;
      }

      return value == null ? [] : [value];
    });
  }

  function matchesRecord(record, query, config = {}) {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) return false;

    const searchableValues = getSearchableFields(record, config);

    return searchableValues.some((value) =>
      normalize(value).includes(normalizedQuery)
    );
  }

  function search(records, query, config = {}) {
    if (!Array.isArray(records)) return [];

    const normalizedQuery = normalize(query);

    if (!normalizedQuery) return [];

    const seen = new Set();

    return records.filter((record) => {
      if (!record || typeof record !== "object") return false;

      const uniqueKey =
        record.id ??
        record.skinId ??
        record.displayName ??
        record.skinName;

      if (uniqueKey != null) {
        const key = String(uniqueKey);

        if (seen.has(key)) return false;

        seen.add(key);
      }

      return matchesRecord(record, normalizedQuery, config);
    });
  }

  function getSuggestions(records, query, config = {}) {
    return search(records, query, config).slice(0, SUGGESTION_LIMIT);
  }

  function hasMoreResults(records, query, config = {}) {
    return search(records, query, config).length > SUGGESTION_LIMIT;
  }

  function getResultCount(records, query, config = {}) {
    return search(records, query, config).length;
  }

  function createSearchURL(basePath, query) {
    const url = new URL(basePath, window.location.href);

    url.searchParams.set("q", String(query ?? "").trim());

    return url.href;
  }

  DST.search = {
    normalize,
    getSearchableFields,
    matchesRecord,
    search,
    getSuggestions,
    hasMoreResults,
    getResultCount,
    createSearchURL,
    suggestionLimit: SUGGESTION_LIMIT
  };
})();
