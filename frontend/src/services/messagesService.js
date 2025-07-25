import axios from 'axios';

const API_URL = 'http://localhost:5000/api/messages';

export const sendMessage = async (receiverId,content, token) => {
    const res = await axios.post(`${API_URL}`, { receiverId, content }, {
        headers: {
            Authorization: `Bearer ${token}`
        }
     });
    return res.data;
};
export const getMessages = async (token) => {
    const res = await axios.get(`${API_URL}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return res.data;
};  