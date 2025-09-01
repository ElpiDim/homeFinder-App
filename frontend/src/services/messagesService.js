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