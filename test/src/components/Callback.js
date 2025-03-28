import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleOAuthCallback } from '../services/api';
import { useAuth } from '../AuthContext';

const Callback = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [error, setError] = useState(null);

    useEffect(() => {
        const processCallback = async () => {
            try {
                console.group('Comprehensive Callback Processing');
                
                // Log comprehensive location information
                console.log('Location Object:', {
                    pathname: location.pathname,
                    search: location.search,
                    hash: location.hash,
                    state: location.state
                });

                // Manual parameter extraction
                const urlParams = new URLSearchParams(window.location.search);
                const manualParams = {};
                for (const [key, value] of urlParams.entries()) {
                    manualParams[key] = value;
                }

                console.log('Manual URL Parameters:', manualParams);

                // Comprehensive logging of window and document
                console.log('Window Location:', {
                    href: window.location.href,
                    search: window.location.search,
                    hash: window.location.hash
                });

                // Check if we're on the connection page
                if (location.pathname === '/connection') {
                    // Try to extract token from previous authentication
                    const token = localStorage.getItem('token');
                    
                    if (token) {
                        console.log('Using stored token for authentication');
                        login(token);
                        return;
                    }
                }

                // Attempt to handle callback with comprehensive error handling
                const tokenData = await handleOAuthCallback();

                console.log('Token Data Received:', tokenData);

                // Store tokens
                if (tokenData.access_token) {
                    localStorage.setItem('token', tokenData.access_token);
                    
                    if (tokenData.id_token) {
                        localStorage.setItem('id_token', tokenData.id_token);
                    }

                    // Manually set authentication state
                    login(tokenData.access_token);

                    console.log('Authentication successful, redirecting to dashboard');
                    navigate('/dashboard');
                } else {
                    throw new Error('No access token received');
                }

                console.groupEnd();
            } catch (error) {
                console.error('Comprehensive Callback Error:', error);
                console.groupEnd();

                // Set error state for rendering
                setError(error.message || 'Authentication failed');

                // Clear any partial authentication state
                localStorage.removeItem('token');
                localStorage.removeItem('id_token');

                // Redirect to login with error
                navigate('/login', { 
                    state: { 
                        error: error.message || 'Authentication failed' 
                    } 
                });
            }
        };

        processCallback();
    }, [navigate, login, location]);

    // Error rendering
    if (error) {
        return (
            <div className="callback-error">
                <h2>Authentication Error</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/login')}>
                    Back to Login
                </button>
            </div>
        );
    }

    // Loading state
    return (
        <div className="callback-container">
            <h2>Processing Authentication...</h2>
            <p>Please wait while we complete your login.</p>
        </div>
    );
};

export default Callback;