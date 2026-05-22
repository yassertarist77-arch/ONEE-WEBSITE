import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { UserRound, Menu, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const PAGE_TITLES = {
    '/dashboard': 'Tableau de Bord',
    '/catalog': 'Catalogue des Consommables',
    '/stock-entry': 'Entrée de Stock',
    '/stock-exit': 'Sortie de Stock',
    '/low-stock': 'Alertes Stock',
    '/discharges': 'Décharges',
    '/movements': 'Historique des Mouvements',
};

export default function Layout({ children }) {
    const { admin, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const pageTitle = PAGE_TITLES[location.pathname] || 'Gestion des Consommables';

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleNavbarLogout = async () => {
        try {
            await logout();
        } catch {
            localStorage.removeItem('token');
        }
        navigate('/login');
    };

    return (
        <div className={`layout ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
            <Sidebar />
            <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />

            <div className="main-content">
                <header className="navbar">
                    <div className="navbar-content">
                        <button 
                            type="button" 
                            className="mobile-menu-btn" 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                        >
                            <Menu size={20} />
                        </button>
                        
                        <h1 className="navbar-title">{pageTitle}</h1>

                        <div className="navbar-user">
                            <span className="user-name">{admin?.name}</span>
                            <span className="user-avatar-ring" aria-hidden>
                                <UserRound size={18} strokeWidth={1.85} />
                            </span>
                            <button
                                type="button"
                                onClick={handleNavbarLogout}
                                className="logout-btn-navbar"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </header>

                <main className="content page-enter">{children}</main>
            </div>
        </div>
    );
}
