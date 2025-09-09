const express = require('express');
const router = express.Router();
const axios = require('axios');
const https = require('https');

// Create axios instance that ignores SSL certificate errors
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  timeout: 5000
});

const SERVER_IP = '131.196.197.140';
const SERVER_PORT = '30120';
const BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}`;

// Proxy endpoint for server info
router.get('/info', async (req, res) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/info.json`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching server info:', error.message);
    res.status(500).json({ error: 'Failed to fetch server info' });
  }
});

// Proxy endpoint for players
router.get('/players', async (req, res) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/players.json`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching players:', error.message);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Proxy endpoint for dynamic info
router.get('/dynamic', async (req, res) => {
  try {
    const response = await axiosInstance.get(`${BASE_URL}/dynamic.json`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching dynamic info:', error.message);
    res.status(500).json({ error: 'Failed to fetch dynamic info' });
  }
});

module.exports = router;