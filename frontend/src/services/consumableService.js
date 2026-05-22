import apiClient from '../api/axios';

const consumableService = {
    getAll(params) {
        return apiClient.get('/consumables', { params });
    },

    getOne(id) {
        return apiClient.get(`/consumables/${id}`);
    },

    create(data) {
        return apiClient.post('/consumables', data);
    },

    update(id, data) {
        return apiClient.put(`/consumables/${id}`, data);
    },

    delete(id) {
        return apiClient.delete(`/consumables/${id}`);
    }
};

export default consumableService;
