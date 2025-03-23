(function(global) {
    // Ensure crypto implementation works across environments
    const cryptoImpl = typeof window !== 'undefined' && window.crypto 
        ? window.crypto 
        : require('crypto');

    class AuthSDK {
        constructor(config) {
            console.log('AuthSDK Constructor Called', config);

            // Validate required configuration
            if (!config.clientId || !config.clientSecret || !config.redirectUri) {
                throw new Error('Missing required configuration parameters');
            }

            this.config = {
                authServerUrl: config.authServerUrl || 'http://localhost:8000',
                clientId: config.clientId,
                clientSecret: config.clientSecret,
                redirectUri: config.redirectUri
            };

            this.token = null;
            this.tokenExpiry = null;
        }

        // Generate random bytes
        async generateRandomBytes(length) {
            console.log('Generating Random Bytes');
            try {
                // Use Web Crypto API in browser
                if (typeof window !== 'undefined' && window.crypto) {
                    const array = new Uint8Array(length);
                    window.crypto.getRandomValues(array);
                    return Array.from(array)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join('');
                } 
                // Fallback for Node.js
                else {
                    const crypto = require('crypto');
                    return crypto.randomBytes(length).toString('hex');
                }
            } catch (error) {
                console.error('Random Bytes Generation Error', error);
                throw new Error(`Failed to generate random bytes: ${error.message}`);
            }
        }

        // Login URL generator
        async getLoginUrl() {
            console.log('Generating Login URL');
            try {
                const state = await this.generateRandomBytes(16);
                const params = new URLSearchParams({
                    client_id: this.config.clientId,
                    redirect_uri: this.config.redirectUri,
                    response_type: 'code',
                    state
                });
                const loginUrl = `${this.config.authServerUrl}/auth/login?${params}`;
                console.log('Generated Login URL:', loginUrl);
                return loginUrl;
            } catch (error) {
                console.error('Login URL Generation Error', error);
                throw new Error(`Failed to generate login URL: ${error.message}`);
            }
        }

        // Token exchange
        async handleCallback(code) {
            console.log('Handling Callback', code);
            try {
                const response = await fetch(`${this.config.authServerUrl}/auth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        client_id: this.config.clientId,
                        client_secret: this.config.clientSecret,
                        redirect_uri: this.config.redirectUri,
                        grant_type: 'authorization_code'
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Token Exchange Error', errorText);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
                }

                const data = await response.json();
                console.log('Token Exchange Successful', data);
                this.setToken(data.access_token, data.expires_in);
                return data;
            } catch (error) {
                console.error('Token Exchange Failed', error);
                throw new Error(`Token exchange failed: ${error.message}`);
            }
        }

        // Token management
        setToken(token, expiresIn) {
            console.log('Setting Token', token, expiresIn);
            this.token = token;
            this.tokenExpiry = Date.now() + (expiresIn * 1000);
        }

        // Logout
        logout() {
            console.log('Logging out');
            this.token = null;
            this.tokenExpiry = null;
        }
    }

    // Universal Module Definition (UMD) pattern
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AuthSDK;
    }

    if (typeof window !== 'undefined') {
        window.AuthSDK = AuthSDK;
    }

    return AuthSDK;
})(typeof global !== 'undefined' ? global : window);