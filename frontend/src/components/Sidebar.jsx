import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard,
    Package,
    ArrowDownToLine,
    ArrowUpFromLine,
    TriangleAlert,
    FileText,
    History,
    LogOut,
    Droplets,
    Ticket,
    Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';

const menuItems = [
    { path: '/dashboard', Icon: LayoutDashboard, label: 'Tableau de Bord' },
    { path: '/catalog', Icon: Package, label: 'Catalogue' },
    { path: '/stock-entry', Icon: ArrowDownToLine, label: 'Entrée de Stock' },
    { path: '/stock-exit', Icon: ArrowUpFromLine, label: 'Sortie de Stock' },
    { path: '/admin/tickets', Icon: Ticket, label: 'Demandes', badgeKey: 'tickets' },
    { path: '/discharges', Icon: FileText, label: 'Décharges' },
    { path: '/admin/users', Icon: Users, label: 'Utilisateurs' },
    { path: '/low-stock', Icon: TriangleAlert, label: 'Alertes Stock' },
    { path: '/movements', Icon: History, label: 'Historique' },
];

const iconProps = { size: 20, strokeWidth: 1.75 };

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [pendingTickets, setPendingTickets] = useState(0);

    useEffect(() => {
        let cancelled = false;
        apiClient
            .get('/tickets', { params: { status: 'soumis', per_page: 1 } })
            .then(res => {
                if (!cancelled) {
                    const meta = res.data?.meta?.pending_count;
                    setPendingTickets(meta ?? res.data?.pending_count ?? 0);
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [location.pathname]);

    const handleLogout = async () => {
        try {
            await logout();
        } catch {
            localStorage.removeItem('token');
        }
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="logo-container">
                    <div className="logo-mark" aria-hidden>
                        <Droplets size={22} strokeWidth={2.2} />
                    </div>
                    <div className="logo-text">
                        <span>ONEE</span>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map(({ path, Icon, label, badgeKey }) => (
                    <a
                        key={path}
                        href={path}
                        className={`nav-item ${location.pathname === path ? 'active' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            navigate(path);
                        }}
                    >
                        <span className="nav-icon">
                            <Icon {...iconProps} />
                        </span>
                        <span className="nav-label">{label}</span>
                        {badgeKey === 'tickets' && pendingTickets > 0 && (
                            <span className="nav-badge">{pendingTickets > 99 ? '99+' : pendingTickets}</span>
                        )}
                    </a>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button type="button" className="logout-btn" onClick={handleLogout}>
                    <span className="nav-icon">
                        <LogOut {...iconProps} />
                    </span>
                    <span className="nav-label">Déconnexion</span>
                </button>
            </div>
        </aside>
    );
}
