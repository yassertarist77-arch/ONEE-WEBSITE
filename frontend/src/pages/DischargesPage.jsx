import { useState, useEffect } from 'react';
import dischargeService from '../services/dischargeService';
import { Download, XCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '../components/Layout';

export default function DischargesPage() {
    const [discharges, setDischarges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDischarge, setSelectedDischarge] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [error, setError] = useState('');
    const [cancelError, setCancelError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [pagination, setPagination] = useState({});
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchDischarges();
    }, [debouncedSearch, dateFrom, dateTo]);

    const fetchDischarges = async (page = 1) => {
        try {
            setLoading(true);
            const params = {
                page,
                search: debouncedSearch || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined
            };
            
            const response = await dischargeService.getAll(params);
            setDischarges(response.data.data.data);
            setPagination(response.data.data);
        } catch (err) {
            setError('Erreur lors du chargement des décharges');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (discharge) => {
        try {
            const response = await dischargeService.downloadPDF(discharge.id);
            
            // Create blob link to download
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

    const handleShowDetail = (discharge) => {
        setSelectedDischarge(discharge);
        setShowDetailModal(true);
    };

    const handleCancel = async (discharge) => {
        if (!window.confirm("Annuler cette décharge ? Le stock sera restauré.")) return;
        try {
            setCancelError('');
            await dischargeService.cancel(discharge.id);
            setSuccessMessage('Décharge annulée. Stock restauré.');
            fetchDischarges(pagination.current_page);
            if (selectedDischarge?.id === discharge.id) {
                setShowDetailModal(false);
            }
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setCancelError(err.response?.data?.message || "Erreur lors de l'annulation");
            setTimeout(() => setCancelError(''), 3000);
        }
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

    if (loading && discharges.length === 0) {
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
                    <h1>Décharges</h1>
                    <p className="subtitle">Historique des décharges de stock</p>
                </div>

                {error && <div className="error-message">{error}</div>}
                {cancelError && <div className="error-message">{cancelError}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                <div className="filters-section">
                    <div className="filters-row">
                        <div className="filter-group">
                            <label>Rechercher</label>
                            <input
                                type="text"
                                placeholder="Référence, nom, matricule..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Du</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="filter-select"
                            />
                        </div>
                        <div className="filter-group">
                            <label>Au</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="filter-select"
                            />
                        </div>
                    </div>
                </div>

                {loading && (
                    <div className="loading-indicator" style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontSize: '14px' }}>
                        Actualisation...
                    </div>
                )}
                {discharges.length === 0 ? (
                    <div className="empty-state">Aucune décharge trouvée</div>
                ) : (
                    <div className="table-container" style={{ opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Référence</th>
                                    <th>Statut</th>
                                    <th>Bénéficiaire</th>
                                    <th>Entité</th>
                                    <th>Ville</th>
                                    <th>Articles (Lignes)</th>
                                    <th>Quantité Totale</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {discharges.map((discharge) => (
                                    <tr 
                                        key={discharge.id} 
                                        onClick={() => handleShowDetail(discharge)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td className="reference-cell">{discharge.reference}</td>
                                        <td>
                                            {discharge.status === 'cancelled' ? (
                                                <span style={{color: '#9ca3af', fontWeight: '500'}}>Annulée</span>
                                            ) : (
                                                <span style={{color: '#10b981', fontWeight: '500'}}>Active</span>
                                            )}
                                        </td>
                                        <td>{discharge.recipient}</td>
                                        <td>{discharge.entity || '—'}</td>
                                        <td>{discharge.ville || '—'}</td>
                                        <td>{discharge.items_count}</td>
                                        <td>{discharge.total_quantity ?? 0}</td>
                                        <td>{formatDate(discharge.created_at)}</td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    onClick={() => handleDownload(discharge)}
                                                    className="btn-icon"
                                                    title="Télécharger"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                {discharge.status !== 'cancelled' && (
                                                    <button 
                                                        onClick={() => handleCancel(discharge)}
                                                        className="btn-icon danger-hover"
                                                        title="Annuler"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {pagination.last_page > 1 && (
                            <div className="pagination">
                                <button 
                                    onClick={() => fetchDischarges(pagination.current_page - 1)}
                                    disabled={!pagination.prev_page_url}
                                    className="btn-ghost"
                                >
                                    <ChevronLeft size={16} /> Précédent
                                </button>
                                <span className="page-info">
                                    Page {pagination.current_page} sur {pagination.last_page}
                                </span>
                                <button 
                                    onClick={() => fetchDischarges(pagination.current_page + 1)}
                                    disabled={!pagination.next_page_url}
                                    className="btn-ghost"
                                >
                                    Suivant <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {showDetailModal && selectedDischarge && (
                    <div className="summary-modal" role="presentation">
                        <div className="modal" role="dialog" aria-modal="true">
                            <div className="modal-header-row">
                                <h3>Détails de la décharge</h3>
                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setSelectedDischarge(null);
                                    }}
                                    aria-label="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="summary-content">
                                <div className="discharge-info">
                                    <div className="info-row">
                                        <span className="info-label">Reference :</span>
                                        <span className="info-value highlight">{selectedDischarge.reference}</span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Statut :</span>
                                        <span className="info-value">
                                            {selectedDischarge.status === 'cancelled' ? 'Annulée' : 'Active'}
                                        </span>
                                    </div>
                                    <div className="info-row">
                                        <span className="info-label">Beneficiaire :</span>
                                        <span className="info-value">{selectedDischarge.recipient}</span>
                                    </div>
                                    {selectedDischarge.recipient_matricule && (
                                        <div className="info-row">
                                            <span className="info-label">Matricule :</span>
                                            <span className="info-value">{selectedDischarge.recipient_matricule}</span>
                                        </div>
                                    )}
                                    {selectedDischarge.entity && (
                                        <div className="info-row">
                                            <span className="info-label">Entité :</span>
                                            <span className="info-value">{selectedDischarge.entity}</span>
                                        </div>
                                    )}
                                    {selectedDischarge.ville && (
                                        <div className="info-row">
                                            <span className="info-label">Ville :</span>
                                            <span className="info-value">{selectedDischarge.ville}</span>
                                        </div>
                                    )}
                                    <div className="info-row">
                                        <span className="info-label">Date :</span>
                                        <span className="info-value">{formatDate(selectedDischarge.created_at)}</span>
                                    </div>
                                </div>

                                <h4 style={{ marginTop: '20px', marginBottom: '12px', color: '#1f2937' }}>
                                    Articles
                                </h4>
                                <div className="updated-items">
                                    {selectedDischarge.items.map((item, index) => (
                                        <div key={index} className="updated-item">
                                            <span className="item-name">{item.name}</span>
                                            <span className="stock-change">
                                                Ref: {item.reference} | Qte: {item.quantity}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {selectedDischarge.notes && (
                                    <div className="notes-section" style={{ marginTop: '16px' }}>
                                        <div className="label">Notes :</div>
                                        <div>{selectedDischarge.notes}</div>
                                    </div>
                                )}
                            </div>
                            <div className="form-actions">
                                <button 
                                    onClick={() => handleDownload(selectedDischarge)}
                                    className="btn-success"
                                >
                                    <Download size={18} /> Télécharger le PDF
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setSelectedDischarge(null);
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
