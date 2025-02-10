// app1/app.js

const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const querystring = require('querystring');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuration via environment variables
const CLIENT_ID = process.env.CLIENT_ID || 'client1';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'client1secret';
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/callback';
const AUTH_SERVER = process.env.AUTH_SERVER || 'http://localhost:5000';
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <h1>Client1 Application</h1>
    <p><a href="/login">Login with Auth IdP</a></p>
  `);
});

app.get('/login', (req, res) => {
  const authorizeUrl = `${AUTH_SERVER}/auth/authorize?` + querystring.stringify({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state: 'abc123'
  });
  res.redirect(authorizeUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.send('No authorization code received.');
  }

  try {
    const tokenResponse = await axios.post(`${AUTH_SERVER}/auth/token`, {
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const { access_token, id_token, token_type, expires_in } = tokenResponse.data;

    res.send(`
      <h1>Authentication Successful</h1>
      <p><strong>Access Token:</strong> ${access_token}</p>
      <p><strong>ID Token:</strong> ${id_token}</p>
      <p><strong>Token Type:</strong> ${token_type}</p>
      <p><strong>Expires In:</strong> ${expires_in} seconds</p>
    `);
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.send('Error exchanging authorization code for token.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Client1 app running on http://0.0.0.0:${PORT}`);
});