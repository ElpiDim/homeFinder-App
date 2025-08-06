import axios from 'axios';

const API_BASE  = 'http://localhost:5000/api/user';

export const getUserProfile = async()=>{
    const token = localStorage.getItem('token');
    const res = await axios.get(`${API_BASE}/profile`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};

export const updateUserProfile = async(updatedData)=>{
    const token = localStorage.getItem('token');
    const res = await axios.put(`${API_BASE}/profile`, updatedData, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};
