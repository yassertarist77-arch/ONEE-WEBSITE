import { useState, useEffect } from 'react';
import consumableService from '../services/consumableService';
import { Pencil, Trash2, PlusCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Layout from '../components/Layout';

export default function CatalogPage() {
    const [consumables, setConsumables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingConsumable, setEditingConsumable] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        reference: '',
        stock_quantity: 0,
        threshold: 5,
        unit: 'pièce'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        fetchConsumables();
    }, [search, selectedStatus]);

    const fetchConsumables = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                page,
                search,
                status: selectedStatus || undefined
            };
            
            const response = await consumableService.getAll(params);
            setConsumables(response.data.data.data);
            setPagination(response.data.data);
        } catch (err) {
            setError('Erreur lors du chargement des consommables');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (editingConsumable) {
                await consumableService.update(editingConsumable.id, formData);
                setSuccess('Consommable mis à jour avec succès');
            } else {
                await consumableService.create(formData);
                setSuccess('Consommable créé avec succès');
            }
            
            closeModal();
            fetchConsumables();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'opération');
        }
    };

    const handleEdit = (consumable) => {
        setEditingConsumable(consumable);
        setFormData({
            name: consumable.name,
            reference: consumable.reference,
            stock_quantity: consumable.stock_quantity,
            threshold: consumable.threshold,
            unit: consumable.unit || 'pièce'
        });
        setShowModal(true);
    };

    const handleDelete = async (consumable) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le consommable "${consumable.name}"?`)) {
            return;
        }

        try {
            await consumableService.delete(consumable.id);
            setSuccess('Consommable supprimé avec succès');
            fetchConsumables();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la suppression');
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingConsumable(null);
        setFormData({
            name: '',
            reference: '',
            stock_quantity: 0,
            threshold: 5,
            unit: 'pièce'
        });
        setError('');
        setSuccess('');
    };

    const getStockStatusBadge = (consumable) => {
        if (consumable.stock_quantity <= 0) {
            return <span className="badge badge-danger">Rupture</span>;
        } else if (consumable.stock_quantity < consumable.threshold) {
            return <span className="badge badge-warning">Critique</span>;
        } else {
            return <span className="badge badge-success">En stock</span>;
        }
    };


    if (loading && consumables.length === 0) {
        return (
            <Layout>
                <div className="loading">Chargement...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-shell">
            <h1>Catalogue des Consommables</h1>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="filters-section">
                <div className="filters-row">
                    <div className="filter-group">
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou référence..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    

                    <div className="filter-group">
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="filter-select"
                        >
                            <option value="">Tous les statuts</option>
                            <option value="en_stock">En stock</option>
                            <option value="critique">Critique</option>
                            <option value="rupture">Rupture</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => setShowModal(true)}
                        className="btn btn-premium"
                    >
                        <PlusCircle size={20} strokeWidth={2.5} />
                        Ajouter un consommable
                    </button>
                </div>
            </div>

            {loading && (
                <div className="loading-indicator" style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '14px' }}>
                    Actualisation...
                </div>
            )}
            {consumables.length === 0 ? (
                <div className="empty-state">Aucun consommable trouvé</div>
            ) : (
                <div className="table-container" style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Désignation</th>
                                <th>Stock</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {consumables.map((consumable) => (
                                <tr key={consumable.id}>
                                    <td className="reference-cell">{consumable.reference}</td>
                                    <td>{consumable.name}</td>
                                    <td className="stock-cell">
                                        {consumable.stock_quantity} {consumable.unit}
                                    </td>
                                    <td>{getStockStatusBadge(consumable)}</td>
                                    <td style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => handleEdit(consumable)}
                                            className="btn-icon"
                                            title="Modifier"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(consumable)}
                                            className="btn-icon danger-hover"
                                            disabled={consumable.stock_quantity > 0}
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {pagination.last_page > 1 && (
                        <div className="pagination">
                            <button 
                                onClick={() => fetchConsumables(pagination.current_page - 1)}
                                disabled={!pagination.prev_page_url}
                                className="btn btn-premium"
                                style={{ padding: '8px 16px', borderRadius: '8px' }}
                            >
                                <ChevronLeft size={18} strokeWidth={2.5} /> Précédent
                            </button>
                            <span className="page-info">
                                Page {pagination.current_page} sur {pagination.last_page}
                            </span>
                            <button 
                                onClick={() => fetchConsumables(pagination.current_page + 1)}
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

            {showModal && (
                <div className="modal-overlay" role="presentation">
                    <div className="modal" role="dialog" aria-modal="true">
                        <div className="modal-header-row">
                            <h2>{editingConsumable ? 'Modifier le consommable' : 'Ajouter un consommable'}</h2>
                            <button type="button" className="btn-icon" onClick={closeModal} aria-label="Fermer">
                                <X size={20} />
                            </button>
                        </div>
                        
                        {error && <div className="error-message">{error}</div>}
                        
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Désignation *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Référence *</label>
                                <input
                                    type="text"
                                    value={formData.reference}
                                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                    required
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Quantité en stock *</label>
                                    <input
                                        type="number"
                                        value={formData.stock_quantity}
                                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        required
                                        className="form-input"
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label>Seuil d'alerte *</label>
                                    <input
                                        type="number"
                                        value={formData.threshold}
                                        onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                                        min="0"
                                        required
                                        className="form-input"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>Unité</label>
                                <input
                                    type="text"
                                    value={formData.unit}
                                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="button" onClick={closeModal} className="btn-ghost">
                                    Annuler
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingConsumable ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}
