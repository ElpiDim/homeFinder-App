// backend/utils/matching.js
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : "");

// Αν τα owner requirements έρχονται σαν array [{name,value}], κάν' τα object
function normalizeOwnerReqs(reqs) {
  if (!reqs) return {};
  if (Array.isArray(reqs)) {
    return reqs.reduce((acc, cur) => {
      if (!cur || typeof cur.name !== "string") return acc;
      acc[cur.name] = cur.value;
      return acc;
    }, {});
  }
  return reqs; // ήδη object (π.χ. tenantRequirements)
}

function truthy(v) {
  return v === true || v === "true" || v === "1";
}

function computeMatchScore(
  clientFilters = {},
  ownerReqsRaw = {},
  prop = {},
  tenantProfile = {}
) {
  const owner = normalizeOwnerReqs(ownerReqsRaw);
  const client = { ...clientFilters };
  const tenant = tenantProfile || {};

  const hardFails = [];
  let considered = 0;
  let matched = 0;

  const rent = prop.rent ?? prop.price;
  const sqm = prop.squareMeters ?? prop.surface;

  // --- Hard constraints: budget / sqm / bedrooms / bathrooms ---
  if (client.maxPrice != null && rent != null) {
    considered++;
    if (Number(client.maxPrice) < Number(rent)) hardFails.push("budget");
    else matched++;
  }
  if (client.minSqm != null && sqm != null) {
    considered++;
    if (Number(client.minSqm) > Number(sqm)) hardFails.push("sqm");
    else matched++;
  }
  if (client.minBedrooms != null && prop.bedrooms != null) {
    considered++;
    if (Number(client.minBedrooms) > Number(prop.bedrooms)) hardFails.push("bedrooms");
    else matched++;
  }
  if (client.minBathrooms != null && prop.bathrooms != null) {
    considered++;
    if (Number(client.minBathrooms) > Number(prop.bathrooms)) hardFails.push("bathrooms");
    else matched++;
  }

  // --- Owner-driven prefs (μετράνε μόνο αν ο owner τα έχει ορίσει) ---
  const softBool = (keyProp, keyClient, keyOwner = keyProp) => {
    if (owner[keyOwner] === undefined) return;
    considered++;
    const ownerNeeds = truthy(owner[keyOwner]); // owner ζητάει το feature;
    const clientSaysNo = client[keyClient] === false || client[keyClient] === "false";
    if (ownerNeeds && clientSaysNo) return; // mismatch
    matched++; // είτε owner δεν απαιτεί, είτε client δεν το αρνείται ρητά
  };

  softBool("furnished", "furnished");
  softBool("parking", "parking");
  softBool("elevator", "elevator", "hasElevator"); // καλύπτει και hasElevator

  // Family status exact match όταν και οι δύο το έχουν
  const fsO = cap(owner.familyStatus);
  const fsC = cap(client.familyStatus);
  if (fsO && fsC) {
    considered++;
    if (fsO === fsC) matched++;
  }

  // Pets / smoker (owner μπορεί να απαγορεύει)
  if (owner.pets === false) {
    const hasPets = tenant.hasPets ?? tenant.pets ?? client.pets;
    if (hasPets === undefined || hasPets === true || hasPets === "true") {
      hardFails.push("tenant_pets");
    }
  }
  if (owner.smoker === false) {
    const isSmoker = tenant.smoker ?? client.smoker;
    if (isSmoker === undefined || isSmoker === true || isSmoker === "true") {
      hardFails.push("tenant_smoker");
    }
  }

  // --- Owner hard requirements vs tenant profile ---
  const tenantStatus = (() => {
    const size = tenant.householdSize ?? (tenant.hasFamily ? 3 : undefined);
    if (size == null) return undefined;
    if (Number(size) <= 1) return "single";
    if (Number(size) === 2) return "couple";
    return "family";
  })();

  if (owner.minTenantSalary !== undefined) {
    const salary = tenant.salary != null ? Number(tenant.salary) : undefined;
    if (salary === undefined || salary < Number(owner.minTenantSalary)) {
      hardFails.push("tenant_minTenantSalary");
    }
  }

  if (owner.allowedOccupations) {
    const list = Array.isArray(owner.allowedOccupations)
      ? owner.allowedOccupations
      : String(owner.allowedOccupations)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
    if (list.length) {
      const occ = tenant.occupation ? String(tenant.occupation).toLowerCase() : "";
      const ok = list.some((o) => String(o).toLowerCase() === occ);
      if (!ok) hardFails.push("tenant_allowedOccupations");
    }
  }

  if (owner.familyStatus && owner.familyStatus !== "any") {
    if (!tenantStatus || tenantStatus !== String(owner.familyStatus).toLowerCase()) {
      hardFails.push("tenant_familyStatus");
    }
  }

  if (owner.minTenantAge !== undefined) {
    const age = tenant.age != null ? Number(tenant.age) : undefined;
    if (age === undefined || age < Number(owner.minTenantAge)) {
      hardFails.push("tenant_minTenantAge");
    }
  }

  if (owner.maxTenantAge !== undefined) {
    const age = tenant.age != null ? Number(tenant.age) : undefined;
    if (age === undefined || age > Number(owner.maxTenantAge)) {
      hardFails.push("tenant_maxTenantAge");
    }
  }

  if (owner.maxHouseholdSize !== undefined) {
    const size = tenant.householdSize != null ? Number(tenant.householdSize) : undefined;
    if (size === undefined || size > Number(owner.maxHouseholdSize)) {
      hardFails.push("tenant_maxHouseholdSize");
    }
  }

  if (owner.roommatePreference && owner.roommatePreference !== "any") {
    const willing = tenant.isWillingToHaveRoommate;
    if (owner.roommatePreference === "roommates_only" && willing !== true) {
      hardFails.push("tenant_roommatePreference");
    }
    if (owner.roommatePreference === "no_roommates" && willing !== false) {
      hardFails.push("tenant_roommatePreference");
    }
  }

  if (hardFails.length) return { score: 0, considered, matched, hardFails };
  const score = considered ? matched / considered : 1; // αν δεν έχουμε συγκρίσιμα, μην κόβεις
  return { score, considered, matched };
}

module.exports = { computeMatchScore, normalizeOwnerReqs };
