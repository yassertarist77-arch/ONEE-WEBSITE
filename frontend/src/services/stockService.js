import apiClient from '../api/axios';

const stockService = {
    addStock(data) {
        return apiClient.post('/stock/add', data);
    },
    removeStock(data) {
        return apiClient.post('/stock/remove', data);
    },
    getHistory(params) {
        return apiClient.get('/stock/history', { params });
    },
    getOptions() {
        return apiClient.get('/stock/options');
    }
};

export default stockService;
