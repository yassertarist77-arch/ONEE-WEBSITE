import apiClient from '../api/axios';

const exportService = {
    downloadDatabase() {
        return apiClient.get('/export/database', {
            responseType: 'blob'
        });
    },

    exportCSV() {
        return apiClient.get('/export/csv', {
            responseType: 'blob'
        });
    }
};

export default exportService;
