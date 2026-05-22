import { Navigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

/**
 * Guards any route that requires a logged-in regular user.
 * Checks for user_token in localStorage via UserAuthContext.
 * Completely separate from admin ProtectedRoute.
 */
export default function ProtectedUserRoute({ children }) {
    const { user, loading } = useUserAuth();

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f0fdf4',
                fontFamily: 'Inter, sans-serif',
                color: '#059669',
                fontSize: '14px',
                gap: '12px'
            }}>
                <span style={{
                    width: '20px', height: '20px',
                    border: '2px solid rgba(5,150,105,0.2)',
                    borderTopColor: '#059669',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block'
                }} />
                Chargement…
            </div>
        );
    }

    if (!user) return <Navigate to="/user/login" replace />;

    return children;
}
