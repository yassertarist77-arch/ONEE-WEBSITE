import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/axios';
import { Search, Check, XCircle } from 'lucide-react';
import Layout from '../components/Layout';

const TABS = [
    { id: '', label: 'Tous' },
    { id: 'soumis', label: 'En attente' },
    { id: 'validé', label: 'Validées' },
    { id: 'refusé', label: 'Refusées' },
];

export default function AdminTicketsPage() {
    const [searchParams] = useSearchParams();
    const [tab, setTab] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [pendingCount, setPendingCount] = useState(0);
    const [approveId, setApproveId] = useState(null);
    const [rejectId, setRejectId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, per_page: 20 };
            if (tab) params.status = tab;
            if (search.trim()) params.search = search.trim();
            const res = await apiClient.get('/tickets', { params });
            const p = res.data?.data;
            setRows(p?.data ?? []);
            setLastPage(p?.last_page ?? 1);
            setPendingCount(res.data?.meta?.pending_count ?? res.data?.pending_count ?? 0);
        } catch {
            setError('Erreur de chargement des demandes.');
        } finally {
            setLoading(false);
        }
    }, [tab, page, search]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        const s = searchParams.get('status');
        if (s && ['soumis', 'validé', 'refusé'].includes(s)) setTab(s);
        const q = searchParams.get('search');
        if (q != null && q !== '') {
            setSearch(q);
            setSearchInput(q);
        }
    }, [searchParams]);

    useEffect(() => {
        setPage(1);
    }, [tab]);

    const doApprove = async () => {
        if (!approveId) return;
        setBusy(true);
        setError('');
        try {
            await apiClient.post(`/tickets/${approveId}/approve`);
            setApproveId(null);
            await load();
        } catch (e) {
            const msg =
                e.response?.data?.message ||
                e.response?.data?.errors?.stock?.[0] ||
                'Validation impossible.';
            const failed = e.response?.data?.failed_items;
            let detail = '';
            if (Array.isArray(failed) && failed.length) {
                detail =
                    ' — ' +
                    failed
                        .map(f =>
                            f.name
                                ? `« ${f.name} » (dispo: ${f.available ?? '?'}, demandé: ${f.requested ?? '?'})`
                                : f.reason || JSON.stringify(f)
                        )
                        .join(' ; ');
            }
            setError(msg + detail);
            setApproveId(null);
        } finally {
            setBusy(false);
        }
    };

    const doReject = async () => {
        if (!rejectId || rejectReason.trim().length < 3) return;
        setBusy(true);
        setError('');
        try {
            await apiClient.post(`/tickets/${rejectId}/reject`, {
                rejection_reason: rejectReason.trim(),
            });
            setRejectId(null);
            setRejectReason('');
            await load();
        } catch (e) {
            setError(e.response?.data?.message || 'Refus impossible.');
        } finally {
            setBusy(false);
        }
    };

    const fmt = d =>
        d
            ? new Date(d).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : '—';

    if (loading && rows.length === 0 && !search && !tab) {
        return (
            <Layout>
                <div className="loading">Chargement…</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-shell stock-entry-page">
                {loading && rows.length > 0 && (
                    <div className="atix-refresh-banner" aria-live="polite">
                        Actualisation…
                    </div>
                )}
                <div className="page-header">
                    <h1>Demandes agents</h1>
                    <p className="subtitle">
                        Validation des demandes de consommables
                        {pendingCount > 0 && (
                            <span className="atix-pending-chip">{pendingCount} en attente</span>
                        )}
                    </p>
                </div>

                {error && (
                    <div className="error-message" onClick={() => setError('')}>
                        {error}
                    </div>
                )}

                <div className="filters-section">
                    <div className="filters-row" style={{ flexWrap: 'wrap', gap: 12 }}>
                        <input
                            type="search"
                            className="search-input"
                            placeholder="Référence ou nom du demandeur…"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    if (search === searchInput) {
                                        load();
                                    } else {
                                        setSearch(searchInput);
                                    }
                                }
                            }}
                        />
                        <button 
                            type="button" 
                            className="btn btn-premium" 
                            onClick={() => {
                                if (search === searchInput) {
                                    load();
                                } else {
                                    setSearch(searchInput);
                                }
                            }}
                        >
                            <Search size={18} strokeWidth={2.5} /> Rechercher
                        </button>
                    </div>
                    <div className="atix-tabs" style={{ marginTop: 12 }}>
                        {TABS.map(t => (
                            <button
                                key={t.id || 'all'}
                                type="button"
                                className={`atix-tab ${tab === t.id ? 'atix-tab--on' : ''}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="table-container" style={{ marginTop: 16, opacity: loading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                    {loading && rows.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                            Chargement en cours...
                        </div>
                    )}
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Référence</th>
                                <th>Demandeur</th>
                                <th>Articles</th>
                                <th>Date</th>
                                <th>Statut</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>
                                        Aucune demande pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                rows.map(tk => (
                                    <tr
                                        key={tk.id}
                                        className={tk.status === 'soumis' ? 'atix-row-pending' : ''}
                                    >
                                        <td>
                                            <strong>{tk.reference}</strong>
                                            {tk.discharge_reference && (
                                                <div className="atix-sub">Décharge {tk.discharge_reference}</div>
                                            )}
                                        </td>
                                        <td>{tk.user?.name ?? '—'}</td>
                                        <td>
                                            <div>{tk.items_summary}</div>
                                            <div className="atix-sub">{tk.items_count} ligne(s)</div>
                                        </td>
                                        <td>{fmt(tk.created_at)}</td>
                                        <td>
                                            <span className={`atix-badge atix-badge--${tk.status}`}>
                                                {tk.status}
                                            </span>
                                            {tk.status === 'refusé' && tk.rejection_reason && (
                                                <div className="atix-reason">{tk.rejection_reason}</div>
                                            )}
                                        </td>
                                        <td>
                                            {tk.status === 'soumis' ? (
                                                <div className="atix-actions" style={{ gap: '12px' }}>
                                                    <button
                                                        type="button"
                                                        className="btn-success-premium"
                                                        onClick={() => setApproveId(tk.id)}
                                                    >
                                                        <Check size={16} strokeWidth={2.5} /> Valider
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-danger-premium"
                                                        onClick={() => {
                                                            setRejectId(tk.id);
                                                            setRejectReason('');
                                                        }}
                                                    >
                                                        <XCircle size={16} strokeWidth={2.5} /> Refuser
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="atix-muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {lastPage > 1 && (
                    <div className="pagination" style={{ marginTop: 16 }}>
                        <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            Précédent
                        </button>
                        <span>
                            Page {page} / {lastPage}
                        </span>
                        <button type="button" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
                            Suivant
                        </button>
                    </div>
                )}
            </div>

            {approveId && (
                <div className="modal-overlay" onClick={() => !busy && setApproveId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Valider la demande ?</h3>
                        <p>Le stock sera déduit et une décharge sera générée.</p>
                        <div className="modal-footer">
                            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setApproveId(null)}>
                                Annuler
                            </button>
                             <button type="button" className="btn-success-premium" disabled={busy} onClick={doApprove}>
                                 {busy ? 'Traitement...' : 'Confirmer la validation'}
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {rejectId && (
                <div className="modal-overlay" onClick={() => !busy && setRejectId(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Refuser la demande</h3>
                        <p className="subtitle">Le motif est obligatoire.</p>
                        <textarea
                            className="search-input"
                            style={{ width: '100%', minHeight: 100, marginTop: 8 }}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Expliquez le refus…"
                        />
                        <div className="modal-footer">
                            <button type="button" className="btn-ghost" disabled={busy} onClick={() => setRejectId(null)}>
                                Annuler
                            </button>
                            <button
                                type="button"
                                className="btn-danger"
                                disabled={busy || rejectReason.trim().length < 3}
                                onClick={doReject}
                            >
                                Refuser
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
