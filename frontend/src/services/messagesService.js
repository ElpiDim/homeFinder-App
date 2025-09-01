import api from '../api';

const API_URL = '/messages';

export const sendMessage = async (receiverId, propertyId, content, token) => {
    const res = await api.post(`${API_URL}`, { receiverId, propertyId, content }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};
export const getMessages = async (token) => {
    const res = await api.get(`${API_URL}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};  