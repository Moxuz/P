document.addEventListener('DOMContentLoaded', () => {
  // Debugging function
  function log(message, isError = false) {
      const debugContent = document.getElementById('debug-content');
      console.log(isError ? '❌ ERROR:' : '✅ LOG:', message);
      
      if (debugContent) {
          debugContent.textContent += `${isError ? 'ERROR: ' : ''}${message}\n`;
      }
  }

  // Verify AuthSDK is available
  log(`AuthSDK available: ${typeof AuthSDK !== 'undefined'}`);

  try {
      // Configuration (replace with your actual values)
      const authConfig = {
          clientId: 'test_client',
          clientSecret: 'test_secret',
          redirectUri: window.location.origin + '/callback',
          authServerUrl: 'http://localhost:8000'
      };

      // Initialize AuthSDK
      const authSDK = new AuthSDK(authConfig);
      log('AuthSDK initialized successfully');

      // Login Button Event Listener
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) {
          loginBtn.addEventListener('click', async (e) => {
              e.preventDefault();
              log('Login button clicked');

              try {
                  const loginUrl = await authSDK.getLoginUrl();
                  log(`Generated Login URL: ${loginUrl}`);
                  window.location.href = loginUrl;
              } catch (error) {
                  log(`Login Error: ${error.message}`, true);
              }
          });
      } else {
          log('Login button not found', true);
      }

      // Callback handling
      function handleCallback() {
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');

          if (code) {
              log(`Authorization Code received: ${code}`);
              authSDK.handleCallback(code)
                  .then(tokenData => {
                      log('Token exchange successful');
                      log(`Access Token: ${tokenData.access_token}`);
                  })
                  .catch(error => {
                      log(`Token Exchange Error: ${error.message}`, true);
                  });
          }
      }

      // Check for callback on page load
      handleCallback();

  } catch (error) {
      log(`SDK Initialization Error: ${error.message}`, true);
  }
});