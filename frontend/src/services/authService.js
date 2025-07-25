import axios from 'axios';

const API = 'http://localhost:5000/api/auth';
export const loginUser  = async(credentials) => {
const res = await axios.post(`${API}/login`, credentials);

return res.data;
};

export const registerUser = async(userData) => {
    const res = await axios.post(`${API}/register`, userData);
    return res.data;
};

export const logoutUser = () => {
    localStorage.removeItem('token');

};
