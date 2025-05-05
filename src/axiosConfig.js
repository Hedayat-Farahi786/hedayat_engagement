// axiosConfig.js
import axios from 'axios';

const instance = axios.create({
  baseURL: 'https://panicky-earmuffs-tuna.cyclic.app/',
  timeout: 10000, // Adjust timeout as needed
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://navidbelly.vercel.app', // Set allowed origin here
  },
});

export default instance;
