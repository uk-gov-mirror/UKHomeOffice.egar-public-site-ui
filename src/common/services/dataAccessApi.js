const settings = require('../config');

const { API_BASE } = settings;
const { API_VERSION } = settings;
const BASE_URL = `${API_BASE}${API_VERSION}`;
const ApiClient = require('./httpClient');
const garApi = require('./garApi');

const httpClient = new ApiClient({ baseUrl: BASE_URL });

module.exports = {
  garApi: new garApi.GarApi(httpClient),
};
