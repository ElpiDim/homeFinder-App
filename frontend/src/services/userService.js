import api from '../api';

const API_BASE = '/user';

export const getUserProfile = async()=>{
    const token = localStorage.getItem('token');
    const res = await api.get(`${API_BASE}/profile`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};

export const updateUserProfile = async(updatedData)=>{
    const token = localStorage.getItem('token');
    const res = await api.put(`${API_BASE}/profile`, updatedData,{
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};
