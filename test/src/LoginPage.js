import React from 'react';
import { useAuth } from './AuthContext';

const LoginPage = () => {
    const { oauthLogin } = useAuth();

    const handleOAuthLogin = () => {
        try {
            console.log('Login button clicked');
            oauthLogin();
        } catch (error) {
            console.error('Login error:', error);
        }
    };

    return (
        <div>
            <h2>Login Page</h2>
            <button onClick={handleOAuthLogin}>
                Login with OAuth
            </button>
        </div>
    );
};

export default LoginPage;