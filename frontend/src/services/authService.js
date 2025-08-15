import api from '../api';

const API = '/auth';
export const loginUser  = async(credentials) => {
const res = await api.post(`${API}/login`, credentials);

return res.data;
};

export const registerUser = async(userData) => {
    const res = await api.post(`${API}/register`, userData);
    return res.data;
};

export const logoutUser = () => {
    localStorage.removeItem('token');

};
