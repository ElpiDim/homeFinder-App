export const tenantFields = [
  { key: 'occupation', label: 'Occupation', type: 'text' },
  { key: 'income', label: 'Income (€/month)', type: 'number' },
  { key: 'familyStatus', label: 'Family Status', type: 'select', options: ['', 'Single', 'Couple', 'Family'] },
  { key: 'pets', label: 'Pets', type: 'checkbox' },
  { key: 'smoker', label: 'Smoker', type: 'checkbox' },
];

export const propertyFields = [
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'rent', label: 'Max Rent (€/month)', type: 'number' },
  { key: 'sqm', label: 'Min Square Meters', type: 'number' },
  { key: 'bedrooms', label: 'Min Bedrooms', type: 'number' },
  { key: 'bathrooms', label: 'Min Bathrooms', type: 'number' },
  { key: 'furnished', label: 'Furnished', type: 'checkbox' },
  { key: 'parking', label: 'Parking', type: 'checkbox' },
  { key: 'elevator', label: 'Elevator', type: 'checkbox' },
  { key: 'heatingType', label: 'Heating Type', type: 'select', options: ['', 'autonomous', 'central', 'ac', 'gas', 'none', 'other'] },
  { key: 'petsAllowed', label: 'Pets Allowed', type: 'checkbox' },
  { key: 'smokingAllowed', label: 'Smoking Allowed', type: 'checkbox' },
];
