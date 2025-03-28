import React from 'react';
import ReactDOM from 'react-dom/client';
import { 
    BrowserRouter as Router, 
    Routes, 
    Route, 
    Navigate, 
    Outlet 
} from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import Callback from './components/Callback';
import Dashboard from './components/dashboard';
import ConnectionPage from './components/ConnectionPage';
import './index.css';

// Protect routes Higher Order Component
const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
        return <div>Loading...</div>;
    }
    
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// Main App Component with Routes
const App = () => {
    return (
        <Router>
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/callback" element={<Callback />} />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/connection" element={<ConnectionPage />} />
                </Route>
                
                {/* Default Route */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    );
};

// 404 Not Found Component
const NotFound = () => {
    return (
        <div>
            <h1>404 - Page Not Found</h1>
            <p>The page you are looking for does not exist.</p>
        </div>
    );
};

// Root render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
);