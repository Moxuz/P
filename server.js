const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const path = require('path');
const User = require('./models/User'); // ตรวจสอบ path ให้ถูกต้อง
const config = require('./config'); // ควรมีค่า JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
const { metrics, register } = require('./config/metrics');
const logger = require('./config/logger');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const cors = require('cors');


//const kafka = require("kafka-node"); 
//const client = new kafka.KafkaClient({ kafkaHost: "localhost:9092" }); 


const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } = config; // โหลดค่าจาก config

const app = express();

// Configure CORS
const corsOptions = {
    origin: 'http://localhost:3000', // Allow your client app's origin
    methods: ['GET', 'POST', 'OPTIONS'], // Allowed methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(
  session({
    secret: 'your_session_secret', // ใช้ secret ที่ปลอดภัยจริงในการใช้งานจริง
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // เปลี่ยนเป็น true เมื่อใช้ HTTPS
      maxAge: 1000 * 60 * 60, // 1 ชั่วโมง
    },
  })
);

// Initialize Passport and configure session
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection setup
const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('MONGODB_URI is not defined');
  process.exit(1);
}

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
/*const mongoURI = 'mongodb://admin:adminpassword@mongo:27017/authdb?authSource=d'; // MongoDB container's name 'mongo'

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error: ' + err));*/

/*const uri = "mongodb+srv://zedyasuovolibear:zedyasuo8165@cluster0.lm3pm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
  mongoose.connect(uri)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err)); */

/* =======================
   ส่วนของ Local Register & Login
   ======================= */

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Register route (สำหรับ username/password)
app.post('/register', async (req, res) => {
  console.log('Request Body:', req.body);
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    console.error('Validation Error: Missing required fields');
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Sanitization (ถ้ามี middleware express-sanitizer ก็ใช้ได้)
    const sanitizedUsername = req.sanitize ? req.sanitize(username) : username.trim();
    const sanitizedEmail = req.sanitize ? req.sanitize(email) : email.trim();
    const sanitizedPassword = req.sanitize ? req.sanitize(password) : password;

    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      console.error('Registration Error: User already exists with email:', sanitizedEmail);
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({
      username: sanitizedUsername,
      email: sanitizedEmail,
      password: sanitizedPassword, // pre-save hook ของ schema จะทำการ hash password
    });

    await newUser.save();

    //logMessage({ level: 'info', message: 'User registered successfully', user: newUser });
    console.log('User registered successfully:', sanitizedUsername);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Error during user registration:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login route (สำหรับ username/password login)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt with email:', email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create session for the user
    req.session.user = {
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    console.log('Login successful');
    console.log('Generated Token:', token);

    // Redirect to dashboard with token
    res.redirect(`/dashboard?token=${token}`);
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Middleware ตรวจสอบ JWT
const authenticateJWT = (req, res, next) => {
  let token = req.headers['authorization'] || req.query.token;
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }
  if (token.startsWith('Bearer ')) {
    token = token.split(' ')[1];
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.user = decoded;
    next();
  });
};

// Dashboard route (protected)
app.get('/dashboard', authenticateJWT, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

/* =======================
   ส่วนของ OAuth Google Login
   ======================= */

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:5000/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails[0].value,
          });
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

app.get('/google-profile', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  const userProfile = {
    username: req.user.username,
    email: req.user.email,
    googleId: req.user.googleId,
  };
  res.json({
    message: 'Google Account Info',
    userProfile: userProfile,
  });
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
  // สร้าง JWT token หลังจาก Google OAuth
  const token = jwt.sign({ id: req.user._id, email: req.user.email, role: req.user.role }, JWT_SECRET, { expiresIn: '1h' });
  const redirectUri = req.query.redirectUri || 'http://localhost:5000/dashboard';
  const redirectUrl = `${redirectUri}?token=${token}`;
  res.redirect(redirectUrl);
});

/* =======================
   ส่วนของ Identity Provider (IdP) สำหรับ OAuth 2.0 / OIDC
   ======================= */

// Update the clients array to include both apps
const clients = [
  {
    client_id: 'ca2f95542d8ef92eebd99e643498ffa1',
    client_secret: 'e944dc74c0e72b3f00d0e7af5d1be72a53b16ebff2c5bd5a176cd3ed6f849ba1',
    redirect_uris: ['http://localhost:3000/callback']
  },
  {
    client_id: 'client2',
    client_secret: 'client2secret',
    redirect_uris: ['http://localhost:4000/callback']
  }
];

// กำหนดเวลาหมดอายุของ authorization code และ token
const AUTH_CODE_EXPIRY = '5m';  // authorization code หมดอายุใน 5 นาที
const TOKEN_EXPIRY = '1h';      // access token / id token หมดอายุใน 1 ชั่วโมง

// Function to generate Authorization Code (using JWT as container)
function generateAuthCode(payload) {
  console.log('Generating auth code with payload:', payload);
  const code = jwt.sign(payload, JWT_SECRET, { expiresIn: AUTH_CODE_EXPIRY });
  console.log('Generated auth code:', code);
  return code;
}

// ฟังก์ชันสร้าง Access Token / ID Token
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Authorization Endpoint (GET)
 * รับ query parameters:
 *  - client_id, redirect_uri, response_type, scope, state
 * แสดงหน้า login ให้ผู้ใช้เพื่ออนุมัติการเข้าถึง
 */
app.get('/auth/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;
  console.group('Authorization Endpoint');
  console.log('Query Parameters:', req.query);
  console.log('Headers:', req.headers);
  console.groupEnd();

  // Validate client
  const client = clients.find(c => 
    c.client_id === client_id && 
    c.redirect_uris.includes(redirect_uri)
  );

  if (!client) {
    return res.status(400).send("Invalid client or redirect URI");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background-color: #f0f2f5;
            }
            .login-form {
                background-color: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            input {
                display: block;
                margin: 10px 0;
                padding: 8px;
                width: 200px;
            }
            button {
                background-color: #1a73e8;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                width: 100%;
            }
        </style>
    </head>
    <body>
        <div class="login-form">
            <h2>Login to ${client_id}</h2>
            <form id="loginForm" method="POST" action="/auth/authorize">
                <input type="hidden" name="client_id" value="${client_id}">
                <input type="hidden" name="redirect_uri" value="${redirect_uri}">
                <input type="hidden" name="response_type" value="${response_type}">
                <input type="hidden" name="scope" value="${scope}">
                <input type="hidden" name="state" value="${state}">
                
                <input type="email" name="email" placeholder="Email" required>
                <input type="password" name="password" placeholder="Password" required>
                
                <button type="submit">Login</button>
            </form>
        </div>
    </body>
    </html>
  `);
});

/**
 * Authorization Endpoint (POST)
 * รับข้อมูลจาก form login และตรวจสอบข้อมูลผู้ใช้ (จากฐานข้อมูล User)
 * ถ้าผ่าน ให้สร้าง authorization code และ redirect กลับไปยัง redirect_uri พร้อมกับ code และ state
 */
app.post('/auth/authorize', async (req, res) => {
  const { 
    client_id, 
    redirect_uri, 
    response_type, 
    scope, 
    state, 
    email, 
    password 
  } = req.body;

  console.group('Authorization Request Logging');
  console.log('Request Body:', {
    client_id,
    redirect_uri,
    response_type,
    scope,
    state,
    email: email ? 'present' : 'missing'
  });
  console.log('Full Request Body:', req.body);
  console.log('Request Headers:', req.headers);
  console.groupEnd();

  // Verify client
  const client = clients.find(c => 
    c.client_id === client_id && 
    c.redirect_uris.includes(redirect_uri)
  );

  if (!client) {
    console.error('Invalid Client Configuration', {
      provided_client_id: client_id,
      provided_redirect_uri: redirect_uri,
      registered_clients: clients.map(c => ({ 
        id: c.client_id, 
        uris: c.redirect_uris 
      }))
    });
    return res.status(400).json({ 
      error: 'invalid_client', 
      error_description: 'Client authentication failed' 
    });
  }

  try {
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.warn('User not found', { email });
      return res.status(401).json({ 
        error: 'invalid_credentials', 
        error_description: 'User not found' 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('Invalid password', { email });
      return res.status(401).json({ 
        error: 'invalid_credentials', 
        error_description: 'Invalid password' 
      });
    }

    // Generate authorization code
    const authCode = generateAuthCode({
      user_id: user._id.toString(),
      client_id,
      scope: scope || 'openid profile email'
    });

    console.log('Generated Authorization Code:', {
      user_id: user._id.toString(),
      client_id,
      scope: scope || 'openid profile email'
    });

    // Construct redirect URL
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append("code", authCode);
    
    // Append state if present
    if (state) {
      redirectUrl.searchParams.append("state", state);
    }

    console.log('Redirecting to:', redirectUrl.toString());
    
    // Redirect to client with authorization code
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Authorization Endpoint Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'server_error', 
      error_description: 'An unexpected error occurred' 
    });
  }
});
/**
 * Token Endpoint
 * รับ POST request เพื่อแลกเปลี่ยน authorization code เป็น access token และ id token
 * ต้องรับข้อมูล: code, client_id, client_secret, redirect_uri, grant_type
 */




app.post('/auth/token', async (req, res) => {
  const { code, client_id, client_secret, redirect_uri, grant_type } = req.body;
  console.group('Token Endpoint');
  console.log('Request Body:', req.body);
  console.log('Headers:', req.headers);
  console.groupEnd();

  // Comprehensive Request Logging
  console.group('Token Exchange Request');
  console.log('Received Parameters:', {
    code: code ? 'present' : 'missing',
    client_id,
    redirect_uri,
    grant_type
  });
  console.log('Full Request Body:', req.body);
  console.log('Request Headers:', req.headers);

  // Validate Required Parameters
  const missingParams = [];
  if (!code) missingParams.push('code');
  if (!client_id) missingParams.push('client_id');
  if (!client_secret) missingParams.push('client_secret');
  if (!redirect_uri) missingParams.push('redirect_uri');

  if (missingParams.length > 0) {
    console.error('Missing required parameters:', missingParams);
    console.groupEnd();
    return res.status(400).json({
      error: 'invalid_request',
      error_description: `Missing required parameters: ${missingParams.join(', ')}`,
      missing_params: missingParams
    });
  }

  try {
    // Detailed Code Verification
    console.log('Attempting to verify authorization code');
    let decoded;
    try {
      decoded = jwt.verify(code, JWT_SECRET);
      console.log('Decoded Token Payload:', decoded);
    } catch (verifyError) {
      console.error('JWT Verification Error:', {
        name: verifyError.name,
        message: verifyError.message
      });

      // Detailed error handling for different JWT verification errors
      switch (verifyError.name) {
        case 'TokenExpiredError':
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code has expired'
          });
        case 'JsonWebTokenError':
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid authorization code'
          });
        default:
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code verification failed'
          });
      }
    }

    // Client Validation with Detailed Logging
    const client = clients.find(c =>
      c.client_id === client_id &&
      c.client_secret === client_secret &&
      c.redirect_uris.includes(redirect_uri)
    );

    if (!client) {
      console.error('Client Validation Failed', {
        provided_client_id: client_id,
        provided_redirect_uri: redirect_uri,
        registered_clients: clients.map(c => ({
          id: c.client_id,
          uris: c.redirect_uris
        }))
      });
      console.groupEnd();
      return res.status(400).json({
        error: 'invalid_client',
        error_description: 'Client authentication failed',
        details: {
          client_id,
          redirect_uri
        }
      });
    }

    // User Retrieval with Error Handling
    let user;
    try {
      user = await User.findById(decoded.user_id);
      
      if (!user) {
        console.error('User Not Found', {
          user_id: decoded.user_id
        });
        console.groupEnd();
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'User associated with the authorization code not found'
        });
      }
    } catch (userError) {
      console.error('User Lookup Error:', userError);
      console.groupEnd();
      return res.status(500).json({
        error: 'server_error',
        error_description: 'Error retrieving user information'
      });
    }

    // Token Generation with Enhanced Payload
    const access_token = generateToken({
      sub: user._id.toString(),
      user_id: user._id.toString(),
      email: user.email,
      username: user.username,
      client_id: client_id,
      scope: decoded.scope || 'openid profile email'
    });

    const id_token = generateToken({
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      client_id: client_id,
      aud: client_id,
      scope: decoded.scope || 'openid profile email'
    });

    console.log('Token Generation Successful', {
      user_email: user.email,
      client_id: client_id
    });
    console.groupEnd();

    // Comprehensive Token Response
    res.json({
      access_token,
      id_token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: decoded.scope || 'openid profile email',
      success: true
    });

  } catch (err) {
    console.error('Unexpected Token Exchange Error:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    console.groupEnd();

    console.group('Token Endpoint');
    console.log('Request Body:', req.body);
    console.log('Headers:', req.headers);
    console.groupEnd();

    res.status(500).json({
      error: 'server_error',
      error_description: 'An unexpected error occurred during token exchange',
      details: err.message
    });
  }
});

// Enhanced Token Generation Function
function generateToken(payload, options = {}) {
  const defaultOptions = {
    expiresIn: '1h'
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const token = jwt.sign(payload, JWT_SECRET, mergedOptions);
    
    // Optional: Log token generation (be careful not to log sensitive info)
    console.log('Token Generated', {
      payload: Object.keys(payload),
      expiresIn: mergedOptions.expiresIn
    });

    return token;
  } catch (error) {
    console.error('Token Generation Error:', {
      name: error.name,
      message: error.message
    });
    throw error;
  }
}

/**
 * UserInfo Endpoint (ตามมาตรฐาน OIDC)
 * ต้องส่ง access token ใน header: Authorization: Bearer <token>
 */
app.get('/auth/userinfo', authenticateJWT, async (req, res) => {
  const user = await User.findById(req.user.sub || req.user.user_id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json({
    sub: user._id,
    username: user.username,
    email: user.email
  });
});


// Comprehensive logging middleware
const oauthLoggingMiddleware = (req, res, next) => {
  console.group('OAuth Request');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  console.log('Full Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.groupEnd();

  // Capture and log the original send method
  const originalSend = res.send;
  res.send = function(body) {
      console.group('OAuth Response');
      console.log('Status:', res.statusCode);
      console.log('Body:', body);
      console.groupEnd();
      originalSend.call(this, body);
  };

  next();
};

// Apply middleware to OAuth-related routes
app.use(['/auth/authorize', '/auth/token'], oauthLoggingMiddleware);
/* =======================
   Endpoint อื่นๆ (เช่น validate token, callback สำหรับ OIDC provider อื่น)
   ======================= */

app.post('/validate-token', (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, payload: decoded });
  } catch (err) {
    console.error('Error validating token:', err);
    res.json({ valid: false });
  }
});

// Endpoint ตัวอย่างสำหรับการ handle callback (ถ้าใช้ในบริบทของ OIDC provider อื่น)
app.get('/callback', async (req, res) => {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const error = params.get('error');

  console.log('Callback URL params:', location.search); // Log the full URL
  console.log('Received authorization code:', code); // Log the received code

  if (error) {
    console.error('Authorization error:', error);
    navigate('/login');
    return;
  }

  if (!code) {
    console.error('No authorization code received');
    console.log('Full URL:', window.location.href); // Log the full URL for debugging
    navigate('/login');
    return;
  }

  try {
    // ตัวอย่างการแลกเปลี่ยน code เป็น token (อาจจะใช้ axios ในการร้องขอ)
    // const tokenResponse = await axios.post(`${OIDC_PROVIDER}/auth/token`, {
    //   client_id: CLIENT_ID,
    //   client_secret: CLIENT_SECRET,
    //   redirect_uri: REDIRECT_URI,
    //   code,
    //   grant_type: "authorization_code",
    // });
    // const { access_token, id_token } = tokenResponse.data;
    // console.log('Access Token:', access_token);
    // console.log('ID Token:', id_token);
    res.send('Authentication successful!');
  } catch (error) {
    console.error('Error exchanging code for token:', error.response?.data || error.message);
    res.status(500).send('Internal server error');
  }
});

/* =======================
   เริ่มเซิร์ฟเวอร์
   ======================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}`));

// Add metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Add request duration middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        metrics.requestDuration
            .labels(req.method, req.path, res.statusCode)
            .observe(duration);
    });
    next();
});

// Middleware to log all requests
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        logger.info('HTTP Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            metric: 'requestDuration',
            value: duration
        });
    });
    next();
});

// Example usage in login endpoint
app.post('/auth/login', async (req, res) => {
    try {
        // ... login logic ...

        await logger.info('Login successful', {
            user: req.body.email,
            ip: req.ip,
            metric: 'loginAttempts',
            status: 'success'
        });

        res.json({ success: true });

    } catch (error) {
        await logger.error('Login failed', {
            error: error.message,
            user: req.body.email,
            metric: 'loginAttempts',
            status: 'failure'
        });

        res.status(500).json({ error: 'Login failed' });
    }
});

// Add to your existing auth service
app.get('/auth/login', (req, res) => {
    const redirect_uri = req.query.redirect_uri;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f0f2f5;
                }
                .login-form {
                    background-color: white;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                input {
                    display: block;
                    margin: 10px 0;
                    padding: 8px;
                    width: 200px;
                }
                button {
                    background-color: #1a73e8;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                }
            </style>
        </head>
        <body>
            <div class="login-form">
                <h2>Login</h2>
                <form id="loginForm">
                    <input type="email" id="email" placeholder="Email" required>
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">Login</button>
                </form>
            </div>

            <script>
                document.getElementById('loginForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    try {
                        const response = await fetch('/auth/login', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                email: document.getElementById('email').value,
                                password: document.getElementById('password').value
                            })
                        });

                        const data = await response.json();
                        if (data.success) {
                            // Redirect back to client with auth code
                            window.location.href = '${redirect_uri}?code=' + data.token;
                        } else {
                            alert('Login failed');
                        }
                    } catch (error) {
                        alert('Login failed');
                    }
                });
            </script>
        </body>
        </html>
    `);
});

app.post('/auth/login', async (req, res) => {
  const { email, password, client_id } = req.body;
  console.log('Login attempt with email:', email);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create token with client info
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        client_id: client_id 
      }, 
      JWT_SECRET, 
      { expiresIn: '1h' }
    );

    console.log('Login successful');
    console.log('Generated Token:', token);

    // Return success with token
    res.json({
      success: true,
      token: token
    });
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Email configuration


// Client registration endpoint
app.post('/auth/register-client', async (req, res) => {
    console.log('Received client registration request:', req.body);
    
    const { 
        client_name,
        redirect_uris,
        application_type = 'web',
        contact_email
    } = req.body;

    try {
        // Validate required fields
        if (!client_name || !redirect_uris || !contact_email) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate redirect URIs
        if (!Array.isArray(redirect_uris) || redirect_uris.length === 0) {
            console.log('Invalid redirect URIs');
            return res.status(400).json({ error: 'Invalid redirect URIs' });
        }

        // Generate client credentials
        const client_id = crypto.randomBytes(16).toString('hex');
        const client_secret = crypto.randomBytes(32).toString('hex');

        // Create new client object
        const client = {
            client_id,
            client_secret,
            client_name,
            redirect_uris,
            application_type,
            contact_email,
            creation_date: new Date(),
            status: 'active'
        };

        console.log('Generated client credentials:', { client_id, client_name });

        // Add to authorized clients array
        clients.push(client);

        // Return credentials directly
        res.json({
            success: true,
            client_id,
            client_secret,
            message: 'Registration successful. Please save your credentials securely.',
            registration_date: client.creation_date
        });
    } catch (error) {
        console.error('Client registration error:', error);
        res.status(500).json({ 
            error: 'Registration failed', 
            details: error.message 
        });
    }
});

// Validate redirect URIs
function validateRedirectUris(uris) {
    return uris.every(uri => {
        try {
            const url = new URL(uri);
            return url.protocol === 'https:' || url.hostname === 'localhost';
        } catch {
            return false;
        }
    });
}

// Rate limiting for registration
const registrationLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10 // limit each IP to 10 registrations per day
});

app.use('/auth/register-client', registrationLimiter);

app.options('*', cors(corsOptions)); // Enable preflight for all routes



app.get('/debug-callback', (req, res) => {
    console.group('Callback Debug');
    console.log('Full Query Parameters:', req.query);
    console.log('Request Headers:', req.headers);
    console.groupEnd();

    res.json({
        query: req.query,
        headers: req.headers
    });
});

// Auth Dashboard route
app.get('/auth-dashboard', (req, res) => {
  // Check if user is authenticated
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});