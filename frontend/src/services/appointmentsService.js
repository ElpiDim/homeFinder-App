import api from '../api';

export const proposeAppointment = async ({ propertyId, tenantId, availableSlots }) => {
  const response = await api.post('/appointments/propose', {
    propertyId,
    tenantId,
    availableSlots,
  });
  return response.data;
};

export const rescheduleAppointment = async (appointmentId, selectedSlot) => {
  const response = await api.patch(`/appointments/${appointmentId}/reschedule`, {
    selectedSlot,
  });
  return response.data;
};

export const deleteAppointment = async (appointmentId) => {
  const response = await api.delete(`/appointments/${appointmentId}`);
  return response.data;
};
