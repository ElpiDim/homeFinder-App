// controllers/matchController.js
const User = require("../models/user");
const Property = require("../models/property");

const MIN_MATCH_COUNT = 2; // πόσα κριτήρια πρέπει να "πετύχουν" τουλάχιστον ανά πλευρά

/* --------------------------- helpers --------------------------- */
const ciEq = (a, b) =>
  String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

const ciIncludes = (hay, needle) =>
  String(hay || "").toLowerCase().includes(String(needle || "").toLowerCase());

const triVal = (v) => (v === true ? true : v === false ? false : null);

/**
 * Υπολογίζει score προτιμήσεων ενοικιαστή απέναντι σε χαρακτηριστικά αγγελίας.
 * Κάθε (ενεργό) κριτήριο μετράει 1 "check". Αν ταιριάζει → +1 στο score.
 * Επιστρέφει {score, checks, fails[]} για διαγνωστικά.
 */
const scorePrefsVsProperty = (prefs = {}, p = {}) => {
  let score = 0;
  let checks = 0;
  const fails = [];

  // dealType
  if (prefs.dealType) {
    checks++;
    if (p.type === prefs.dealType) score++;
    else fails.push("dealType");
  }

  // location contains
  if (prefs.location) {
    checks++;
    if (ciIncludes(p.location, prefs.location)) score++;
    else fails.push("location");
  }

  // price: rent vs sale
  if (prefs.dealType === "rent") {
    const min = prefs.rentMin ?? undefined;
    const max = prefs.rentMax ?? undefined;
    if (min !== undefined) {
      checks++;
      if (p.price >= Number(min)) score++; else fails.push("rentMin");
    }
    if (max !== undefined) {
      checks++;
      if (p.price <= Number(max)) score++; else fails.push("rentMax");
    }
  } else if (prefs.dealType === "sale") {
    const min = prefs.priceMin ?? prefs.saleMin ?? undefined;
    const max = prefs.priceMax ?? prefs.saleMax ?? undefined;
    if (min !== undefined) {
      checks++;
      if (p.price >= Number(min)) score++; else fails.push("priceMin");
    }
    if (max !== undefined) {
      checks++;
      if (p.price <= Number(max)) score++; else fails.push("priceMax");
    }
  }

  // surface
  if (prefs.sqmMin !== undefined) {
    checks++;
    if ((p.squareMeters ?? 0) >= Number(prefs.sqmMin)) score++; else fails.push("sqmMin");
  }
  if (prefs.sqmMax !== undefined) {
    checks++;
    if ((p.squareMeters ?? 0) <= Number(prefs.sqmMax)) score++; else fails.push("sqmMax");
  }

  // rooms
  if (prefs.bedrooms !== undefined) {
    checks++;
    if ((p.bedrooms ?? 0) >= Number(prefs.bedrooms)) score++; else fails.push("bedrooms");
  }
  if (prefs.bathrooms !== undefined) {
    checks++;
    if ((p.bathrooms ?? 0) >= Number(prefs.bathrooms)) score++; else fails.push("bathrooms");
  }

  // floor range
  if (prefs.floorMin !== undefined) {
    checks++;
    if ((p.floor ?? 0) >= Number(prefs.floorMin)) score++; else fails.push("floorMin");
  }
  if (prefs.floorMax !== undefined) {
    checks++;
    if ((p.floor ?? 0) <= Number(prefs.floorMax)) score++; else fails.push("floorMax");
  }

  // year built
  if (prefs.yearBuiltMin !== undefined) {
    checks++;
    if ((p.yearBuilt ?? 0) >= Number(prefs.yearBuiltMin)) score++; else fails.push("yearBuiltMin");
  }

  // tri-state booleans (only constrain if user set a preference)
  const furnished = triVal(prefs.furnished);
  if (furnished !== null) {
    checks++;
    if (Boolean(p.furnished) === furnished) score++; else fails.push("furnished");
  }
  const elevator = triVal(prefs.elevator ?? prefs.hasElevator);
  if (elevator !== null) {
    checks++;
    if (Boolean(p.hasElevator) === elevator) score++; else fails.push("elevator");
  }
  const parking = triVal(prefs.parking);
  if (parking !== null) {
    // θεωρούμε parking = parkingSpaces > 0
    const hasParking = (p.parkingSpaces ?? 0) > 0;
    checks++;
    if (hasParking === parking) score++; else fails.push("parking");
  }
  const pets = triVal(prefs.petsAllowed);
  if (pets !== null) {
    checks++;
    if (Boolean(p.petsAllowed) === pets) score++; else fails.push("petsAllowed");
  }
  const smoking = triVal(prefs.smokingAllowed);
  if (smoking !== null) {
    checks++;
    if (Boolean(p.smokingAllowed) === smoking) score++; else fails.push("smokingAllowed");
  }

  // heating
  if (prefs.heatingType) {
    checks++;
    if (ciEq(p.heating, prefs.heatingType)) score++; else fails.push("heatingType");
  }

  return { score, checks, fails };
};

/**
 * Απαιτήσεις ιδιοκτήτη (property.tenantRequirements) vs προφίλ ενοικιαστή (user).
 * Ελέγχει salary, occupations, pets/smoker, family.
 */
const scoreRequirementsVsTenant = (tenantReq = {}, user = {}) => {
  let score = 0;
  let checks = 0;
  const fails = [];

  // salary
  if (tenantReq.minTenantSalary !== undefined) {
    checks++;
    if ((user.salary ?? 0) >= Number(tenantReq.minTenantSalary)) score++;
    else fails.push("minTenantSalary");
  }

  // allowed occupations
  if (Array.isArray(tenantReq.allowedOccupations) && tenantReq.allowedOccupations.length) {
    checks++;
    const occList = tenantReq.allowedOccupations.map((s) => String(s).toLowerCase());
    const ok = user.occupation ? occList.includes(String(user.occupation).toLowerCase()) : false;
    if (ok) score++; else fails.push("allowedOccupations");
  }

  // pets allowed? if false and user hasPets true → fail (and count as check)
  if (tenantReq.pets !== undefined) {
    checks++;
    const allowed = Boolean(tenantReq.pets);
    if (allowed || !user.hasPets) score++; else fails.push("pets");
  }

  // smoker allowed?
  if (tenantReq.smoker !== undefined) {
    checks++;
    const allowed = Boolean(tenantReq.smoker);
    if (allowed || !user.smoker) score++; else fails.push("smoker");
  }

  // familyStatus: single|couple|family|any (simple heuristics με householdSize/hasFamily)
  if (tenantReq.familyStatus && tenantReq.familyStatus !== "any") {
    checks++;
    const size = user.householdSize ?? (user.hasFamily ? 3 : 1);
    const status =
      size <= 1 ? "single" : size === 2 ? "couple" : "family";
    if (tenantReq.familyStatus === status) score++;
    else fails.push("familyStatus");
  }

  return { score, checks, fails };
};

/* ------------------------ controller ------------------------- */
exports.findMatchingProperties = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password").lean();
    if (!user || user.role !== "client") {
      return res.status(404).json({ message: "Client not found" });
    }

    // read preferences with virtuals already materialized by model (if using .lean(), virtuals are not added by default)
    // we rely on canonical keys we saved (rentMin/Max, priceMin/Max, etc.)
    const preferences = user.preferences || {};

    // βασικό προ-φιλτράρισμα από DB όπου γίνεται
    const dbMatch = { status: "available" };
    if (preferences.dealType) dbMatch.type = preferences.dealType;

    // αν έχουμε ανώτατο budget, μπορούμε να κόψουμε χοντρικά:
    const maxBudget =
      preferences.dealType === "rent"
        ? preferences.rentMax
        : (preferences.priceMax ?? preferences.saleMax);
    if (maxBudget !== undefined) {
      dbMatch.price = { $lte: Number(maxBudget) };
    }

    const allProperties = await Property.find(dbMatch).populate("ownerId").lean({ virtuals: true });

    const results = [];

    for (const prop of allProperties) {
      // canonical/aliases projection
      const propertyData = {
        _id: prop._id,
        type: prop.type,                         // rent | sale
        location: prop.location,
        price: prop.price ?? prop.rent,          // canonical
        squareMeters: prop.squareMeters ?? prop.sqm,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        floor: prop.floor,
        yearBuilt: prop.yearBuilt,
        furnished: prop.furnished,
        // aliases
        hasElevator: prop.hasElevator ?? prop.elevator,
        parkingSpaces: prop.parkingSpaces ?? (prop.parking ? 1 : 0),
        petsAllowed: prop.petsAllowed,
        smokingAllowed: prop.smokingAllowed,
        heating: prop.heating ?? prop.heatingType,
      };

      // 1) tenant prefs vs property attrs
      const prefScore = scorePrefsVsProperty(preferences, propertyData);

      // 2) property owner requirements vs tenant profile
      const tenantReqs = prop.tenantRequirements || {};
      const tenantScore = scoreRequirementsVsTenant(tenantReqs, user);

      // thresholds
      if (prefScore.score >= MIN_MATCH_COUNT && tenantScore.score >= MIN_MATCH_COUNT) {
        const combined = prefScore.score + tenantScore.score;
        results.push({
          property: prop,                      // already lean({virtuals:true})
          propertyMatchScore: prefScore.score,
          tenantMatchScore: tenantScore.score,
          combinedScore: combined,
        });
      }
    }

    // sort by total
    results.sort(
      (a, b) => b.combinedScore - a.combinedScore
    );

    res.json(results);
  } catch (error) {
    console.error("Error finding matching properties:", error);
    res.status(500).json({ message: "Server error" });
  }
};
