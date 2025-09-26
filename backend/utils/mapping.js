// utils/mapping.js

// --------- INPUT (FE -> DB) ---------

// Χαρτογραφεί payload από FE σε πεδία του Property model (ΧΩΡΙΣ virtuals)
function mapIncomingPropertyPayload(src = {}) {
  const out = {};

  // βασικά/τυπικά πεδία
  if (src.title != null) out.title = String(src.title).trim();
  if (src.description != null) out.description = String(src.description);
  if (src.location != null) out.location = String(src.location).trim();
  if (src.address != null) out.address = String(src.address).trim();

  // FE μπορεί να στείλει rent ή price → τα κάνουμε price
  const price = (src.price != null) ? Number(src.price)
              : (src.rent != null) ? Number(src.rent)
              : undefined;
  if (Number.isFinite(price)) out.price = price;

  // type/status
  if (src.type === 'rent' || src.type === 'sale') out.type = src.type;
  if (['available','rented','sold'].includes(src.status)) out.status = src.status;

  // διαστάσεις
  const sqm = (src.squareMeters != null) ? Number(src.squareMeters)
           : (src.sqm != null) ? Number(src.sqm)
           : undefined;
  if (Number.isFinite(sqm)) out.squareMeters = sqm;

  ['floor','levels','bedrooms','bathrooms','wc','kitchens','livingRooms','plotSize','surface']
    .forEach(k => { if (src[k] != null && !Number.isNaN(Number(src[k]))) out[k] = Number(src[k]); });

  if (src.onTopFloor != null) out.onTopFloor = !!src.onTopFloor;

  // χαρακτηριστικά
  if (src.yearBuilt != null && !Number.isNaN(Number(src.yearBuilt))) out.yearBuilt = Number(src.yearBuilt);
  if (typeof src.furnished === 'boolean') out.furnished = src.furnished;
  if (typeof src.petsAllowed === 'boolean') out.petsAllowed = src.petsAllowed;
  if (typeof src.smokingAllowed === 'boolean') out.smokingAllowed = src.smokingAllowed;

  // FE -> DB mapping χωρίς virtuals:
  // elevator -> hasElevator
  if (typeof src.elevator === 'boolean') out.hasElevator = src.elevator;

  // parking (boolean) -> parkingSpaces (0/1 τουλάχιστον)
  if (typeof src.parking === 'boolean') out.parkingSpaces = src.parking ? (src.parkingSpaces || 1) : 0;
  // Αν το FE στείλει parkingSpaces αριθμό, τον προτιμάμε
  if (src.parkingSpaces != null && !Number.isNaN(Number(src.parkingSpaces))) out.parkingSpaces = Number(src.parkingSpaces);

  // heatingType (FE) -> heating (DB)
  if (src.heatingType != null) out.heating = String(src.heatingType);

  // λοιπά enums/strings
  ['condition','energyClass','orientation','view'].forEach(k => {
    if (src[k] != null) out[k] = String(src[k]);
  });
  if (typeof src.insulation === 'boolean') out.insulation = src.insulation;

  // γεωγραφικά
  if (src.latitude != null && !Number.isNaN(Number(src.latitude))) out.latitude = Number(src.latitude);
  if (src.longitude != null && !Number.isNaN(Number(src.longitude))) out.longitude = Number(src.longitude);

  // tenantRequirements (αν τα στέλνεις ως flat ή αντικείμενο)
  if (src.tenantRequirements && typeof src.tenantRequirements === 'object') {
    out.tenantRequirements = {};
    const tr = src.tenantRequirements;
    if (tr.minTenantSalary != null) out.tenantRequirements.minTenantSalary = Number(tr.minTenantSalary);
    if (Array.isArray(tr.allowedOccupations)) out.tenantRequirements.allowedOccupations = tr.allowedOccupations.map(String);
    if (typeof tr.furnished === 'boolean') out.tenantRequirements.furnished = tr.furnished;
    if (typeof tr.parking === 'boolean') out.tenantRequirements.parking = tr.parking;
    if (typeof tr.hasElevator === 'boolean') out.tenantRequirements.hasElevator = tr.hasElevator;
    if (typeof tr.pets === 'boolean') out.tenantRequirements.pets = tr.pets;
    if (typeof tr.smoker === 'boolean') out.tenantRequirements.smoker = tr.smoker;
    if (tr.familyStatus != null) out.tenantRequirements.familyStatus = String(tr.familyStatus);
  }

  return out;
}

// --------- OUTPUT (DB -> FE) ---------

// Μετατρέπει Property doc -> “FE-friendly” αντικείμενο (ό,τι περιμένει το UI)
function mapPropertyToDTO(doc) {
  if (!doc) return null;
  const p = (doc.toObject ? doc.toObject({ virtuals: false }) : doc);

  return {
    // βασικά
    _id: String(p._id),
    ownerId: p.ownerId,
    title: p.title,
    description: p.description,
    location: p.location,
    address: p.address,

    // τιμή και τύπος
    price: p.price,
    rent: p.price,                  // για legacy FE που κοιτάει rent
    type: p.type,
    status: p.status,

    // διαστάσεις
    squareMeters: p.squareMeters,
    sqm: p.squareMeters,            // FE alias
    floor: p.floor,
    levels: p.levels,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    wc: p.wc,
    kitchens: p.kitchens,
    livingRooms: p.livingRooms,
    onTopFloor: p.onTopFloor,

    // χαρακτηριστικά
    yearBuilt: p.yearBuilt,
    condition: p.condition,
    heating: p.heating,
    heatingType: p.heating,         // FE alias
    energyClass: p.energyClass,
    orientation: p.orientation,
    furnished: p.furnished,
    petsAllowed: p.petsAllowed,
    smokingAllowed: p.smokingAllowed,
    hasElevator: p.hasElevator,
    elevator: p.hasElevator,        // FE alias
    hasStorage: p.hasStorage,
    parkingSpaces: p.parkingSpaces,
    parking: (p.parkingSpaces || 0) > 0, // FE alias (boolean)
    monthlyMaintenanceFee: p.monthlyMaintenanceFee,
    view: p.view,
    insulation: p.insulation,
    plotSize: p.plotSize,

    ownerNotes: p.ownerNotes, // αν δεν θες να φαίνεται στο FE, απλά μην το βάζεις

    // media
    images: p.images || [],
    floorPlanImage: p.floorPlanImage,

    // tags
    features: p.features || [],

    // γεωγραφικά
    latitude: p.latitude,
    longitude: p.longitude,

    // req
    tenantRequirements: p.tenantRequirements || {},

    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// --------- MATCH QUERY (FE -> Mongo filter) ---------

// Χτίζει φίλτρο Property από tenant preferences ΧΩΡΙΣ virtuals
function buildPropertyQueryFromPrefs(prefs = {}) {
  const p = prefs || {};
  const f = { status: 'available' };

  // τύπος από dealType
  f.type = (p.dealType === 'sale') ? 'sale' : 'rent';

  // budget
  if (f.type === 'rent') {
    if (p.rentMin != null || p.rentMax != null) {
      f.price = {};
      if (p.rentMin != null) f.price.$gte = p.rentMin;
      if (p.rentMax != null) f.price.$lte = p.rentMax;
    }
  } else {
    // αγορά: χρησιμοποιούμε saleMin/saleMax (όχι priceMin/Max)
    const min = p.saleMin;
    const max = p.saleMax;
    if (min != null || max != null) {
      f.price = {};
      if (min != null) f.price.$gte = min;
      if (max != null) f.price.$lte = max;
    }
  }

  // μέγεθος
  if (p.sqmMin != null || p.sqmMax != null) {
    f.squareMeters = {};
    if (p.sqmMin != null) f.squareMeters.$gte = p.sqmMin;
    if (p.sqmMax != null) f.squareMeters.$lte = p.sqmMax;
  }

  // δωμάτια (ελάχιστα)
  if (p.bedrooms != null) f.bedrooms = { $gte: p.bedrooms };
  if (p.bathrooms != null) f.bathrooms = { $gte: p.bathrooms };

  // tri-state μόνο όταν είναι boolean
  if (typeof p.furnished === 'boolean') f.furnished = p.furnished;
  if (typeof p.petsAllowed === 'boolean') f.petsAllowed = p.petsAllowed;
  if (typeof p.smokingAllowed === 'boolean') f.smokingAllowed = p.smokingAllowed;

  // aliases χωρίς virtuals:
  if (typeof p.elevator === 'boolean') f.hasElevator = p.elevator;
  if (typeof p.parking === 'boolean') {
    // boolean parking -> parkingSpaces >= 1
    f.$expr = { $gte: [ { $ifNull: ["$parkingSpaces", 0] }, p.parking ? 1 : 0 ] };
  }
  if (p.heatingType) f.heating = p.heatingType;
  if (p.yearBuiltMin != null) f.yearBuilt = { $gte: p.yearBuiltMin };

  // location: απλό regex (ιδανικά στο μέλλον κάνε normalisation/geo)
  if (p.location) f.location = new RegExp(p.location.trim(), 'i');

  return f;
}

module.exports = {
  mapIncomingPropertyPayload,
  mapPropertyToDTO,
  buildPropertyQueryFromPrefs,
};
