import api from '../api';

const API_URL = '/messages';

export const getMessages = async () => {
    const res = await api.get(API_URL);
    return res.data;
};  