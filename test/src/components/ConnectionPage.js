import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const ConnectionPage = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    
    return (
        <div>
            <h1>Connection Page</h1>
            <p>This is a protected page. You are logged in!</p>
            <button onClick={() => {
                logout();
                navigate('/login');
            }}>Logout</button>
        </div>
    );
};

export default ConnectionPage;