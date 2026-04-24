const Property = require("../models/property");
const MatchCandidate = require("../models/matchCandidate");
const User = require("../models/user");
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
  const toNotify = [];

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
      toNotify.push(newCandidate);
      continue;
    }

    if (existing.status === "pending") {
      if (!existing.ownerNotifiedAt) {
        toNotify.push(existing);
      }
      await MatchCandidate.updateOne(
        { _id: existing._id },
        { $set: { matchScore: score, considered, matched } }
      );
    }
  }

  return toNotify;
}

module.exports = {
  refreshCandidatesForClient,
  refreshCandidatesForProperty,
};

async function refreshCandidatesForProperty(propertyDoc) {
  if (!propertyDoc) return [];
  if (String(propertyDoc.status || "available").toLowerCase() !== "available") return [];

  const clients = await User.find({ role: "client" })
    .select("_id role name email preferences salary age householdSize hasFamily hasPets smoker occupation isWillingToHaveRoommate")
    .lean({ virtuals: true });

  const toNotify = [];

  for (const client of clients) {
    const rawPrefs = client.preferences || {};
    if (!Object.keys(rawPrefs).length) continue;
    if (rawPrefs.dealType && propertyDoc.type && rawPrefs.dealType !== propertyDoc.type) {
      continue;
    }

    const { score, hardFails, considered, matched } = computeMatchScore(
      mapClientPrefs(rawPrefs),
      propertyDoc.tenantRequirements || {},
      propertyDoc,
      client
    );

    if (hardFails?.length || score < MIN_SCORE) continue;

    const existing = await MatchCandidate.findOne({
      propertyId: propertyDoc._id,
      clientId: client._id,
    }).lean();

    if (!existing) {
      const created = await MatchCandidate.create({
        propertyId: propertyDoc._id,
        ownerId: propertyDoc.ownerId,
        clientId: client._id,
        status: "pending",
        matchScore: score,
        considered,
        matched,
      });
      toNotify.push(created);
      continue;
    }

    if (existing.status === "pending") {
      if (!existing.ownerNotifiedAt) toNotify.push(existing);
      await MatchCandidate.updateOne(
        { _id: existing._id },
        { $set: { matchScore: score, considered, matched } }
      );
    }
  }

  return toNotify;
}
