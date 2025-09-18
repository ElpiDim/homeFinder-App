// backend/utils/matching.js
const prefKeyMap = {
  furnished: "furnished",
  parking: "parking",
  elevator: "elevator",
  haselevator: "elevator",
  pets: "pets",
  petsallowed: "pets",
  smoker: "smoker",
  smokingallowed: "smoker",
  familystatus: "familyStatus",
  maxprice: "maxPrice",
  rentmax: "maxPrice",
  salemax: "maxPrice",
  minsqm: "minSqm",
  sqmmin: "minSqm",
  bedrooms: "minBedrooms",
  minbedrooms: "minBedrooms",
  bathrooms: "minBathrooms",
  minbathrooms: "minBathrooms",
};

const normalizeImportance = (value) =>
  String(value).toLowerCase() === "high" ? "high" : "low";

const normalizeRequirementsList = (reqs) => {
  if (!reqs) return [];
  if (Array.isArray(reqs)) {
    return reqs
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof item.name === "string" &&
          Object.prototype.hasOwnProperty.call(item, "value")
      )
      .map((item) => ({
        name: item.name,
        value: item.value,
        importance: normalizeImportance(item.importance),
      }));
  }
  if (typeof reqs === "object") {
    return Object.entries(reqs).map(([name, value]) => ({
      name,
      value,
      importance: "low",
    }));
  }
  return [];
};

// Backwards compatibility helper used by some legacy code/tests
function normalizeOwnerReqs(reqs) {
  return normalizeRequirementsList(reqs).reduce((acc, cur) => {
    acc[cur.name] = cur.value;
    return acc;
  }, {});
}

const normalizeValue = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return "";
    const lower = trimmed.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
    const num = Number(trimmed);
    if (!Number.isNaN(num)) return num;
    return lower;
  }
  return value;
};

const getClientValue = (client, name) => {
  if (!name) return undefined;
  const key = prefKeyMap[name.toLowerCase()] || name;
  return client[key];
};

const requirementMatches = (ownerValueRaw, clientValueRaw) => {
  const ownerValue = normalizeValue(ownerValueRaw);
  const clientValue =
    clientValueRaw === undefined || clientValueRaw === null
      ? undefined
      : normalizeValue(clientValueRaw);

  if (typeof ownerValue === "boolean") {
    if (ownerValue === true) {
      return clientValue !== false;
    }
    return clientValue !== true;
  }

  if (clientValue === undefined || clientValue === "") {
    return false;
  }

  if (typeof ownerValue === "number" && typeof clientValue === "number") {
    return ownerValue === clientValue;
  }

  return ownerValue === clientValue;
};

function computeMatchScore(clientFilters = {}, ownerReqsRaw = {}, prop = {}) {
  const client = { ...clientFilters };
  const ownerRequirements = normalizeRequirementsList(ownerReqsRaw);

  const hardFails = [];

  const rent = prop.rent ?? prop.price;
  const sqm = prop.squareMeters ?? prop.surface;

  if (client.maxPrice != null && rent != null) {
    if (Number(client.maxPrice) < Number(rent)) hardFails.push("budget");
  }
  if (client.minSqm != null && sqm != null) {
    if (Number(client.minSqm) > Number(sqm)) hardFails.push("sqm");
  }
  if (client.minBedrooms != null && prop.bedrooms != null) {
    if (Number(client.minBedrooms) > Number(prop.bedrooms)) hardFails.push("bedrooms");
  }
  if (client.minBathrooms != null && prop.bathrooms != null) {
    if (Number(client.minBathrooms) > Number(prop.bathrooms)) hardFails.push("bathrooms");
  }

  let softTotal = 0;
  let softMatched = 0;

  for (const requirement of ownerRequirements) {
    if (!requirement || typeof requirement.name !== "string") continue;
    if (!Object.prototype.hasOwnProperty.call(requirement, "value")) continue;

    const importance = normalizeImportance(requirement.importance);
    const name = requirement.name.trim();
    if (!name) continue;

    const clientValue = getClientValue(client, name);
    const matches = requirementMatches(requirement.value, clientValue);

    if (importance === "high") {
      if (!matches) {
        hardFails.push(name);
      }
    } else {
      softTotal += 1;
      if (matches) softMatched += 1;
    }
  }

  if (hardFails.length) {
    return { score: 0, hardFails, softMatched, softTotal };
  }

  const score = softTotal > 0 ? softMatched / softTotal : 1;
  return { score, hardFails, softMatched, softTotal };
}

module.exports = { computeMatchScore, normalizeOwnerReqs };
