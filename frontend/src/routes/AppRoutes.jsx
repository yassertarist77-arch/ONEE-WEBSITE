import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Admin pages ──────────────────────────────
import LoginPage           from '../pages/LoginPage';
import DashboardPage       from '../pages/DashboardPage';
import CatalogPage         from '../pages/CatalogPage';
import StockEntryPage      from '../pages/StockEntryPage';
import StockExitPage       from '../pages/StockExitPage';
import DischargesPage      from '../pages/DischargesPage';
import MovementHistoryPage from '../pages/MovementHistoryPage';
import LowStockPage        from '../pages/LowStockPage';
import UsersManagementPage from '../pages/UsersManagementPage';

// ── User pages ───────────────────────────────
import UserLoginPage   from '../pages/UserLoginPage';
import UserCatalogPage from '../pages/UserCatalogPage';
import UserRequestPage from '../pages/UserRequestPage';
import UserTicketsPage from '../pages/UserTicketsPage';
import UserLayout      from '../components/UserLayout';
import ProtectedUserRoute from './ProtectedUserRoute';
import AdminTicketsPage from '../pages/AdminTicketsPage';

// ── Admin guard ──────────────────────────────
function ProtectedRoute({ children }) {
    const { admin, loading } = useAuth();
    if (loading) return <div>Chargement...</div>;
    if (!admin) return <Navigate to="/login" />;
    return children;
}

export default function AppRoutes() {
    return (
        <Routes>
            {/* ── Admin routes ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={
                <ProtectedRoute><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/catalog" element={
                <ProtectedRoute><CatalogPage /></ProtectedRoute>
            } />
            <Route path="/stock-entry" element={
                <ProtectedRoute><StockEntryPage /></ProtectedRoute>
            } />
            <Route path="/stock-exit" element={
                <ProtectedRoute><StockExitPage /></ProtectedRoute>
            } />
            <Route path="/discharges" element={
                <ProtectedRoute><DischargesPage /></ProtectedRoute>
            } />
            <Route path="/movements" element={
                <ProtectedRoute><MovementHistoryPage /></ProtectedRoute>
            } />
            <Route path="/low-stock" element={
                <ProtectedRoute><LowStockPage /></ProtectedRoute>
            } />
            <Route path="/admin/tickets" element={
                <ProtectedRoute><AdminTicketsPage /></ProtectedRoute>
            } />
            <Route path="/admin/users" element={
                <ProtectedRoute><UsersManagementPage /></ProtectedRoute>
            } />

            {/* ── User routes ── */}
            <Route path="/user/login" element={<UserLoginPage />} />
            <Route path="/user/catalog" element={
                <ProtectedUserRoute>
                    <UserLayout>
                        <UserCatalogPage />
                    </UserLayout>
                </ProtectedUserRoute>
            } />
            <Route path="/user/request" element={
                <ProtectedUserRoute>
                    <UserLayout>
                        <UserRequestPage />
                    </UserLayout>
                </ProtectedUserRoute>
            } />
            <Route path="/user/tickets" element={
                <ProtectedUserRoute>
                    <UserLayout>
                        <UserTicketsPage />
                    </UserLayout>
                </ProtectedUserRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}
