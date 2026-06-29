const settings = require('../config');

const { API_BASE } = settings;
const { API_VERSION } = settings;
const BASE_URL = `${API_BASE}${API_VERSION}`;
const { HttpClient } = require('./httpClient');
const garApi = require('./garApi');

const client = new HttpClient({ baseUrl: BASE_URL });

module.exports = {
  garApi: new garApi.GarApi(client),
};
