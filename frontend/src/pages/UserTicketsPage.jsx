import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Download, FileText, Edit2 } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import { useNavigate } from 'react-router-dom';
import './UserTicketsPage.css';

const TABS = [
    { id: '', label: 'Tous' },
    { id: 'soumis', label: 'En attente' },
    { id: 'validé', label: 'Validées' },
    { id: 'refusé', label: 'Refusées' },
];

function statusClass(s) {
    if (s === 'soumis') return 'utix-st--pending';
    if (s === 'validé') return 'utix-st--ok';
    return 'utix-st--no';
}

export default function UserTicketsPage() {
    const { userApi } = useUserAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(null);
    const [detail, setDetail] = useState({});
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const params = { page, per_page: 15 };
            if (tab) params.status = tab;
            const res = await userApi.get('/tickets', { params });
            const p = res.data?.data;
            setRows(p?.data ?? []);
            setLastPage(p?.last_page ?? 1);
        } catch {
            setError('Impossible de charger vos demandes.');
        } finally {
            setLoading(false);
        }
    }, [userApi, tab, page]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        setPage(1);
    }, [tab]);

    const ticketHighlight = searchParams.get('ticket');

    useEffect(() => {
        if (!ticketHighlight) return;
        const id = parseInt(ticketHighlight, 10);
        if (!Number.isFinite(id)) return;
        setExpanded(id);
        let cancelled = false;
        (async () => {
            try {
                const res = await userApi.get(`/tickets/${id}`);
                if (!cancelled) setDetail(d => ({ ...d, [id]: res.data?.data }));
            } catch {
                if (!cancelled) setDetail(d => ({ ...d, [id]: null }));
            }
        })();
        const next = new URLSearchParams(searchParams);
        next.delete('ticket');
        setSearchParams(next, { replace: true });
        return () => {
            cancelled = true;
        };
    }, [ticketHighlight, userApi, searchParams, setSearchParams]);

    const toggle = async id => {
        if (expanded === id) {
            setExpanded(null);
            return;
        }
        setExpanded(id);
        if (!detail[id]) {
            try {
                const res = await userApi.get(`/tickets/${id}`);
                setDetail(d => ({ ...d, [id]: res.data?.data }));
            } catch {
                setDetail(d => ({ ...d, [id]: null }));
            }
        }
    };

    const download = async (dischargeId, referenceLabel) => {
        try {
            const res = await userApi.get(`/discharges/${dischargeId}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            const safe = (referenceLabel || 'decharge').replace(/[^\w.-]+/g, '_');
            a.download = `decharge_${safe}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            setError('Téléchargement impossible.');
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Voulez-vous vraiment annuler cette demande ?')) return;

        try {
            await userApi.delete(`/tickets/${id}`);
            load(); // reload list
        } catch (err) {
            setError(err.response?.data?.message || "Erreur lors de l'annulation.");
        }
    };

    const handleEdit = (e, id) => {
        e.stopPropagation();
        navigate(`/user/request?edit=${id}`);
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

    return (
        <div className="utix-root">
            <header className="utix-head">
                <h1 className="utix-title">Mes demandes</h1>
                <p className="utix-sub">Suivi de vos demandes de consommables</p>
            </header>

            {error && <div className="utix-err">{error}</div>}

            <div className="utix-tabs">
                {TABS.map(t => (
                    <button
                        key={t.id || 'all'}
                        type="button"
                        className={`utix-tab ${tab === t.id ? 'utix-tab--on' : ''}`}
                        onClick={() => setTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="utix-loading">
                    <span className="utix-spin" /> Chargement…
                </div>
            ) : rows.length === 0 ? (
                <div className="utix-empty">
                    <FileText size={40} strokeWidth={1.2} />
                    <p>Vous n&apos;avez pas encore fait de demande.</p>
                </div>
            ) : (
                <ul className="utix-list">
                    {rows.map(tk => (
                        <li key={tk.id} className="utix-card">
                            <button type="button" className="utix-row" onClick={() => toggle(tk.id)}>
                                <div className="utix-main">
                                    <div className="utix-ref">{tk.reference}</div>
                                    <div className="utix-date">{fmt(tk.created_at)}</div>
                                    <div className="utix-sum">{tk.items_summary}</div>
                                    {tk.status === 'refusé' && tk.rejection_reason && (
                                        <div className="utix-rej">{tk.rejection_reason}</div>
                                    )}
                                    {tk.status === 'validé' && tk.discharge_reference && (
                                        <div className="utix-dch">
                                            <span>
                                                📄 Décharge: <strong>{tk.discharge_reference}</strong>
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-success-premium btn-premium-sm"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    download(tk.discharge_id, tk.discharge_reference);
                                                }}
                                            >
                                                <Download size={14} strokeWidth={2.5} /> Télécharger
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="utix-actions">
                                    <span className={`utix-badge ${statusClass(tk.status)}`}>{tk.status}</span>
                                    {tk.status === 'soumis' && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                type="button" 
                                                className="btn btn-premium btn-premium-sm" 
                                                onClick={(e) => handleEdit(e, tk.id)}
                                                title="Modifier ma demande"
                                            >
                                                <Edit2 size={12} strokeWidth={2.5} /> Modifier
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn btn-danger-premium btn-premium-sm" 
                                                onClick={(e) => handleDelete(e, tk.id)}
                                                title="Annuler ma demande"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <span className="utix-chev">
                                    {expanded === tk.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </span>
                            </button>
                            {expanded === tk.id && detail[tk.id] && (
                                <div className="utix-detail">
                                    {detail[tk.id].notes && (
                                        <p>
                                            <strong>Commentaire :</strong> {detail[tk.id].notes}
                                        </p>
                                    )}
                                    <ul>
                                        {(detail[tk.id].items || []).map(it => (
                                            <li key={it.id}>
                                                {it.consumable?.name} × {it.quantity_requested}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {lastPage > 1 && (
                <div className="utix-pager">
                    <button type="button" className="btn btn-premium btn-premium-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        Précédent
                    </button>
                    <span>
                        Page {page} / {lastPage}
                    </span>
                    <button type="button" className="btn btn-premium btn-premium-sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
                        Suivant
                    </button>
                </div>
            )}
        </div>
    );
}
