export const CONFIG = {
    API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    CLIENT_ID: process.env.REACT_APP_CLIENT_ID || 'ca2f95542d8ef92eebd99e643498ffa1',
    CLIENT_SECRET: process.env.REACT_APP_CLIENT_SECRET || 'e944dc74c0e72b3f00d0e7af5d1be72a53b16ebff2c5bd5a176cd3ed6f849ba1',
    REDIRECT_URI: process.env.REACT_APP_REDIRECT_URI || 'http://localhost:3000/callback'
};