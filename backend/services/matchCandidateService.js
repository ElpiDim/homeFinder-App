const Property = require("../models/property");
const MatchCandidate = require("../models/matchCandidate");
const { computeMatchScore } = require("../utils/matching");

const mapClientPrefs = (p = {}) => ({
  location: p.location ?? p.city ?? p.preferredCity,
  minPrice: p.minPrice ?? p.rentMin ?? p.saleMin ?? p.priceMin ?? p.budgetMin,
  maxPrice: p.maxPrice ?? p.rentMax ?? p.saleMax ?? p.priceMax,
  minSqm: p.minSqm ?? p.sqmMin,
  minBedrooms: p.minBedrooms ?? p.bedrooms,
  minBathrooms: p.minBathrooms ?? p.bathrooms,
  furnished: p.furnished,
  parking: p.parking,
  elevator: p.elevator ?? p.hasElevator,
  pets: p.pets ?? p.petsAllowed,
  smoker: p.smoker ?? p.smokingAllowed,
  familyStatus: p.familyStatus,
});

const MIN_SCORE = 0.5;

async function refreshCandidatesForClient(clientDoc) {
  if (!clientDoc || clientDoc.role !== "client") return [];
  const rawPrefs = clientDoc.preferences || {};
  if (!Object.keys(rawPrefs).length) return [];

  const dbMatch = { status: "available" };
  if (rawPrefs.dealType) dbMatch.type = rawPrefs.dealType;

  const properties = await Property.find(dbMatch)
    .select("_id ownerId tenantRequirements type")
    .lean();

  const prefs = mapClientPrefs(rawPrefs);
  const created = [];

  for (const prop of properties) {
    const { score, hardFails, considered, matched } = computeMatchScore(
      prefs,
      prop.tenantRequirements || {},
      prop,
      clientDoc
    );

    if (hardFails?.length || score < MIN_SCORE) continue;

    const existing = await MatchCandidate.findOne({
      propertyId: prop._id,
      clientId: clientDoc._id,
    }).lean();

    if (!existing) {
      const newCandidate = await MatchCandidate.create({
        propertyId: prop._id,
        ownerId: prop.ownerId,
        clientId: clientDoc._id,
        status: "pending",
        matchScore: score,
        considered,
        matched,
      });
      created.push(newCandidate);
      continue;
    }

    if (existing.status === "pending") {
      await MatchCandidate.updateOne(
        { _id: existing._id },
        { $set: { matchScore: score, considered, matched } }
      );
    }
  }

  return created;
}

module.exports = {
  refreshCandidatesForClient,
};
