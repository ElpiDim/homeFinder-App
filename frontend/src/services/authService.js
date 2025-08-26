import http from '../api/http';


const API = '/auth';
export const loginUser  = async(credentials) => {
const res = await http.post(`${API}/login`, credentials);
return res.data;
};

export const registerUser = async(userData) => {
    const res = await http.post(`${API}/register`, userData);
    return res.data;
};

export const logoutUser = () => {
    localStorage.removeItem('token');

};
