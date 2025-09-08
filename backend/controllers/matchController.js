const User = require('../models/user');
const Property = require('../models/property');

const DEFAULT_MIN_MATCH_COUNT = 2; // Fallback minimum number of matching fields

// Helper function to calculate match score
const calculateMatchScore = (criteria, data) => {
  let score = 0;
  for (const key in criteria) {
    if (!Object.prototype.hasOwnProperty.call(criteria, key)) continue;
    if (!Object.prototype.hasOwnProperty.call(data, key)) continue;

    const cVal = criteria[key];
    const dVal = data[key];
    if (cVal === undefined || dVal === undefined) continue;

    if (typeof cVal === 'boolean') {
      if (cVal === dVal) score++;
    } else if (
      ['income', 'sqm', 'bedrooms', 'bathrooms', 'floor', 'yearBuilt'].includes(key)
    ) {
      // Numeric fields that represent minimum acceptable values
      if (Number(dVal) >= Number(cVal)) score++;
    } else if (['rent'].includes(key)) {
      // Numeric fields that represent maximum acceptable values
      if (Number(dVal) <= Number(cVal)) score++;
    } else if (String(cVal).toLowerCase() === String(dVal).toLowerCase()) {
      score++;
    }
  }
  return score;
};

exports.findMatchingProperties = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user || user.role !== 'client') {
      return res.status(404).json({ message: 'Client not found' });
    }

    const { clientProfile, propertyPreferences, matchThreshold } = user;
    const minMatch =
      parseInt(req.query.minMatch, 10) || matchThreshold || DEFAULT_MIN_MATCH_COUNT;

    const allProperties = await Property.find({ status: 'available' }).populate('ownerId');

    const matchedProperties = [];

    for (const property of allProperties) {
      // 1. Match property attributes with tenant's preferences
      const propertyData = {
        location: property.location,
        rent: property.price,
        sqm: property.sqm,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        floor: property.floor,
        yearBuilt: property.yearBuilt,
        furnished: property.furnished,
        parking: property.parking,
        elevator: property.elevator,
        heatingType: property.heatingType,
        petsAllowed: property.petsAllowed,
        smokingAllowed: property.smokingAllowed
      };

      const propertyMatchScore = calculateMatchScore(
        propertyPreferences || {},
        propertyData
      );

      // 2. Match tenant's profile with property's requirements
      const tenantMatchScore = calculateMatchScore(
        property.tenantRequirements || {},
        clientProfile || {}
      );

      if (propertyMatchScore >= minMatch && tenantMatchScore >= minMatch) {
        matchedProperties.push({
          property,
          propertyMatchScore,
          tenantMatchScore
        });
      }
    }

    // Sort by combined score
    matchedProperties.sort((a, b) => (b.propertyMatchScore + b.tenantMatchScore) - (a.propertyMatchScore + a.tenantMatchScore));

    res.json(matchedProperties);

  } catch (error) {
    console.error('Error finding matching properties:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
