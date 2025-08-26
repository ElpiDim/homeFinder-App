import http from '../api/http';

const API_BASE = '/users';

export const getCurrentUser = async () => {
    const res = await http.get(`api/users/me`);
    return res.data;
};

export const updateCurrentUser = async (updatedData) => {
    const res = await http.put(`api/users/me`, updatedData);
    return res.data;
};

export const updatePreferences = (payload) =>
    http.put('/users/me/preferences', payload).then(r => r.data);