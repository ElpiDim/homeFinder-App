const User = require('../models/user');
const Property = require('../models/property');

const MIN_MATCH_COUNT = 2; // Configurable minimum number of matching fields

// Helper function to calculate match score
const calculateMatchScore = (criteria, data) => {
  let score = 0;
  for (const key in criteria) {
    if (criteria.hasOwnProperty(key) && data.hasOwnProperty(key)) {
      if (criteria[key] !== undefined && data[key] !== undefined) {
        // Simple equality check for now. Can be extended for ranges, etc.
        if (typeof criteria[key] === 'boolean') {
          if (criteria[key] === data[key]) {
            score++;
          }
        } else if (key === 'rent' || key === 'income' || key === 'sqm') {
          // For numeric range fields, check if data is within criteria range
          // Assuming criteria stores max values and data stores actual values
          if (data[key] <= criteria[key]) {
            score++;
          }
        }
        else if (String(criteria[key]).toLowerCase() === String(data[key]).toLowerCase()) {
          score++;
        }
      }
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

    const { clientProfile, propertyPreferences } = user;
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

      const propertyMatchScore = calculateMatchScore(propertyPreferences, propertyData);

      // 2. Match tenant's profile with property's requirements
      const tenantMatchScore = calculateMatchScore(property.tenantRequirements, clientProfile);

      if (propertyMatchScore >= MIN_MATCH_COUNT && tenantMatchScore >= MIN_MATCH_COUNT) {
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
