// controllers/matchController.js
const User = require("../models/user");
const Property = require("../models/property");
const Match = require("../models/match");
const Notification = require("../models/notification");

const MIN_MATCH_COUNT = 2;

const ciEq = (a, b) =>
  String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

const ciIncludes = (hay, needle) =>
  String(hay || "").toLowerCase().includes(String(needle || "").toLowerCase());

const triVal = (v) => (v === true ? true : v === false ? false : null);

const scorePrefsVsProperty = (prefs = {}, p = {}) => {
  let score = 0;
  let checks = 0;
  const fails = [];

  if (prefs.dealType) {
    checks++;
    if (p.type === prefs.dealType) score++;
    else fails.push("dealType");
  }

  if (prefs.location) {
    checks++;
    if (ciIncludes(p.location, prefs.location)) score++;
    else fails.push("location");
  }

  if (prefs.dealType === "rent") {
    const min = prefs.rentMin ?? undefined;
    const max = prefs.rentMax ?? undefined;

    if (min !== undefined) {
      checks++;
      if (p.price >= Number(min)) score++;
      else fails.push("rentMin");
    }

    if (max !== undefined) {
      checks++;
      if (p.price <= Number(max)) score++;
      else fails.push("rentMax");
    }
  } else if (prefs.dealType === "sale") {
    const min = prefs.priceMin ?? prefs.saleMin ?? undefined;
    const max = prefs.priceMax ?? prefs.saleMax ?? undefined;

    if (min !== undefined) {
      checks++;
      if (p.price >= Number(min)) score++;
      else fails.push("priceMin");
    }

    if (max !== undefined) {
      checks++;
      if (p.price <= Number(max)) score++;
      else fails.push("priceMax");
    }
  }

  if (prefs.sqmMin !== undefined) {
    checks++;
    if ((p.squareMeters ?? 0) >= Number(prefs.sqmMin)) score++;
    else fails.push("sqmMin");
  }

  if (prefs.sqmMax !== undefined) {
    checks++;
    if ((p.squareMeters ?? 0) <= Number(prefs.sqmMax)) score++;
    else fails.push("sqmMax");
  }

  if (prefs.bedrooms !== undefined) {
    checks++;
    if ((p.bedrooms ?? 0) >= Number(prefs.bedrooms)) score++;
    else fails.push("bedrooms");
  }

  if (prefs.bathrooms !== undefined) {
    checks++;
    if ((p.bathrooms ?? 0) >= Number(prefs.bathrooms)) score++;
    else fails.push("bathrooms");
  }

  if (prefs.floorMin !== undefined) {
    checks++;
    if ((p.floor ?? 0) >= Number(prefs.floorMin)) score++;
    else fails.push("floorMin");
  }

  if (prefs.floorMax !== undefined) {
    checks++;
    if ((p.floor ?? 0) <= Number(prefs.floorMax)) score++;
    else fails.push("floorMax");
  }

  if (prefs.yearBuiltMin !== undefined) {
    checks++;
    if ((p.yearBuilt ?? 0) >= Number(prefs.yearBuiltMin)) score++;
    else fails.push("yearBuiltMin");
  }

  const furnished = triVal(prefs.furnished);
  if (furnished !== null) {
    checks++;
    if (Boolean(p.furnished) === furnished) score++;
    else fails.push("furnished");
  }

  const elevator = triVal(prefs.elevator ?? prefs.hasElevator);
  if (elevator !== null) {
    checks++;
    if (Boolean(p.hasElevator) === elevator) score++;
    else fails.push("elevator");
  }

  const parking = triVal(prefs.parking);
  if (parking !== null) {
    const hasParking = (p.parkingSpaces ?? 0) > 0;
    checks++;
    if (hasParking === parking) score++;
    else fails.push("parking");
  }

  const pets = triVal(prefs.petsAllowed);
  if (pets !== null) {
    checks++;
    if (Boolean(p.petsAllowed) === pets) score++;
    else fails.push("petsAllowed");
  }

  const smoking = triVal(prefs.smokingAllowed);
  if (smoking !== null) {
    checks++;
    if (Boolean(p.smokingAllowed) === smoking) score++;
    else fails.push("smokingAllowed");
  }

  if (prefs.heatingType) {
    checks++;
    if (ciEq(p.heating, prefs.heatingType)) score++;
    else fails.push("heatingType");
  }

  return { score, checks, fails };
};

const scoreRequirementsVsTenant = (tenantReq = {}, user = {}) => {
  let score = 0;
  let checks = 0;
  const fails = [];

  if (tenantReq.minTenantSalary !== undefined) {
    checks++;
    if ((user.salary ?? 0) >= Number(tenantReq.minTenantSalary)) score++;
    else fails.push("minTenantSalary");
  }

  if (
    Array.isArray(tenantReq.allowedOccupations) &&
    tenantReq.allowedOccupations.length
  ) {
    checks++;
    const occList = tenantReq.allowedOccupations.map((s) =>
      String(s).toLowerCase()
    );
    const ok = user.occupation
      ? occList.includes(String(user.occupation).toLowerCase())
      : false;

    if (ok) score++;
    else fails.push("allowedOccupations");
  }

  if (tenantReq.pets !== undefined) {
    checks++;
    const allowed = Boolean(tenantReq.pets);
    if (allowed || !user.hasPets) score++;
    else fails.push("pets");
  }

  if (tenantReq.smoker !== undefined) {
    checks++;
    const allowed = Boolean(tenantReq.smoker);
    if (allowed || !user.smoker) score++;
    else fails.push("smoker");
  }

  if (tenantReq.familyStatus && tenantReq.familyStatus !== "any") {
    checks++;
    const size = user.householdSize ?? (user.hasFamily ? 3 : 1);
    const status = size <= 1 ? "single" : size === 2 ? "couple" : "family";

    if (tenantReq.familyStatus === status) score++;
    else fails.push("familyStatus");
  }

  if (tenantReq.minTenantAge !== undefined) {
    checks++;
    if ((user.age ?? 0) >= Number(tenantReq.minTenantAge)) score++;
    else fails.push("minTenantAge");
  }

  if (tenantReq.maxTenantAge !== undefined) {
    checks++;
    if (user.age != null && Number(user.age) <= Number(tenantReq.maxTenantAge)) {
      score++;
    } else {
      fails.push("maxTenantAge");
    }
  }

  if (tenantReq.maxHouseholdSize !== undefined) {
    checks++;
    const size = user.householdSize ?? (user.hasFamily ? 3 : 1);

    if (size != null && Number(size) <= Number(tenantReq.maxHouseholdSize)) {
      score++;
    } else {
      fails.push("maxHouseholdSize");
    }
  }

  if (tenantReq.roommatePreference && tenantReq.roommatePreference !== "any") {
    checks++;
    const willing = Boolean(user.isWillingToHaveRoommate);

    if (
      (tenantReq.roommatePreference === "roommates_only" && willing) ||
      (tenantReq.roommatePreference === "no_roommates" && !willing)
    ) {
      score++;
    } else {
      fails.push("roommatePreference");
    }
  }

  return { score, checks, fails };
};

/**
 * CLIENT MATCHING:
 * Βρίσκει πιθανά matches και δημιουργεί pending_owner_review match.
 * Ο client ΔΕΝ βλέπει ακόμα confirmed match.
 */
exports.findMatchingProperties = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password").lean();

    if (!user || user.role !== "client") {
      return res.status(404).json({ message: "Client not found" });
    }

    const preferences = user.preferences || {};

    const dbMatch = { status: "available" };

    if (preferences.dealType) {
      dbMatch.type = preferences.dealType;
    }

    if (preferences.location) {
      dbMatch.location = { $regex: preferences.location, $options: "i" };
    }

    const maxBudget =
      preferences.dealType === "rent"
        ? preferences.rentMax
        : preferences.priceMax ?? preferences.saleMax;

    if (maxBudget !== undefined) {
      dbMatch.price = { $lte: Number(maxBudget) };
    }

    const allProperties = await Property.find(dbMatch)
      .populate("ownerId")
      .lean({ virtuals: true });

    const results = [];

    for (const prop of allProperties) {
      const ownerId = prop.ownerId?._id || prop.ownerId;

      if (!ownerId) continue;

      const propertyData = {
        _id: prop._id,
        type: prop.type,
        location: prop.location,
        price: prop.price ?? prop.rent,
        squareMeters: prop.squareMeters ?? prop.sqm,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        floor: prop.floor,
        yearBuilt: prop.yearBuilt,
        furnished: prop.furnished,
        hasElevator: prop.hasElevator ?? prop.elevator,
        parkingSpaces: prop.parkingSpaces ?? (prop.parking ? 1 : 0),
        petsAllowed: prop.petsAllowed,
        smokingAllowed: prop.smokingAllowed,
        heating: prop.heating ?? prop.heatingType,
      };

      const prefScore = scorePrefsVsProperty(preferences, propertyData);
      const tenantReqs = prop.tenantRequirements || {};
      const tenantScore = scoreRequirementsVsTenant(tenantReqs, user);

      if (
        prefScore.score >= MIN_MATCH_COUNT &&
        tenantScore.score >= MIN_MATCH_COUNT
      ) {
        const combined = prefScore.score + tenantScore.score;

        const existingMatch = await Match.findOne({
          clientId: user._id,
          propertyId: prop._id,
        });

        let match;

        if (existingMatch) {
          match = existingMatch;
        } else {
          match = await Match.create({
            clientId: user._id,
            propertyId: prop._id,
            ownerId,
            status: "pending_owner_review",
            propertyMatchScore: prefScore.score,
            tenantMatchScore: tenantScore.score,
            combinedScore: combined,
          });

          const notification = await Notification.create({
            userId: ownerId,
            type: "match_pending",
            referenceId: match._id,
            senderId: user._id,
            message: `You have a potential match for "${prop.title}".`,
          });

          const io = req.app.get("io");
          if (io) {
            io.to(ownerId.toString()).emit("notification", notification);
          }
        }

        results.push({
          matchId: match._id,
          status: match.status,
          property: prop,
          propertyMatchScore: prefScore.score,
          tenantMatchScore: tenantScore.score,
          combinedScore: combined,
        });
      }
    }

    results.sort((a, b) => b.combinedScore - a.combinedScore);

    res.json(results);
  } catch (error) {
    console.error("Error finding matching properties:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * OWNER:
 * Βλέπει μόνο pending matches για τα δικά του properties.
 */
exports.getOwnerPendingMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      ownerId: req.user.userId,
      status: "pending_owner_review",
    })
      .populate(
        "clientId",
        "name email phone age occupation salary householdSize hasPets smoker profilePicture"
      )
      .populate("propertyId", "title location price images type");

    res.json(matches);
  } catch (err) {
    console.error("Error fetching owner pending matches:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * OWNER:
 * Accept / Reject match.
 */
exports.updateMatchStatus = async (req, res) => {
  try {
    const { matchId } = req.params;
    const { status } = req.body;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    if (String(match.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({
        message: "Only the property owner can update this match",
      });
    }

    match.status = status;
    await match.save();

    const notification = await Notification.create({
      userId: match.clientId,
      type: status === "accepted" ? "match_accepted" : "match_rejected",
      referenceId: match._id,
      senderId: req.user.userId,
      message:
        status === "accepted"
          ? "A property owner accepted your match."
          : "A property owner rejected your match.",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(match.clientId.toString()).emit("notification", notification);
    }

    res.json({
      message: `Match ${status}`,
      match,
    });
  } catch (err) {
    console.error("Error updating match status:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * CLIENT:
 * Βλέπει μόνο accepted matches.
 */
exports.getClientAcceptedMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      clientId: req.user.userId,
      status: "accepted",
    })
      .populate("propertyId")
      .populate(
        "ownerId",
        "name email phone profilePicture showPhoneToClients"
      );

    res.json(matches);
  } catch (err) {
    console.error("Error fetching client accepted matches:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Optional:
 * Owner βλέπει όλα τα matches του.
 */
exports.getOwnerAllMatches = async (req, res) => {
  try {
    const matches = await Match.find({
      ownerId: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .populate(
        "clientId",
        "name email phone age occupation salary householdSize hasPets smoker profilePicture"
      )
      .populate("propertyId", "title location price images type");

    res.json(matches);
  } catch (err) {
    console.error("Error fetching owner matches:", err);
    res.status(500).json({ message: "Server error" });
  }
};