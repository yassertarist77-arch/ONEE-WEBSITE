import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Package,
    BadgeCheck,
    TriangleAlert,
    PackageX,
    Activity,
    FileText,
    ArrowDownToLine,
    ArrowUpFromLine,
    Database,
    FileSpreadsheet,
    FileDown,
    Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import dischargeService from '../services/dischargeService';
import exportService from '../services/exportService';
import Layout from '../components/Layout';

export default function DashboardPage() {
    const { admin } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setError('');
            setLoading(true);
            const response = await dashboardService.getStats();
            setStats(response.data.data);
        } catch (err) {
            setError('Erreur lors du chargement des statistiques');
        } finally {
            setLoading(false);
        }
    };

    const formatRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'à l\'instant';
        if (diffMins < 60) return `il y a ${diffMins} min`;
        if (diffHours < 24) return `il y a ${diffHours}h`;
        if (diffDays < 7) return `il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR');
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'en_stock':
                return <span className="badge badge-success">En stock</span>;
            case 'critique':
                return <span className="badge badge-warning">Critique</span>;
            case 'rupture':
                return <span className="badge badge-danger">Rupture</span>;
            default:
                return <span className="badge badge-success">En stock</span>;
        }
    };

    const getMovementLabel = (type) => {
        return type === 'in' ? 'Entrée' : 'Sortie';
    };

    const handleDownloadDischargePdf = async (discharge) => {
        try {
            const response = await dischargeService.downloadPDF(discharge.id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `decharge_${discharge.reference}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Erreur lors du téléchargement du PDF');
        }
    };

    const handleDownloadDatabase = async () => {
        try {
            const response = await exportService.downloadDatabase();
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ONEE_backup_${new Date().toISOString().split('T')[0]}.sqlite`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Erreur lors du téléchargement de la base de données');
        }
    };

    const handleExportCSV = async () => {
        try {
            const response = await exportService.exportCSV();
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `ONEE_consommables_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Erreur lors de l\'export CSV');
        }
    };

    const alertItemClass = (status) => {
        if (status === 'rupture') return 'alert-item alert-item--rupture';
        return 'alert-item alert-item--critique';
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading">Chargement...</div>
            </Layout>
        );
    }

    if (error && !stats) {
        return (
            <Layout>
                <div className="error-message">{error}</div>
                <button type="button" onClick={fetchStats} className="btn-primary">Réessayer</button>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="dashboard">
                {error && <div className="error-message">{error}</div>}

                <div className="dashboard-header">
                    <h1>Tableau de Bord</h1>
                    <p className="subtitle">Bienvenue, {admin?.name}. Voici l'état de votre stock.</p>
                </div>

                <Link to="/admin/tickets?status=soumis" className="dashboard-pending-tickets">
                    <div className="dashboard-pending-tickets-icon" aria-hidden>
                        <Ticket size={26} strokeWidth={1.85} />
                    </div>
                    <div className="dashboard-pending-tickets-body">
                        <span className="dashboard-pending-tickets-label">🎫 Demandes en attente</span>
                        <span className="dashboard-pending-tickets-count">{stats?.pending_tickets_count ?? 0}</span>
                    </div>
                    <span className="dashboard-pending-tickets-cta">Voir les demandes →</span>
                </Link>

                <div className="stats-grid">
                    <div className="stat-card stat-blue">
                        <div className="stat-icon-badge" aria-hidden><Package size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{stats?.total_consumables || 0}</div>
                            <div className="stat-label">Total Consommables</div>
                        </div>
                    </div>
                    <div className="stat-card stat-green">
                        <div className="stat-icon-badge" aria-hidden><BadgeCheck size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{stats?.stock_status?.en_stock || 0}</div>
                            <div className="stat-label">En Stock</div>
                        </div>
                    </div>
                    <div className="stat-card stat-orange">
                        <div className="stat-icon-badge" aria-hidden><TriangleAlert size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{stats?.stock_status?.critique || 0}</div>
                            <div className="stat-label">Critique</div>
                        </div>
                    </div>
                    <div className="stat-card stat-red">
                        <div className="stat-icon-badge" aria-hidden><PackageX size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{stats?.stock_status?.rupture || 0}</div>
                            <div className="stat-label">Rupture</div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-columns">
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>
                                <span className="card-header-icon card-header-icon--warning"><TriangleAlert size={17} strokeWidth={2} /></span>
                                Alertes Stock
                            </h3>
                            <Link to="/low-stock" className="card-link">Voir toutes les alertes</Link>
                        </div>
                        <div className="card-content">
                            {stats?.low_stock_items?.length === 0 ? (
                                <div className="empty-state-small">Aucun article en alerte</div>
                            ) : (
                                <div className="alert-list">
                                    {stats?.low_stock_items?.map(item => (
                                        <div key={item.id} className={alertItemClass(item.status)}>
                                            <div className="alert-info">
                                                <span className="alert-name">{item.name}</span>
                                                <span className="alert-ref">{item.reference}</span>
                                            </div>
                                            <div className="alert-stock">
                                                <span className="stock-value">
                                                    {item.stock_quantity} / {item.threshold} {item.unit}
                                                </span>
                                                {getStatusBadge(item.status)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>
                                <span className="card-header-icon card-header-icon--primary"><Activity size={17} strokeWidth={2} /></span>
                                Activité Récente
                            </h3>
                            <Link to="/movements" className="card-link">Voir tout l'historique</Link>
                        </div>
                        <div className="card-content">
                            {stats?.recent_movements?.length === 0 ? (
                                <div className="empty-state-small">Aucune activité récente</div>
                            ) : (
                                <div className="activity-list">
                                    {stats?.recent_movements?.map(movement => (
                                        <div key={movement.id} className="activity-item">
                                            <span className={`activity-move-icon ${movement.type === 'in' ? 'activity-move-icon--in' : 'activity-move-icon--out'}`}>
                                                {movement.type === 'in'
                                                    ? <ArrowDownToLine size={18} strokeWidth={2} />
                                                    : <ArrowUpFromLine size={18} strokeWidth={2} />}
                                            </span>
                                            <div className="activity-details">
                                                <span className="activity-name">{movement.consumable_name}</span>
                                                <span className="activity-meta">
                                                    {getMovementLabel(movement.type)} — {movement.quantity > 0 ? '+' : ''}{movement.quantity} unités
                                                </span>
                                            </div>
                                            <span className="activity-time">{formatRelativeTime(movement.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="dashboard-subsection-title">
                                <Ticket size={16} strokeWidth={2} />
                                Demandes récentes
                            </div>
                            {!stats?.recent_tickets?.length ? (
                                <div className="empty-state-small" style={{ marginTop: 8 }}>Aucune demande récente</div>
                            ) : (
                                <div className="activity-list activity-list--tickets">
                                    {stats.recent_tickets.map(tk => (
                                        <Link key={tk.id} to={`/admin/tickets?search=${encodeURIComponent(tk.reference)}`} className="activity-item activity-item--ticket">
                                            <span className="activity-move-icon activity-move-icon--ticket">
                                                <Ticket size={18} strokeWidth={2} />
                                            </span>
                                            <div className="activity-details">
                                                <span className="activity-name">{tk.reference}</span>
                                                <span className="activity-meta">{tk.user_name} — {tk.status}</span>
                                            </div>
                                            <span className="activity-time">{formatRelativeTime(tk.created_at)}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="dashboard-section">
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>
                                <span className="card-header-icon card-header-icon--slate"><FileText size={17} strokeWidth={2} /></span>
                                Dernières Décharges
                            </h3>
                            <Link to="/discharges" className="card-link">Voir toutes les décharges</Link>
                        </div>
                        <div className="card-content">
                            {stats?.recent_discharges?.length === 0 ? (
                                <div className="empty-state-small">Aucune décharge récente</div>
                            ) : (
                                <div className="discharge-table">
                                    {stats?.recent_discharges?.map(discharge => (
                                        <div key={discharge.id} className="discharge-row">
                                            <div className="discharge-row-main">
                                                <span className="discharge-ref">{discharge.reference}</span>
                                                <span className="discharge-recipient">{discharge.recipient}</span>
                                            </div>
                                            <div className="discharge-row-meta">
                                                <span className="discharge-count">{discharge.items_count} article(s)</span>
                                                <span className="discharge-date">{formatRelativeTime(discharge.created_at)}</span>
                                                <button
                                                    type="button"
                                                    className="btn-icon"
                                                    onClick={() => handleDownloadDischargePdf(discharge)}
                                                    title="Télécharger PDF"
                                                >
                                                    <FileDown size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="dashboard-section">
                    <div className="dashboard-card">
                        <div className="card-header">
                            <h3>
                                <span className="card-header-icon card-header-icon--export"><Database size={17} strokeWidth={2} /></span>
                                Export des Données
                            </h3>
                        </div>
                        <div className="card-content">
                            <div className="export-buttons">
                                <button type="button" onClick={handleDownloadDatabase} className="btn-success export-btn">
                                    <Database size={20} strokeWidth={1.85} className="export-icon-svg" />
                                    <span>Sauvegarder la BD</span>
                                </button>
                                <button type="button" onClick={handleExportCSV} className="btn-success export-btn">
                                    <FileSpreadsheet size={20} strokeWidth={1.85} className="export-icon-svg" />
                                    <span>Exporter en CSV</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
