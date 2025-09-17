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

function computeMatchScore(clientFilters = {}, ownerReqsRaw = {}, prop = {}) {
  const owner = normalizeOwnerReqs(ownerReqsRaw);
  const client = { ...clientFilters };

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
    considered++;
    if (client.pets === true) {
      // mismatch
    } else matched++;
  }
  if (owner.smoker === false) {
    considered++;
    if (client.smoker === true) {
      // mismatch
    } else matched++;
  }

  if (hardFails.length) return { score: 0, considered, matched, hardFails };
  const score = considered ? matched / considered : 1; // αν δεν έχουμε συγκρίσιμα, μην κόβεις
  return { score, considered, matched };
}

module.exports = { computeMatchScore, normalizeOwnerReqs };
