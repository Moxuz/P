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


//const kafka = require("kafka-node"); 
//const client = new kafka.KafkaClient({ kafkaHost: "localhost:9092" }); 


const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } = config; // โหลดค่าจาก config

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true })); // Parse form data
app.use(bodyParser.json());
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
        //logMessage({ level: 'warn', message: 'Invalid credentials', email });
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // สร้าง JWT token สำหรับ local login
    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    //logMessage({ level: 'info', message: 'User logged in', user });
    console.log('Login successful');
    console.log('Generated Token:', token);

    const redirectUrl = `/dashboard?token=${token}`;
    res.redirect(redirectUrl);
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

// จำลอง client ที่ลงทะเบียนกับ IdP ของเรา
const clients = [
  {
    client_id: 'client1',
    client_secret: 'client1secret',
    redirect_uris: ['http://localhost:3000/callback']  // URI ที่อนุญาตให้ redirect กลับมา
  }
];

// กำหนดเวลาหมดอายุของ authorization code และ token
const AUTH_CODE_EXPIRY = '5m';  // authorization code หมดอายุใน 5 นาที
const TOKEN_EXPIRY = '1h';      // access token / id token หมดอายุใน 1 ชั่วโมง

// ฟังก์ชันสร้าง Authorization Code (ใช้ JWT เป็น container)
function generateAuthCode(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: AUTH_CODE_EXPIRY });
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

  // ตรวจสอบ client_id และ redirect_uri
  const client = clients.find(c => c.client_id === client_id && c.redirect_uris.includes(redirect_uri));
  if (!client) {
    return res.status(400).send("Invalid client or redirect URI");
  }

  if (response_type !== 'code') {
    return res.status(400).send("Unsupported response type");
  }

  // แสดงหน้า login แบบง่าย ๆ
  res.send(`
    <html>
  <body>
    <h2>Login to continue</h2>
    <form method="post" action="/auth/authorize">
      <input type="hidden" name="client_id" value="${client_id}" />
      <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
      <input type="hidden" name="response_type" value="${response_type}" />
      <input type="hidden" name="scope" value="${scope}" />
      <input type="hidden" name="state" value="${state || ''}" />
      <label>Email: <input name="email" type="email" /></label><br/><br/>
      <label>Password: <input name="password" type="password" /></label><br/><br/>
      <button type="submit">Login</button>
    </form>
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
    const { client_id, redirect_uri, response_type, scope, state, email, password } = req.body;
  
    // ตรวจสอบ client อีกครั้ง
    const client = clients.find(c => c.client_id === client_id && c.redirect_uris.includes(redirect_uri));
    if (!client) {
      return res.status(400).send("Invalid client or redirect URI");
    }
  
    // ค้นหาผู้ใช้โดยใช้ email แทน username
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send("Invalid credentials");
    }
  
    // ตรวจสอบรหัสผ่าน
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send("Invalid credentials");
    }
  
    // สร้าง authorization code โดยเก็บข้อมูล user_id, client_id และ scope
    const authCode = generateAuthCode({ user_id: user._id.toString(), client_id, scope });
  
    // Redirect กลับไปยัง redirect_uri พร้อมกับ query parameters code และ state (ถ้ามี)
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append("code", authCode);
    if (state) {
      redirectUrl.searchParams.append("state", state);
    }
    res.redirect(redirectUrl.toString());
  });
/**
 * Token Endpoint
 * รับ POST request เพื่อแลกเปลี่ยน authorization code เป็น access token และ id token
 * ต้องรับข้อมูล: code, client_id, client_secret, redirect_uri, grant_type
 */
app.post('/auth/token', (req, res) => {
  const { code, client_id, client_secret, redirect_uri, grant_type } = req.body;

  if (grant_type !== 'authorization_code') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  // ตรวจสอบ client credentials
  const client = clients.find(c =>
    c.client_id === client_id &&
    c.client_secret === client_secret &&
    c.redirect_uris.includes(redirect_uri)
  );
  if (!client) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  // ตรวจสอบ authorization code
  jwt.verify(code, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    if (decoded.client_id !== client_id) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // สร้าง access token และ id token
    const access_token = generateToken({ user_id: decoded.user_id, scope: decoded.scope });
    // ID Token สำหรับ OpenID Connect ประกอบด้วยข้อมูลพื้นฐานผู้ใช้ (sub, email, username)
    const user = await User.findById(decoded.user_id);
    const id_token = generateToken({ sub: user._id.toString(), email: user.email, username: user.username });

    res.json({
      access_token,
      id_token,
      token_type: "Bearer",
      expires_in: 3600
    });
  });
});

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
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('Authorization code is missing.');
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
