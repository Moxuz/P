import React, { createContext, useContext, useState, useEffect } from 'react';
import { initiateOAuthLogin, handleOAuthCallback } from './services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (token) {
                    setIsAuthenticated(true);
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Authentication check failed:', error);
                logout();
            }
        };

        checkAuthentication();
    }, []);

    const login = (token, userInfo = null) => {
        try {
            localStorage.setItem('token', token);
            
            setIsAuthenticated(true);
            setUser(userInfo);
            setError(null);
        } catch (error) {
            console.error('Login error:', error);
            setError('Login failed');
        }
    };

    const logout = () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('id_token');
            
            setIsAuthenticated(false);
            setUser(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const oauthLogin = () => {
        try {
            initiateOAuthLogin();
        } catch (error) {
            console.error('OAuth Login error:', error);
            setError('OAuth Login failed');
        }
    };

    const contextValue = {
        isAuthenticated,
        user,
        loading,
        error,
        login,
        logout,
        oauthLogin
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
};