import axios from 'axios';

const API_URL = 'http://localhost:5000/api/favorites';

export const getFavorites = async (token) => {
    const res = await axios.get(`${API_URL}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};

export const addFavorite = async (propertyId, token) => {
    const res = await axios.post(`${API_URL}`, { propertyId }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};

export const removeFavorite = async (propertyId, token) => {
    const res = await axios.delete(`${API_URL}/${propertyId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
}

