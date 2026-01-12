import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Data API endpoints
export const dataAPI = {
  // Upload CSV file
  uploadCSV: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/data/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Process command (clean, remove duplicates, etc.)
  processCommand: async (dataId, command) => {
    const response = await api.post('/data/process', {
      dataId,
      command,
    });
    return response.data;
  },

  // Ask question about dataset
  askQuestion: async (dataId, question) => {
    const response = await api.post('/data/ask', {
      dataId,
      question,
    });
    return response.data;
  },

  // Generate chart
  generateChart: async (dataId, question) => {
    const response = await api.post('/data/chart', {
      dataId,
      question,
    });
    return response.data;
  },

  // Get insights
  getInsights: async (dataId) => {
    const response = await api.post('/data/insights', {
      dataId,
    });
    return response.data;
  },

  // Download cleaned data
  downloadData: async (dataId, fileName) => {
    const response = await api.get(`/data/download/${dataId}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'cleaned_data.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();

    return true;
  },
};

export default api;