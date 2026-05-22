import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShoppingBag, LogOut, User, FileEdit, ClipboardList, Menu, X } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import './UserLayout.css';

const POLL_MS = 60_000;

export default function UserLayout({ children }) {
    const { user, logout, userApi } = useUserAuth();
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [items, setItems] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const wrapRef = useRef(null);

    const fetchUnread = useCallback(async () => {
        try {
            const res = await userApi.get('/notifications/unread-count');
            setUnreadCount(Number(res.data?.unread_count) || 0);
        } catch {
            /* ignore */
        }
    }, [userApi]);

    const fetchLatest = useCallback(async () => {
        try {
            setLoadingList(true);
            const res = await userApi.get('/notifications', { params: { per_page: 5, page: 1 } });
            const p = res.data?.data;
            setItems(Array.isArray(p?.data) ? p.data : []);
            const metaUnread = res.data?.meta?.unread_count;
            if (metaUnread !== undefined) setUnreadCount(Number(metaUnread) || 0);
        } catch {
            setItems([]);
        } finally {
            setLoadingList(false);
        }
    }, [userApi]);

    useEffect(() => {
        fetchUnread();
        const t = setInterval(fetchUnread, POLL_MS);
        return () => clearInterval(t);
    }, [fetchUnread]);

    useEffect(() => {
        if (!menuOpen) return;
        fetchLatest();
    }, [menuOpen, fetchLatest]);

    useEffect(() => {
        if (!menuOpen) return;
        const onDoc = e => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [menuOpen]);

    const handleLogout = async () => {
        await logout();
        navigate('/user/login');
    };

    const markAllRead = async () => {
        try {
            await userApi.patch('/notifications/read-all');
            setUnreadCount(0);
            await fetchLatest();
        } catch {
            /* ignore */
        }
    };

    const onPickNotification = async n => {
        try {
            if (!n.is_read) await userApi.patch(`/notifications/${n.id}/read`);
        } catch {
            /* ignore */
        }
        setMenuOpen(false);
        const tid = n.metadata?.ticket_id;
        if (tid && (n.type === 'ticket_validé' || n.type === 'ticket_refusé')) {
            navigate(`/user/tickets?ticket=${tid}`);
            return;
        }
        navigate('/user/tickets');
    };

    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    return (
        <div className={`ulayout-root ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
            <nav className="ulayout-nav">
                <div className="ulayout-nav-inner">
                    <button 
                        className="ulayout-mobile-toggle"
                        onClick={() => setMobileNavOpen(!mobileNavOpen)}
                        aria-label="Menu"
                    >
                        {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="ulayout-brand">
                        <div className="ulayout-brand-dot" />
                        <span className="ulayout-brand-name">ONEE</span>
                        <span className="ulayout-brand-role">Agent</span>
                    </div>

                    <div className={`ulayout-links ${mobileNavOpen ? 'open' : ''}`}>
                        <Link to="/user/catalog" className="ulayout-link">
                            <ShoppingBag size={15} />
                            Catalogue
                        </Link>
                        <Link to="/user/request" className="ulayout-link">
                            <FileEdit size={15} />
                            Nouvelle Demande
                        </Link>
                        <Link to="/user/tickets" className="ulayout-link">
                            <ClipboardList size={15} />
                            Mes Demandes
                        </Link>
                    </div>

                    <div className="ulayout-user">
                        <div className="ulayout-notif-wrap" ref={wrapRef}>
                            <button
                                type="button"
                                className="ulayout-bell"
                                aria-label="Notifications"
                                aria-expanded={menuOpen}
                                onClick={() => setMenuOpen(o => !o)}
                            >
                                <span className="ulayout-bell-ico" aria-hidden>
                                    🔔
                                </span>
                                {unreadCount > 0 && (
                                    <span className="ulayout-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                )}
                            </button>
                            {menuOpen && (
                                <div className="ulayout-notif-panel" role="menu">
                                    <div className="ulayout-notif-head">
                                        <span>Notifications</span>
                                        {unreadCount > 0 && (
                                            <button type="button" className="ulayout-notif-markall" onClick={markAllRead}>
                                                Marquer tout comme lu
                                            </button>
                                        )}
                                    </div>
                                    {loadingList ? (
                                        <div className="ulayout-notif-loading">
                                            <span className="ulayout-spin" /> Chargement…
                                        </div>
                                    ) : items.length === 0 ? (
                                        <div className="ulayout-notif-empty">Aucune notification.</div>
                                    ) : (
                                        <ul className="ulayout-notif-list">
                                            {items.map(n => (
                                                <li key={n.id}>
                                                    <button
                                                        type="button"
                                                        className={`ulayout-notif-row ${!n.is_read ? 'ulayout-notif-row--unread' : ''}`}
                                                        onClick={() => onPickNotification(n)}
                                                    >
                                                        <span className="ulayout-notif-title">{n.title}</span>
                                                        <span className="ulayout-notif-msg">{n.message}</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="ulayout-user-info">
                            <div className="ulayout-avatar">
                                <User size={14} />
                            </div>
                            <div className="ulayout-user-text">
                                <span className="ulayout-user-name">{user?.name}</span>
                                {user?.matricule && <span className="ulayout-user-mat">{user.matricule}</span>}
                            </div>
                        </div>
                        <button
                            id="user-logout-btn"
                            className="ulayout-logout"
                            onClick={handleLogout}
                            title="Se déconnecter"
                        >
                            <LogOut size={15} />
                            Déconnexion
                        </button>
                    </div>
                </div>
            </nav>

            <main className="ulayout-main">{children}</main>
        </div>
    );
}
