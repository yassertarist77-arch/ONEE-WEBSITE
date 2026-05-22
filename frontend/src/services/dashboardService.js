import apiClient from '../api/axios';

const dashboardService = {
    getStats() {
        return apiClient.get('/dashboard');
    }
};

export default dashboardService;
