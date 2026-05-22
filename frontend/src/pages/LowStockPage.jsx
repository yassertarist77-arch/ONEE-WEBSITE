import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TriangleAlert, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import Layout from '../components/Layout';

export default function LowStockPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [meta, setMeta] = useState({ total_alerts: 0, rupture: 0, critique: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        fetchLowStock();
    }, []);

    const fetchLowStock = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/v1/stock/low-stock', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();
            setItems(data.data || []);
            setMeta(data.meta || { total_alerts: 0, rupture: 0, critique: 0 });
        } catch (err) {
            setError('Erreur lors du chargement des alertes');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'rupture') {
            return <span className="badge badge-danger">Rupture</span>;
        }
        return <span className="badge badge-warning">Critique</span>;
    };

    const getProgressColor = (progress) => {
        if (progress <= 0) return '#ef4444';
        if (progress <= 25) return '#f59e0b';
        if (progress <= 50) return '#eab308';
        return '#22c55e';
    };

    const handleAddStock = (item) => {
        navigate('/stock-entry');
    };

    const handleRemoveStock = (item) => {
        navigate('/stock-exit');
    };

    if (loading) {
        return (
            <Layout>
                <div className="loading">Chargement...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-shell stock-entry-page">
                <div className="page-header">
                    <h1>Alertes Stock</h1>
                    <p className="subtitle">Articles en rupture ou en dessous du seuil critique</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Summary Cards */}
                <div className="stats-grid stats-grid--3">
                    <div className="stat-card stat-blue">
                        <div className="stat-icon-badge" aria-hidden><TriangleAlert size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{meta.total_alerts}</div>
                            <div className="stat-label">Total Alertes</div>
                        </div>
                    </div>
                    <div className="stat-card stat-red">
                        <div className="stat-icon-badge" aria-hidden><TriangleAlert size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{meta.rupture}</div>
                            <div className="stat-label">Rupture</div>
                        </div>
                    </div>
                    <div className="stat-card stat-orange">
                        <div className="stat-icon-badge" aria-hidden><TriangleAlert size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{meta.critique}</div>
                            <div className="stat-label">Critique</div>
                        </div>
                    </div>
                </div>

                {items.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon" aria-hidden>
                            <TriangleAlert size={44} strokeWidth={1.5} />
                        </div>
                        <div>Tous les stocks sont à un niveau satisfaisant.</div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Reference</th>
                                    <th>Article</th>
                                    <th>Stock Actuel</th>
                                    <th>Seuil</th>
                                    <th>Progression</th>
                                    <th>Statut</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td className="reference-cell">{item.reference}</td>
                                        <td>{item.name}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                            {item.stock_quantity} {item.unit}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {item.threshold} {item.unit}
                                        </td>
                                        <td style={{ width: '160px' }}>
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill"
                                                    style={{ 
                                                        width: `${Math.max(0, item.progress)}%`,
                                                        background: getProgressColor(item.progress)
                                                    }}
                                                />
                                                <span className="progress-text">{item.progress}%</span>
                                            </div>
                                        </td>
                                        <td>{getStatusBadge(item.status)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleAddStock(item)}
                                                    className="btn-icon"
                                                    title="Ajouter du stock"
                                                >
                                                    <ArrowDownToLine size={16} />
                                                </button>
                                                {item.stock_quantity > 0 && (
                                                    <button 
                                                        onClick={() => handleRemoveStock(item)}
                                                        className="btn-icon danger-hover"
                                                        title="Sortir du stock"
                                                    >
                                                        <ArrowUpFromLine size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </Layout>
    );
}
