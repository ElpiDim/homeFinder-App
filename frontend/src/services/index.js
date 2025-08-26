
import api from '../api';

export const getCurrentUser = async () => {
  const res = await api.get('/users/me');
  return res.data;
};

export const updateCurrentUser = async (data) => {
  const res = await api.put('/users/me', data);
  return res.data;
};

export const updatePreferences = async (data) => {
  const res = await api.put('/users/me/preferences', data);
  return res.data.user || res.data;
};
