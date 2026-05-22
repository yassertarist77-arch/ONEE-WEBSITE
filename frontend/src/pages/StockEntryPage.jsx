import { useState, useEffect, useRef } from 'react';
import consumableService from '../services/consumableService';
import { PlusCircle, Trash2, Check, X, ChevronDown } from 'lucide-react';
import stockService from '../services/stockService';
import Layout from '../components/Layout';
import { ENTITIES } from '../constants/entities';

export default function StockEntryPage() {
    const [consumables, setConsumables] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConsumable, setSelectedConsumable] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [reference, setReference] = useState('');
    const [entity, setEntity] = useState('');
    const [ville, setVille] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSummary, setShowSummary] = useState(false);

    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchConsumables();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchConsumables = async () => {
        try {
            setLoading(true);
            const response = await consumableService.getAll({ per_page: 1000 });
            setConsumables(response.data.data.data);
        } catch (err) {
            setError('Erreur lors du chargement des consommables');
        } finally {
            setLoading(false);
        }
    };

    const filteredConsumables = consumables.filter(consumable => {
        const searchLower = searchTerm.toLowerCase();
        return (
            consumable.name.toLowerCase().includes(searchLower) ||
            consumable.reference.toLowerCase().includes(searchLower)
        );
    }).filter(consumable => {
        // Exclude already selected items
        return !selectedItems.find(item => item.consumable_id === consumable.id);
    });

    const handleAddItem = () => {
        if (!selectedConsumable || quantity < 1) {
            setError('Veuillez sélectionner un consommable et une quantité valide');
            return;
        }

        const newItem = {
            consumable_id: selectedConsumable.id,
            name: selectedConsumable.name,
            reference: selectedConsumable.reference,
            current_stock: selectedConsumable.stock_quantity,
            quantity: parseInt(quantity),
            notes: notes
        };

        setSelectedItems([...selectedItems, newItem]);
        setSelectedConsumable(null);
        setQuantity(1);
        setNotes('');
        setSearchTerm('');
        setError('');
    };

    const handleRemoveItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            setError('Veuillez ajouter au moins un article');
            return;
        }

        if (!entity || !ville) {
            setError('Veuillez spécifier l\'entité et la ville');
            return;
        }

        const items = selectedItems.map(item => ({
            consumable_id: item.consumable_id,
            quantity: item.quantity,
            notes: item.notes || null
        }));

        try {
            setSubmitting(true);
            setError('');
            
            const response = await stockService.addStock({
                items,
                reference: reference || null,
                entity,
                ville
            });

            setSuccess(response.data.message);
            setShowSummary(true);
            
            // Clear form after success
            setSelectedItems([]);
            setReference('');
            setEntity('');
            setVille('');
            
            // Refresh consumables to show updated stock
            fetchConsumables();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'ajout du stock');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmSubmit = () => {
        if (!window.confirm(`Êtes-vous sûr de vouloir ajouter du stock pour ${selectedItems.length} article(s) ?`)) {
            return;
        }
        handleSubmit();
    };

    const getStockStatus = (currentStock, newStock) => {
        if (newStock <= 0) return 'rupture';
        // We need threshold, but we don't have it in selectedItems
        // For simplicity, we'll just show the numbers
        return 'ok';
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
                    <h1>Entrée de Stock</h1>
                    <p className="subtitle">Ajoutez du stock lors de la réception de livraisons</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                <div className="stock-entry-form">
                    <div className="reference-section">
                        <label className="form-label">Référence (bon de commande / bon de livraison)</label>
                        <input
                            type="text"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                            placeholder="Ex: BL-2024-001"
                            className="reference-input"
                        />
                    </div>
                    
                    <div className="reference-section" style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Entité *</label>
                            <select
                                className="reference-input"
                                value={entity}
                                onChange={(e) => {
                                    setEntity(e.target.value);
                                    setVille('');
                                }}
                                required
                            >
                                <option value="">Sélectionner une entité...</option>
                                {Object.keys(ENTITIES).map(ent => (
                                    <option key={ent} value={ent}>{ent}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="form-label">Ville *</label>
                            <select
                                className="reference-input"
                                value={ville}
                                onChange={(e) => setVille(e.target.value)}
                                required
                                disabled={!entity || !ENTITIES[entity] || ENTITIES[entity].length === 0}
                            >
                                <option value="">Sélectionner une ville...</option>
                                {entity && ENTITIES[entity] && ENTITIES[entity].map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="item-selector">
                        <h3>Ajouter des articles</h3>
                        
                        <div className="selector-row" style={{ alignItems: 'flex-start' }}>
                            <div className="selector-group" style={{ flex: 3 }}>
                                <label>Consommable</label>
                                <div className="search-select-container" ref={dropdownRef}>
                                    <div className="search-select-input-wrap">
                                        <input
                                            type="text"
                                            className="search-select-input"
                                            placeholder="Tapez pour rechercher un consommable..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setShowDropdown(true);
                                                if (selectedConsumable) setSelectedConsumable(null);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                        />
                                        {selectedConsumable && (
                                            <div className="search-select-badge">
                                                <Check size={14} color="#10b981" /> {selectedConsumable.reference}
                                            </div>
                                        )}
                                        <button 
                                            type="button"
                                            className="search-select-toggle"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDropdown(!showDropdown);
                                            }}
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                    </div>

                                    {showDropdown && (
                                        <div className="search-select-results">
                                            {filteredConsumables.length === 0 ? (
                                                <div className="search-not-found" style={{ padding: '10px', fontSize: '13px', color: '#64748b' }}>
                                                    {searchTerm ? `Aucun résultat pour "${searchTerm}"` : 'Aucun consommable disponible'}
                                                </div>
                                            ) : (
                                                filteredConsumables.map(c => (
                                                    <div 
                                                        key={c.id} 
                                                        className="search-result-item"
                                                        onClick={() => {
                                                            setSelectedConsumable(c);
                                                            setSearchTerm(c.name);
                                                            setShowDropdown(false);
                                                        }}
                                                    >
                                                        <span className="search-result-name">{c.name}</span>
                                                        <span className="search-result-sub">{c.reference} • Stock: {c.stock_quantity}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="selector-group quantity-group">
                                <label>Quantité</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    min="1"
                                    className="quantity-input"
                                />
                            </div>
                        </div>

                        <div className="selector-row">
                            <div className="selector-group notes-group">
                                <label>Notes (optionnel)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Notes sur cet article..."
                                    className="notes-input"
                                />
                            </div>
                            
                            <button 
                                onClick={handleAddItem}
                                className="btn btn-premium"
                                disabled={!selectedConsumable}
                                style={{ height: 'fit-content' }}
                            >
                                <PlusCircle size={20} strokeWidth={2.5} />
                                Ajouter
                            </button>
                        </div>
                    </div>

                    <div className="selected-items-section">
                        <h3>Articles à ajouter</h3>
                        
                        {selectedItems.length === 0 ? (
                            <div className="empty-state">
                                Aucun article ajouté. Sélectionnez des articles ci-dessus.
                            </div>
                        ) : (
                            <div className="items-table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Article</th>
                                            <th>Référence</th>
                                            <th>Stock actuel</th>
                                            <th>Quantité à ajouter</th>
                                            <th>Nouveau stock</th>
                                            <th>Notes</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td className="reference-cell">{item.reference}</td>
                                                <td className="stock-cell">{item.current_stock}</td>
                                                <td className="quantity-cell">+{item.quantity}</td>
                                                <td className="new-stock-cell">
                                                    <span className="arrow">→</span>
                                                    <span className="new-stock">{item.current_stock + item.quantity}</span>
                                                </td>
                                                <td>{item.notes || '-'}</td>
                                                <td>
                                                    <button 
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="btn-icon danger-hover"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {selectedItems.length > 0 && (
                        <div className="submit-section">
                            <div className="summary">
                                <span className="summary-count">
                                    {selectedItems.length} article(s) sélectionné(s)
                                </span>
                            </div>
                            <button 
                                onClick={handleConfirmSubmit}
                                className="btn btn-premium"
                                disabled={submitting}
                                style={{ padding: '12px 32px' }}
                            >
                                <Check size={20} strokeWidth={2.5} />
                                {submitting ? 'Traitement...' : 'Valider l\'entrée de stock'}
                            </button>
                        </div>
                    )}
                </div>

                {showSummary && success && (
                    <div className="summary-modal" role="presentation">
                        <div className="modal" role="dialog" aria-modal="true">
                            <div className="modal-header-row">
                                <h3>Résumé de l'entrée de stock</h3>
                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={() => {
                                        setShowSummary(false);
                                        setSuccess('');
                                    }}
                                    aria-label="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="summary-content">
                                <p className="success-text">{success}</p>
                                <div className="updated-items">
                                    {selectedItems.map((item, index) => (
                                        <div key={index} className="updated-item">
                                            <span className="item-name">{item.name}</span>
                                            <span className="stock-change">
                                                {item.current_stock} → {item.current_stock + item.quantity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowSummary(false);
                                    setSuccess('');
                                }}
                                className="btn-ghost"
                                style={{ width: '100%' }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
