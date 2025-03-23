# Auth SDK

Simple authentication SDK for integrating with your auth server.

## Installation

```bash
npm install @your-username/auth-sdk
```

## Usage

```javascript
const AuthSDK = require('@your-username/auth-sdk');

const auth = new AuthSDK({
    authServerUrl: 'http://your-auth-server.com',
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    redirectUri: 'http://your-app.com/callback'
});

// Generate login URL
const loginUrl = auth.getLoginUrl();

// Handle callback
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    const tokens = await auth.handleCallback(code);
});

// Make authenticated requests
const data = await auth.fetchWithToken('http://api.example.com/data');
```
```

