import api from '../api';

const API_URL = '/favorites';

export const getFavorites = async (token) => {
    const res = await api.get(`${API_URL}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};

export const addFavorite = async (propertyId, token) => {
    const res = await api.post(`${API_URL}`, { propertyId }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};

export const removeFavorite = async (propertyId, token) => {
    const res = await api.delete(`${API_URL}/${propertyId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}

