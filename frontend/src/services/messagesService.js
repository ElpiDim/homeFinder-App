import api from '../api';

const API_URL = '/messages';

export const sendMessage = async (receiverId, propertyId, content) => {
    const res = await api.post(API_URL, { receiverId, propertyId, content })
    return res.data;
};
export const getMessages = async () => {
    const res = await api.get(API_URL);
    return res.data;
};

export const getConversations = async () => {
    const res = await api.get(`${API_URL}/conversations`);
    return res.data;
};

export const markConversationRead = async (propertyId, otherUserId) => {
    const res = await api.patch(`${API_URL}/conversation/${propertyId}/${otherUserId}/read`);
    return res.data;
};