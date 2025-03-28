import { CONFIG } from '../config';

// Keep the initiateOAuthLogin as a named export
export const initiateOAuthLogin = () => {
    const { CLIENT_ID, REDIRECT_URI, API_URL } = CONFIG;
    const scope = 'openid profile email';
    
    // Generate state with enhanced randomness
    const generateState = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2, 15) + 
               Date.now().toString(36);
    };

    const state = generateState();

    // Store state with comprehensive logging
    console.group('OAuth Login Initiation');
    console.log('Generated State:', state);
    
    // Store state in multiple locations
    try {
        localStorage.setItem('oauth_state', state);
        sessionStorage.setItem('oauth_state', state);
    } catch (error) {
        console.error('Error storing state:', error);
    }

    // Construct authorization URL
    const authUrl = new URL(`${API_URL}/auth/authorize`);
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    console.log('Authorization URL:', authUrl.toString());
    console.groupEnd();

    // Redirect to authorization URL
    window.location.href = authUrl.toString();
};
// Enhanced state management
const StateManager = {
    setState(state) {
        try {
            console.log('Storing State:', state);
            localStorage.setItem('oauth_state', state);
            sessionStorage.setItem('oauth_state', state);
        } catch (error) {
            console.error('Error storing state:', error);
        }
    },

    getState() {
        try {
            const localState = localStorage.getItem('oauth_state');
            const sessionState = sessionStorage.getItem('oauth_state');

            console.log('State Retrieval:', {
                localStorage: localState,
                sessionStorage: sessionState
            });

            return localState || sessionState || null;
        } catch (error) {
            console.error('Error retrieving state:', error);
            return null;
        }
    },

    clearState() {
        try {
            localStorage.removeItem('oauth_state');
            sessionStorage.removeItem('oauth_state');
        } catch (error) {
            console.error('Error clearing state:', error);
        }
    }
};

export const authService = {
    async handleOAuthCallback() {
        console.group('OAuth Callback Processing');
        
        // Comprehensive parameter extraction
        const extractParameters = () => {
            // Multiple extraction methods
            const methods = [
                () => {
                    // URL Search Params
                    const searchParams = new URLSearchParams(window.location.search);
                    return {
                        code: searchParams.get('code'),
                        state: searchParams.get('state'),
                        error: searchParams.get('error')
                    };
                },
                () => {
                    // Hash Parameters
                    const hashParams = new URLSearchParams(window.location.hash.substring(1));
                    return {
                        code: hashParams.get('code'),
                        state: hashParams.get('state'),
                        error: hashParams.get('error')
                    };
                }
            ];

            // Try each extraction method
            for (const method of methods) {
                const params = method();
                if (params.code) return params;
            }

            return { code: null, state: null, error: null };
        };

        // Log full URL information
        console.log('Full URL Information:', {
            href: window.location.href,
            search: window.location.search,
            hash: window.location.hash,
            pathname: window.location.pathname
        });

        // Extract parameters
        const { code, state, error } = extractParameters();

        console.log('Extracted Parameters:', { 
            code: code ? 'present' : 'missing', 
            state: state ? 'present' : 'missing', 
            error: error || 'none' 
        });

        // Special handling for connection page
        if (window.location.pathname === '/connection') {
            const token = localStorage.getItem('token');
            if (token) {
                console.log('Token found on connection page');
                return { access_token: token };
            }
        }

        // Error handling
        if (error) {
            console.error('Authorization Error:', error);
            console.groupEnd();
            throw new Error(error);
        }

        // Code validation
        if (!code) {
            console.error('No valid authorization code received');
            console.log('Full URL:', window.location.href);
            console.groupEnd();
            throw new Error('No authorization code received');
        }

        try {
            console.log('Attempting token exchange with code:', code);

            const response = await fetch(`${CONFIG.API_URL}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code,
                    client_id: CONFIG.CLIENT_ID,
                    client_secret: CONFIG.CLIENT_SECRET,
                    redirect_uri: CONFIG.REDIRECT_URI,
                    grant_type: 'authorization_code'
                })
            });

            // Log full response details
            console.log('Token Exchange Response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            // Handle non-OK responses
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Token Exchange Error Response:', errorText);
                
                try {
                    // Try to parse error as JSON
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error_description || errorText);
                } catch {
                    // Fallback if not JSON
                    throw new Error(`Token exchange failed: ${errorText}`);
                }
            }

            const data = await response.json();
            console.log('Token Data:', {
                access_token: data.access_token ? 'present' : 'missing',
                id_token: data.id_token ? 'present' : 'missing'
            });

            console.groupEnd();
            return data;
        } catch (error) {
            console.error('Token Exchange Error:', error);
            console.groupEnd();
            throw error;
        }
    },

    getUserInfo: async (token) => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/userinfo`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
    
            if (!response.ok) {
                throw new Error('Failed to fetch user info');
            }
    
            return await response.json();
        } catch (error) {
            console.error('Get user info error:', error);
            throw error;
        }
    }
};

export const {
    handleOAuthCallback,
    getUserInfo
} = authService;

export default authService;