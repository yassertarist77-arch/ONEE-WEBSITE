import apiClient from '../api/axios';

const dischargeService = {
    getAll(params) {
        return apiClient.get('/discharges', { params });
    },

    getOne(id) {
        return apiClient.get(`/discharges/${id}`);
    },

    downloadPDF(id) {
        return apiClient.get(`/discharges/${id}/download`, {
            responseType: 'blob'
        });
    },

    cancel(id) {
        return apiClient.post(`/discharges/${id}/cancel`);
    }
};

export default dischargeService;
