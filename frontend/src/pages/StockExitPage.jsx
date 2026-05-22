import { useState, useEffect } from 'react';
import consumableService from '../services/consumableService';
import { PlusCircle, Trash2, Check, Download, X, ChevronDown } from 'lucide-react';
import stockService from '../services/stockService';
import apiClient from '../api/axios';
import Layout from '../components/Layout';

export default function StockExitPage() {
    const [consumables, setConsumables] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedConsumable, setSelectedConsumable] = useState(null);
    const [showConsumableDropdown, setShowConsumableDropdown] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [dischargeResult, setDischargeResult] = useState(null);
    const [pdfDownloadError, setPdfDownloadError] = useState('');

    useEffect(() => {
        fetchConsumables();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await apiClient.get('/admin/manage-users');
            setUsers(response.data.data);
        } catch (err) {
            console.error('Failed to load users');
        }
    };

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

    const availableConsumables = consumables.filter(c => c.stock_quantity > 0);

    const filteredConsumables = availableConsumables.filter(consumable => {
        const searchLower = searchTerm.toLowerCase();
        return (
            consumable.name.toLowerCase().includes(searchLower) ||
            consumable.reference.toLowerCase().includes(searchLower)
        );
    }).filter(consumable => {
        return !selectedItems.find(item => item.consumable_id === consumable.id);
    });

    const handleAddItem = () => {
        if (!selectedConsumable) {
            setError('Veuillez sélectionner un consommable');
            return;
        }

        const consumable = selectedConsumable;

        if (quantity > consumable.stock_quantity) {
            setError(`Stock insuffisant. Disponible: ${consumable.stock_quantity}`);
            return;
        }

        const newItem = {
            consumable_id: consumable.id,
            name: consumable.name,
            reference: consumable.reference,
            current_stock: consumable.stock_quantity,
            quantity: parseInt(quantity)
        };

        setSelectedItems([...selectedItems, newItem]);
        setSelectedConsumable(null);
        setSearchTerm('');
        setQuantity(1);
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

        if (!selectedUser) {
            setError('Veuillez sélectionner le bénéficiaire');
            return;
        }

        const items = selectedItems.map(item => ({
            consumable_id: item.consumable_id,
            quantity: item.quantity
        }));

        const payload = {
            user_id: selectedUser.id,
            items,
            notes: notes.trim() || null
        };

        try {
            setSubmitting(true);
            setError('');
            
            const response = await stockService.removeStock(payload);

            setDischargeResult(response.data.data);
            setPdfDownloadError('');
            setSuccess(response.data.message);
            setShowSuccessModal(true);
            
            // Clear form after success
            setSelectedItems([]);
            setSelectedUser(null);
            setUserSearchTerm('');
            setNotes('');
            
            // Refresh consumables
            fetchConsumables();
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la sortie de stock');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmSubmit = () => {
        const userName = selectedUser ? selectedUser.name : 'le bénéficiaire sélectionné';
        if (!window.confirm(
            `Confirmer la sortie de stock pour ${selectedItems.length} article(s) vers ${userName}?`
        )) {
            return;
        }
        handleSubmit();
    };

    const handleDownloadPDF = async () => {
        const dischargeId = dischargeResult?.discharge_id ?? dischargeResult?.id;
        if (!dischargeId) {
            setPdfDownloadError('Erreur lors du téléchargement du PDF');
            return;
        }

        setPdfDownloadError('');
        try {
            const response = await apiClient.get(`/discharges/${dischargeId}/download`, {
                responseType: 'blob',
            });

            const blob = response.data instanceof Blob
                ? response.data
                : new Blob([response.data], { type: 'application/pdf' });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const ref = dischargeResult.discharge_reference || 'decharge';
            link.setAttribute('download', `${ref}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setPdfDownloadError('Erreur lors du téléchargement du PDF');
        }
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
                    <h1>Sortie de Stock</h1>
                    <p className="subtitle">Retirez du stock et générez une décharge</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && !showSuccessModal && <div className="success-message">{success}</div>}

                <div className="stock-entry-form">
                    <div className="reference-section">
                        <label className="form-label">Bénéficiaire *</label>
                        <div className="search-select-container">
                            <div className="search-select-input-wrap">
                                <input
                                    type="text"
                                    className="search-select-input"
                                    placeholder="Rechercher un agent (nom ou matricule)..."
                                    value={userSearchTerm}
                                    onChange={(e) => {
                                        setUserSearchTerm(e.target.value);
                                        setShowUserDropdown(true);
                                        if (selectedUser) setSelectedUser(null);
                                    }}
                                    onFocus={() => setShowUserDropdown(true)}
                                />
                                {selectedUser && (
                                    <div className="search-select-badge">
                                        <Check size={14} color="#10b981" /> {selectedUser.matricule || 'Agent'}
                                    </div>
                                )}
                                <button 
                                    type="button"
                                    className="search-select-toggle"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowUserDropdown(!showUserDropdown);
                                    }}
                                >
                                    <ChevronDown size={18} />
                                </button>
                            </div>

                            {showUserDropdown && (
                                <div className="search-select-results">
                                    {users.filter(u => 
                                        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                                        (u.matricule && u.matricule.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                    ).length === 0 ? (
                                        <div className="search-not-found" style={{ padding: '10px', fontSize: '13px', color: '#64748b' }}>
                                            {userSearchTerm ? `Aucun agent trouvé pour "${userSearchTerm}"` : 'Aucun agent disponible'}
                                        </div>
                                    ) : (
                                        users.filter(u => 
                                            u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                                            (u.matricule && u.matricule.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                        ).map(u => (
                                            <div 
                                                key={u.id} 
                                                className="search-result-item"
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setUserSearchTerm(u.name);
                                                    setShowUserDropdown(false);
                                                }}
                                            >
                                                <span className="search-result-name">{u.name}</span>
                                                <span className="search-result-sub">{u.matricule || 'Sans matricule'}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="item-selector">
                        <h3>Ajouter des articles</h3>
                        
                        <div className="selector-row" style={{ alignItems: 'flex-start' }}>
                            <div className="selector-group" style={{ flex: 3 }}>
                                <label>Choisir un consommable</label>
                                <div className="search-select-container">
                                    <div className="search-select-input-wrap">
                                        <input
                                            type="text"
                                            className="search-select-input"
                                            placeholder="Tapez pour rechercher..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setShowConsumableDropdown(true);
                                                if (selectedConsumable) setSelectedConsumable(null);
                                            }}
                                            onFocus={() => setShowConsumableDropdown(true)}
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
                                                setShowConsumableDropdown(!showConsumableDropdown);
                                            }}
                                        >
                                            <ChevronDown size={18} />
                                        </button>
                                    </div>

                                    {showConsumableDropdown && (
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
                                                            setShowConsumableDropdown(false);
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
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        const consumable = selectedConsumable;
                                        if (consumable && val > consumable.stock_quantity) {
                                            setQuantity(consumable.stock_quantity);
                                        } else {
                                            setQuantity(Math.max(1, val));
                                        }
                                    }}
                                    min="1"
                                    className="quantity-input"
                                    disabled={!selectedConsumable}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleAddItem}
                            className="btn btn-premium"
                            disabled={!selectedConsumable}
                            style={{ height: 'fit-content', marginTop: 'auto' }}
                        >
                            <PlusCircle size={20} strokeWidth={2.5} />
                            Ajouter
                        </button>
                    </div>

                    <div className="selected-items-section">
                        <h3>Articles à retirer</h3>
                        
                        {selectedItems.length === 0 ? (
                            <div className="empty-state">
                                Aucun article. Sélectionnez des articles ci-dessus.
                            </div>
                        ) : (
                            <div className="items-table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Article</th>
                                            <th>Référence</th>
                                            <th>Stock actuel</th>
                                            <th>Quantité à retirer</th>
                                            <th>Nouveau stock</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedItems.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name}</td>
                                                <td className="reference-cell">{item.reference}</td>
                                                <td className="stock-cell">{item.current_stock}</td>
                                                <td className="quantity-cell">-{item.quantity}</td>
                                                <td className="new-stock-cell">
                                                    <span className="arrow">→</span>
                                                    <span className="new-stock">{item.current_stock - item.quantity}</span>
                                                </td>
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

                    <div className="notes-section-form">
                        <label className="form-label">Motif ou commentaire (optionnel)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes sur cette sortie de stock..."
                            className="notes-textarea"
                            rows="3"
                        />
                    </div>

                    {selectedItems.length > 0 && (
                        <div className="submit-section">
                            <div className="summary">
                                <span className="summary-count">
                                    {selectedItems.length} article(s) - Bénéficiaire: {selectedUser ? selectedUser.name : 'Non spécifié'}
                                </span>
                            </div>
                            <button 
                                onClick={handleConfirmSubmit}
                                className="btn btn-premium"
                                disabled={submitting || !selectedUser}
                                style={{ padding: '12px 32px' }}
                            >
                                <Check size={20} strokeWidth={2.5} />
                                {submitting ? 'Traitement...' : 'Valider la sortie et générer la décharge'}
                            </button>
                        </div>
                    )}
                </div>

                {showSuccessModal && dischargeResult && (
                    <div className="summary-modal" role="presentation">
                        <div className="modal" role="dialog" aria-modal="true">
                            <div className="modal-header-row">
                                <h3>Sortie de stock validée</h3>
                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        setSuccess('');
                                        setDischargeResult(null);
                                        setPdfDownloadError('');
                                    }}
                                    aria-label="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            {pdfDownloadError && (
                                <div className="error-message" role="alert">{pdfDownloadError}</div>
                            )}
                            <div className="summary-content">
                                <p className="success-text">{success}</p>
                                
                                <div className="discharge-info">
                                    <div className="info-row">
                                        <span className="info-label">Référence :</span>
                                        <span className="info-value highlight">{dischargeResult.discharge_reference}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Bénéficiaire :</span>
                                        <span className="info-value">{dischargeResult.recipient}</span>
                                    </div>
                                </div>
                                
                                <div className="updated-items">
                                    {dischargeResult.updated_consumables.map((item, index) => (
                                        <div key={index} className="updated-item">
                                            <span className="item-name">{item.name}</span>
                                            <span className="stock-change">
                                                {item.stock_before} → {item.stock_after}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="form-actions">
                                <button 
                                    onClick={handleDownloadPDF}
                                    className="btn-success"
                                >
                                    <Download size={18} /> Télécharger la décharge
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        setSuccess('');
                                        setDischargeResult(null);
                                        setPdfDownloadError('');
                                    }}
                                    className="btn-ghost"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
