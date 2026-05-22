import apiClient from '../api/axios';

const userService = {
    getAll: () => apiClient.get('/admin/manage-users'),
    create: (data) => apiClient.post('/admin/manage-users', data),
    update: (id, data) => apiClient.put(`/admin/manage-users/${id}`, data),
    delete: (id) => apiClient.delete(`/admin/manage-users/${id}`),
    resetPassword: (id) => apiClient.post(`/admin/manage-users/${id}/reset-password`)
};

export default userService;
