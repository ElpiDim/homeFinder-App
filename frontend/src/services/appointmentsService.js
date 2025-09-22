import api from '../api';

export const proposeAppointment = async ({ propertyId, tenantId, availableSlots }) => {
  const response = await api.post('/appointments/propose', {
    propertyId,
    tenantId,
    availableSlots,
  });
  return response.data;
};