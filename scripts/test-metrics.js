const axios = require('axios');

async function generateTestData() {
  // Simulate login attempts
  for (let i = 0; i < 10; i++) {
    try {
      await axios.post('http://localhost:5000/auth/login', {
        email: 'test@example.com',
        password: Math.random() > 0.5 ? 'correct' : 'wrong'
      });
    } catch (error) {
      console.log('Login failed (expected for testing)');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

generateTestData(); 