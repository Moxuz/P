import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getUserInfo } from '../services/api';

const Dashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }

                // Fetch user info
                const info = await getUserInfo(token);
                setUserInfo(info);
                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch user info:', error);
                setError('Failed to load user information');
                setLoading(false);
                logout();
                navigate('/login');
            }
        };

        fetchUserInfo();
    }, [navigate, logout]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return (
            <div>
                <h2>Error</h2>
                <p>{error}</p>
                <button onClick={() => {
                    logout();
                    navigate('/login');
                }}>Logout</button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            {userInfo ? (
                <div>
                    <h2>Welcome, {userInfo.username || userInfo.email}!</h2>
                    <p>Email: {userInfo.email}</p>
                </div>
            ) : (
                <p>No user information available</p>
            )}
            <button onClick={() => {
                logout();
                navigate('/login');
            }}>Logout</button>
        </div>
    );
};

export default Dashboard;