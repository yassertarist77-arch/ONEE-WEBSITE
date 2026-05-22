import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import './UserCatalogPage.css';

/** Same stock bands as admin catalogue (ConsumableController + CatalogPage). */
function stockStatusKey(stock, threshold) {
    const t = threshold ?? 0;
    if (stock <= 0) return 'rupture';
    if (stock > 0 && stock < t) return 'critique';
    return 'en_stock';
}

const STATUS = {
    en_stock: { label: 'En stock', icon: CheckCircle, cls: 'ucat-badge--high' },
    critique: { label: 'Critique', icon: AlertTriangle, cls: 'ucat-badge--low' },
    rupture: { label: 'Rupture', icon: XCircle, cls: 'ucat-badge--out' },
};

export default function UserCatalogPage() {
    const navigate = useNavigate();
    const { getConsumables } = useUserAuth();
    const [consumables, setConsumables] = useState([]);
    const [pagination, setPagination] = useState({});
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const fetchConsumables = useCallback(
        async (page = 1) => {
            try {
                setLoading(true);
                setError('');
                const params = {
                    page,
                    per_page: 15,
                    active_only: 1,
                    search: search.trim() || undefined,
                    status: selectedStatus || undefined,
                };
                const res = await getConsumables(params);
                const payload = res.data?.data;
                setConsumables(Array.isArray(payload?.data) ? payload.data : []);
                setPagination(payload && typeof payload === 'object' ? payload : {});
            } catch {
                setError('Impossible de charger le catalogue.');
                setConsumables([]);
            } finally {
                setLoading(false);
            }
        },
        [getConsumables, search, selectedStatus]
    );

    useEffect(() => {
        fetchConsumables(1);
    }, [fetchConsumables]);

    const stats = {
        inStock: consumables.filter(c => stockStatusKey(c.stock_quantity, c.threshold) === 'en_stock').length,
        limited: consumables.filter(c => stockStatusKey(c.stock_quantity, c.threshold) === 'critique').length,
        out: consumables.filter(c => stockStatusKey(c.stock_quantity, c.threshold) === 'rupture').length,
    };

    const goRequest = id => {
        navigate(`/user/request?add=${id}`);
    };

    return (
        <div className="ucat-root">
            <div className="ucat-header">
                <div>
                    <h1 className="ucat-title">Catalogue des Consommables</h1>
                    <p className="ucat-subtitle">
                        Même inventaire que l&apos;administration — articles actifs uniquement.
                    </p>
                </div>
            </div>

            <div className="ucat-stats ucat-stats--page">
                <div className="ucat-stat">
                    <Package size={16} className="ucat-stat-icon" />
                    <span className="ucat-stat-num">{pagination.total ?? consumables.length}</span>
                    <span className="ucat-stat-lbl">Articles (filtre actuel)</span>
                </div>
                <div className="ucat-stat ucat-stat--high">
                    <CheckCircle size={16} />
                    <span className="ucat-stat-num">{stats.inStock}</span>
                    <span className="ucat-stat-lbl">En stock (page)</span>
                </div>
                <div className="ucat-stat ucat-stat--low">
                    <AlertTriangle size={16} />
                    <span className="ucat-stat-num">{stats.limited}</span>
                    <span className="ucat-stat-lbl">Critique (page)</span>
                </div>
                <div className="ucat-stat ucat-stat--out">
                    <XCircle size={16} />
                    <span className="ucat-stat-num">{stats.out}</span>
                    <span className="ucat-stat-lbl">Rupture (page)</span>
                </div>
            </div>

            <div className="ucat-filters">
                <div className="ucat-search-wrap ucat-search-wrap--grow">
                    <Search size={16} className="ucat-search-icon" />
                    <input
                        id="user-catalog-search"
                        type="text"
                        className="ucat-search"
                        placeholder="Rechercher par nom ou référence…"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                    />
                    {searchInput && (
                        <button type="button" className="ucat-clear" onClick={() => { setSearchInput(''); setSearch(''); }}>
                            ✕
                        </button>
                    )}
                </div>
                <select
                    className="ucat-filter-select"
                    value={selectedStatus}
                    onChange={e => setSelectedStatus(e.target.value)}
                    aria-label="Statut stock"
                >
                    <option value="">Tous les statuts</option>
                    <option value="en_stock">En stock</option>
                    <option value="critique">Critique</option>
                    <option value="rupture">Rupture</option>
                </select>
            </div>

            {loading && consumables.length === 0 ? (
                <div className="ucat-loading">
                    <span className="ucat-spinner" />
                    Chargement du catalogue…
                </div>
            ) : error ? (
                <div className="ucat-error">{error}</div>
            ) : (
                <>
                    {loading && (
                        <div className="ucat-loading-indicator" style={{ textAlign: 'center', padding: '15px', color: '#64748b', fontSize: '14px' }}>
                            <span className="ucat-spinner" style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }} />
                            Actualisation...
                        </div>
                    )}
                    {consumables.length === 0 ? (
                        <div className="ucat-empty">
                            <Package size={40} className="ucat-empty-icon" />
                            <p>Aucun consommable trouvé</p>
                        </div>
                    ) : (
                        <div className="ucat-table-wrap" style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                    <table className="ucat-table">
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Désignation</th>
                                <th>Stock</th>
                                <th>Statut</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consumables.map(item => {
                                const key = stockStatusKey(item.stock_quantity, item.threshold);
                                const { label, icon: Icon, cls } = STATUS[key];
                                const isOut = key === 'rupture';
                                const unit = item.unit || 'pièce';
                                return (
                                    <tr key={item.id} className="ucat-row">
                                        <td className="ucat-ref-cell">{item.reference}</td>
                                        <td>
                                            <div className="ucat-item-name">{item.name}</div>
                                            {item.description && (
                                                <div className="ucat-item-desc">{item.description}</div>
                                            )}
                                        </td>
                                        <td className="ucat-stock-cell">
                                            {item.stock_quantity} {unit}
                                        </td>
                                        <td>
                                            <span className={`ucat-badge ${cls}`}>
                                                <Icon size={12} />
                                                {label}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={`ucat-ask-btn ${isOut ? 'ucat-ask-btn--disabled' : ''}`}
                                                disabled={isOut}
                                                title={
                                                    isOut
                                                        ? 'Article en rupture de stock'
                                                        : 'Ouvrir une demande rapide pour cet article'
                                                }
                                                onClick={() => !isOut && goRequest(item.id)}
                                            >
                                                {isOut ? 'Indisponible' : 'Demander'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="ucat-footer ucat-footer--split">
                        <span>
                            Page {pagination.current_page ?? 1} sur {pagination.last_page ?? 1} —{' '}
                            {pagination.total ?? consumables.length} article(s) au total
                        </span>
                        {pagination.last_page > 1 && (
                            <div className="ucat-pager">
                                <button
                                    type="button"
                                    className="ucat-pager-btn"
                                    disabled={!pagination.prev_page_url}
                                    onClick={() => fetchConsumables((pagination.current_page ?? 1) - 1)}
                                >
                                    Précédent
                                </button>
                                <button
                                    type="button"
                                    className="ucat-pager-btn"
                                    disabled={!pagination.next_page_url}
                                    onClick={() => fetchConsumables((pagination.current_page ?? 1) + 1)}
                                >
                                    Suivant
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                )}
                </>
            )}
        </div>
    );
}
