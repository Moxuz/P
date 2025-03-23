const AuthSDK = require('your-auth-sdk');

const auth = new AuthSDK({
    authServerUrl: 'http://auth-server:8000',
    clientId: 'client_id',
    clientSecret: 'client_secret',
    redirectUri: 'http://my-app.com/callback'
});

// Login route
app.get('/login', (req, res) => {
    res.redirect(auth.getLoginUrl());
});

// Callback route
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    const tokens = await auth.handleCallback(code);
    // Store tokens and redirect
});

// Protected route
app.get('/protected', async (req, res) => {
    const data = await auth.fetchWithToken('http://api.example.com/data');
    res.json(data);
});