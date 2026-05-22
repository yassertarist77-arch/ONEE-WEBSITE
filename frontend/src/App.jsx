import { BrowserRouter } from 'react-router-dom';
import { AuthProvider }     from './context/AuthContext';
import { UserAuthProvider } from './context/UserAuthContext';
import AppRoutes            from './routes/AppRoutes';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <UserAuthProvider>
                    <AppRoutes />
                </UserAuthProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
