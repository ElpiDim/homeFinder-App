import http from '../api/http';

const API_BASE = '/users';

export const getCurrentUser = async () => {
    const res = await http.get(`${API_BASE}/me`);
    return res.data;
};

export const updateCurrentUser = async (updatedData) => {
    const res = await http.put(`${API_BASE}/me`, updatedData);
    return res.data;
};

export const updatePreferences = async (payload) => {
    const res = await http.put(`${API_BASE}/me/preferences`, payload);
    return res.data;
};