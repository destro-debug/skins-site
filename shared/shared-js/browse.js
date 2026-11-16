
(() => {
  "use strict";

  const DST = (window.DST = window.DST || {});

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function matchesValue(value, requested) {
    const target = normalize(requested);

    if (!target) return false;

    if (Array.isArray(value)) {
      return value.some((item) => normalize(item) === target);
    }

    return normalize(value) === target;
  }

  function matchesBrand(record, brand, config = {}) {
    if (!brand) return true;

    const brandFields = config.brandFields || [
      "brand",
      "brandAliases"
    ];

    return brandFields.some((field) =>
      matchesValue(record?.[field], brand)
    );
  }

  function matchesPartType(record, partType) {
    if (!partType) return true;

    return matchesValue(record?.partType, partType);
  }

  function matchesVehicleType(record, vehicleType) {
    if (!vehicleType) return true;

    return matchesValue(record?.vehicleType, vehicleType);
  }

  function getUniqueRecords(records) {
    if (!Array.isArray(records)) return [];

    const seen = new Set();

    return records.filter((record) => {
      if (!record || typeof record !== "object") return false;

      const key =
        record.id ??
        record.skinId ??
        record.displayName ??
        record.skinName;

      if (key == null) return true;

      const normalizedKey = String(key);

      if (seen.has(normalizedKey)) return false;

      seen.add(normalizedKey);
      return true;
    });
  }

  function browse(records, filters = {}, config = {}) {
    const uniqueRecords = getUniqueRecords(records);

    const {
      brand = "",
      partType = "",
      vehicleType = ""
    } = filters;

    return uniqueRecords
      .filter((record) => matchesBrand(record, brand, config))
      .filter((record) => matchesPartType(record, partType))
      .filter((record) => matchesVehicleType(record, vehicleType))
      .sort((a, b) =>
        normalize(a.displayName || a.skinName).localeCompare(
          normalize(b.displayName || b.skinName)
        )
      );
  }

  function getCollection(records, filters = {}, config = {}) {
    const results = browse(records, filters, config);

    return {
      results,
      count: results.length,
      isEmpty: results.length === 0
    };
  }

  DST.browse = {
    normalize,
    matchesValue,
    matchesBrand,
    matchesPartType,
    matchesVehicleType,
    getUniqueRecords,
    browse,
    getCollection
  };
})();
  
