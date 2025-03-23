const express = require('express');
const app = express();
const session = require('express-session');

const {
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI,
    AUTH_SERVER,
    PORT = 4000  // Default to 4000 if not set in environment
} = process.env;

app.use(express.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true
}));

// Serve static files
app.use(express.static('public'));

// Home page
app.get('/', (req, res) => {
    // Check if user is logged in
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.sendFile(__dirname + '/public/index.html');
    }
});

// Dashboard page (protected route)
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        res.redirect('/');
        return;
    }
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Callback route for after login
app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (code) {
        // Store the auth code in session
        req.session.user = { authenticated: true };
        res.redirect('/dashboard');
    } else {
        res.redirect('/');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`App2 running on http://localhost:${PORT}`);
    console.log(`Using auth server at ${AUTH_SERVER}`);
});