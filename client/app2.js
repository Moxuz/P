const axios = require("axios");
const express = require("express");
const app = express();

// OIDC Configuration
const OIDC_PROVIDER = "http://localhost:5000";
const CLIENT_ID = "your-client-id";  // ตั้งค่าด้วย client_id ที่สร้างใน OIDC provider
const CLIENT_SECRET = "your-client-secret";  // ตั้งค่าด้วย client_secret ที่ตั้งใน OIDC provider
const REDIRECT_URI = "http://localhost:3000/callback";  // URL ที่จะรับการ callback

// Route สำหรับหน้าแรก ("/")
app.get("/", (req, res) => {
  // หากมี access_token ใน session, ให้ไปที่หน้า protected (ข้อมูลผู้ใช้)
  const accessToken = req.session ? req.session.access_token : null;
  if (accessToken) {
    // Redirect ไปที่ protected route ถ้ามี access_token
    return res.redirect("/protected");
  }

  // หากไม่มี access_token ให้แสดงหน้า login
  res.send(`
    <html>
      <head><title>OIDC Login</title></head>
      <body>
        <h1>Welcome to the OIDC Login</h1>
        <a href="/login">Login with OIDC</a>
      </body>
    </html>
  `);
});

// Route สำหรับ /login: เริ่มกระบวนการ OIDC login
// Route สำหรับเริ่มกระบวนการ login OIDC
app.get('/login', (req, res) => {
    const state = Math.random().toString(36).substring(7); // สร้าง state ที่เป็นค่าระยะห่าง
    const authUrl = `${OIDC_PROVIDER}/auth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=openid email profile&state=${state}`;
    res.redirect(authUrl);
});


// Route สำหรับ /callback: จะรับ authorization code และแลกเปลี่ยนเป็น token
app.get("/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    const tokenResponse = await axios.post(`${OIDC_PROVIDER}/auth/token`, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code,
      grant_type: "authorization_code",
    });

    const { access_token, id_token } = tokenResponse.data;

    // เก็บ access_token ใน session
    req.session.access_token = access_token;
    req.session.id_token = id_token;

    // เปลี่ยนเส้นทางไปที่ /protected
    res.redirect("/protected");

  } catch (error) {
    console.error("OIDC Authentication Error:", error.response?.data || error.message);
    res.status(500).send("Internal server error");
  }
});

// Route สำหรับ /protected: ใช้ access_token เพื่อดึงข้อมูลผู้ใช้
app.get("/protected", async (req, res) => {
  const accessToken = req.session.access_token;

  if (!accessToken) {
    return res.status(401).send('You need to log in first.');
  }

  try {
    const userResponse = await axios.get(`${OIDC_PROVIDER}/auth/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json({
      message: 'Authenticated successfully!',
      userInfo: userResponse.data,
    });

  } catch (error) {
    console.error('Error fetching user info:', error);
    return res.status(500).send('Internal server error');
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
