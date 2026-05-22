import { useState, useEffect } from 'react';
import { ScrollText, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight } from 'lucide-react';
import stockService from '../services/stockService';
import consumableService from '../services/consumableService';
import Layout from '../components/Layout';

export default function MovementHistoryPage() {
    const [movements, setMovements] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        type: 'all',
        consumable_id: '',
        date_from: '',
        date_to: '',
        search: ''
    });
    const [meta, setMeta] = useState({ total_in: 0, total_out: 0 });
    const [pagination, setPagination] = useState({});
    const [error, setError] = useState('');

    useEffect(() => {
        fetchConsumables();
        fetchMovements();
    }, []);

    const fetchConsumables = async () => {
        try {
            const response = await consumableService.getAll({ per_page: 1000 });
            setConsumables(response.data.data.data);
        } catch (err) {
            console.error('Error fetching consumables:', err);
        }
    };

    const fetchMovements = async (page = 1, filterParams = filters) => {
        try {
            setLoading(true);
            setError('');
            
            const params = {
                page,
                ...filterParams
            };
            
            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key] || params[key] === '') {
                    delete params[key];
                }
            });
            
            const response = await stockService.getHistory(params);
            setMovements(response.data.data.data);
            setPagination(response.data.data);
            setMeta(response.data.meta);
        } catch (err) {
            setError('Erreur lors du chargement de l\'historique');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleApplyFilters = () => {
        fetchMovements(1, filters);
    };

    const handleResetFilters = () => {
        const reset = { type: 'all', consumable_id: '', date_from: '', date_to: '', search: '' };
        setFilters(reset);
        fetchMovements(1, reset);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getMovementBadge = (type) => {
        if (type === 'in') {
            return <span className="badge badge-success">Entrée</span>;
        }
        return <span className="badge badge-danger">Sortie</span>;
    };

    const getQuantityDisplay = (quantity) => {
        const isPositive = quantity > 0;
        return (
            <span className={isPositive ? 'quantity-positive' : 'quantity-negative'}>
                {isPositive ? '+' : ''}{quantity}
            </span>
        );
    };

    return (
        <Layout>
            <div className="page-shell stock-entry-page">
                <div className="page-header">
                    <h1>Historique des Mouvements de Stock</h1>
                    <p className="subtitle">Traçabilité complète des entrées et sorties</p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {/* Summary Cards */}
                <div className="stats-grid stats-grid--3" style={{ marginBottom: '24px' }}>
                    <div className="stat-card stat-blue">
                        <div className="stat-icon-badge" aria-hidden><ScrollText size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{pagination.total || 0}</div>
                            <div className="stat-label">Total Mouvements</div>
                        </div>
                    </div>
                    <div className="stat-card stat-green">
                        <div className="stat-icon-badge" aria-hidden><ArrowDownToLine size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{meta.total_in || 0}</div>
                            <div className="stat-label">Total Entrées</div>
                        </div>
                    </div>
                    <div className="stat-card stat-red">
                        <div className="stat-icon-badge" aria-hidden><ArrowUpFromLine size={24} strokeWidth={1.85} /></div>
                        <div className="stat-body">
                            <div className="stat-number">{meta.total_out || 0}</div>
                            <div className="stat-label">Total Sorties</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Type</label>
                            <select
                                value={filters.type}
                                onChange={(e) => handleFilterChange('type', e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">Tous</option>
                                <option value="in">Entrées</option>
                                <option value="out">Sorties</option>
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label>Consommable</label>
                            <select
                                value={filters.consumable_id}
                                onChange={(e) => handleFilterChange('consumable_id', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">Tous</option>
                                {consumables.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="filter-group">
                            <label>Du</label>
                            <input
                                type="date"
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                                className="filter-select"
                            />
                        </div>
                        
                        <div className="filter-group">
                            <label>Au</label>
                            <input
                                type="date"
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                                className="filter-select"
                            />
                        </div>
                        
                        <div className="filter-group">
                            <label>Rechercher</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                placeholder="Nom ou référence..."
                                className="search-input"
                            />
                        </div>
                    </div>
                    <div className="filters-row" style={{ marginTop: '16px', gap: '12px' }}>
                        <button onClick={handleApplyFilters} className="btn btn-premium">
                            Appliquer les filtres
                        </button>
                        <button onClick={handleResetFilters} className="btn btn-secondary-premium">
                            Réinitialiser
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="loading">Chargement...</div>
                ) : movements.length === 0 ? (
                    <div className="empty-state">Aucun mouvement trouvé</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Consommable</th>
                                    <th>Quantité</th>
                                    <th>Bénéficiaire</th>
                                    <th>Entité</th>
                                    <th>Ville</th>
                                    <th>Référence</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map(movement => (
                                    <tr key={movement.id}>
                                        <td>{formatDate(movement.created_at)}</td>
                                        <td>{getMovementBadge(movement.type)}</td>
                                        <td>{movement.consumable?.name || 'N/A'}</td>
                                        <td>{getQuantityDisplay(movement.quantity)}</td>
                                        <td>{movement.type === 'out' ? (movement.recipient || '-') : '-'}</td>
                                        <td>{movement.entity || '-'}</td>
                                        <td>{movement.ville || '-'}</td>
                                        <td className="reference-cell">{movement.reference || '-'}</td>
                                        <td>{movement.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {pagination.last_page > 1 && (
                            <div className="pagination">
                                <button 
                                    onClick={() => fetchMovements(pagination.current_page - 1)}
                                    disabled={!pagination.prev_page_url}
                                    className="btn btn-premium"
                                    style={{ padding: '8px 16px', borderRadius: '8px' }}
                                >
                                    <ChevronLeft size={18} strokeWidth={2.5} /> Précédent
                                </button>
                                <span className="page-info">
                                    {pagination.from} - {pagination.to} sur {pagination.total} mouvements
                                </span>
                                <button 
                                    onClick={() => fetchMovements(pagination.current_page + 1)}
                                    disabled={!pagination.next_page_url}
                                    className="btn btn-premium"
                                    style={{ padding: '8px 16px', borderRadius: '8px' }}
                                >
                                    Suivant <ChevronRight size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
