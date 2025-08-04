const mockSave = jest.fn().mockResolvedValue();

jest.mock('../models/favorites', () => {
  return class Favorites {
    constructor(data) {
      Object.assign(this, data);
      this.save = mockSave;
    }
    static findOne = jest.fn();
  };
});

jest.mock('../models/property', () => ({
  findById: jest.fn(),
}));

jest.mock('../models/notification', () => ({
  create: jest.fn(),
}));

const Favorites = require('../models/favorites');
const Property = require('../models/property');
const Notification = require('../models/notification');
const { addFavorite } = require('../controllers/favoritesController');

describe('addFavorite', () => {
  it('notifies the owner with a message when property is favorited', async () => {
    Favorites.findOne.mockResolvedValue(null);
    const property = { _id: 'prop1', ownerId: 'owner1', title: 'Cozy Cottage' };
    Property.findById.mockResolvedValue(property);
    const req = { user: { userId: 'tenant1' }, body: { propertyId: 'prop1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await addFavorite(req, res);

    expect(Notification.create).toHaveBeenCalledWith({
      userId: 'owner1',
      type: 'interest',
      referenceId: 'prop1',
      message: 'Your property "Cozy Cottage" was added to favorites.',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Added to favorites' });
  });
});
