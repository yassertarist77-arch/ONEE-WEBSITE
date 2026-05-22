import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, Minus, Trash2, Package, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import './UserRequestPage.css';

/** Align with admin catalogue / ConsumableController status rules. */
function stockBadge(stock, threshold) {
    const t = threshold ?? 0;
    if (stock <= 0) return { label: 'Rupture', cls: 'ureq-badge--out' };
    if (stock > 0 && stock < t) return { label: 'Critique', cls: 'ureq-badge--low' };
    return { label: 'En stock', cls: 'ureq-badge--ok' };
}

export default function UserRequestPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { userApi, getConsumables } = useUserAuth();
    const [consumables, setConsumables] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cart, setCart] = useState([]);
    const [notes, setNotes] = useState('');
    const [pickItem, setPickItem] = useState(null);
    const [pickQty, setPickQty] = useState(1);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successRef, setSuccessRef] = useState('');
    const [editTicketId, setEditTicketId] = useState(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getConsumables({ active_only: 1, per_page: 500 });
            const page = res.data?.data;
            const list = page?.data ?? res.data?.data ?? [];
            setConsumables(Array.isArray(list) ? list : []);
        } catch {
            setError('Impossible de charger le catalogue.');
        } finally {
            setLoading(false);
        }
    }, [getConsumables]);

    useEffect(() => {
        load();
    }, [load]);

    const addFromCatalog = searchParams.get('add');

    useEffect(() => {
        if (loading || !addFromCatalog) return;
        const id = parseInt(addFromCatalog, 10);
        if (!Number.isFinite(id)) {
            const next = new URLSearchParams(searchParams);
            next.delete('add');
            setSearchParams(next, { replace: true });
            return;
        }
        const c = consumables.find(x => x.id === id);
        if (c && c.stock_quantity > 0) {
            setPickItem(c);
            setPickQty(1);
        }
        const next = new URLSearchParams(searchParams);
        next.delete('add');
        setSearchParams(next, { replace: true });
    }, [loading, consumables, addFromCatalog, searchParams, setSearchParams]);

    const editFromList = searchParams.get('edit');

    useEffect(() => {
        if (loading || !editFromList) return;
        const id = parseInt(editFromList, 10);
        if (!Number.isFinite(id)) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await userApi.get(`/tickets/${id}`);
                const data = res.data?.data;
                if (!cancelled && data && data.status === 'soumis') {
                    setEditTicketId(id);
                    setNotes(data.notes || '');
                    setCart((data.items || []).map(it => ({
                        consumable: it.consumable,
                        quantity: it.quantity_requested
                    })));
                }
            } catch (err) {
                console.error("Failed to load ticket for edit", err);
            }
        })();

        const next = new URLSearchParams(searchParams);
        next.delete('edit');
        setSearchParams(next, { replace: true });

        return () => { cancelled = true; };
    }, [loading, editFromList, userApi, searchParams, setSearchParams]);

    const filtered = useMemo(() => {
        let rows = consumables;
        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter(
                c =>
                    c.name?.toLowerCase().includes(q) ||
                    c.reference?.toLowerCase().includes(q)
            );
        }
        return rows;
    }, [consumables, search]);

    const openPick = c => {
        if (c.stock_quantity <= 0) return;
        setPickItem(c);
        setPickQty(1);
    };

    const addToCart = () => {
        if (!pickItem) return;
        const max = pickItem.stock_quantity;
        const qty = Math.min(Math.max(1, pickQty), max);
        setCart(prev => {
            const i = prev.findIndex(x => x.consumable.id === pickItem.id);
            if (i >= 0) {
                const next = [...prev];
                const merged = Math.min(max, next[i].quantity + qty);
                next[i] = { ...next[i], quantity: merged };
                return next;
            }
            return [...prev, { consumable: pickItem, quantity: qty }];
        });
        setPickItem(null);
    };

    const setCartQty = (id, delta) => {
        setCart(prev =>
            prev
                .map(row => {
                    if (row.consumable.id !== id) return row;
                    const max = row.consumable.stock_quantity;
                    const q = Math.min(max, Math.max(1, row.quantity + delta));
                    return { ...row, quantity: q };
                })
                .filter(row => row.quantity > 0)
        );
    };

    const removeLine = id => setCart(prev => prev.filter(x => x.consumable.id !== id));

    const submit = async () => {
        setSubmitting(true);
        setError('');
        setSubmitting(true);
        setError('');
        try {
            const endpoint = editTicketId ? `/tickets/${editTicketId}` : '/tickets';
            const method = editTicketId ? 'put' : 'post';
            
            const res = await userApi[method](endpoint, {
                items: cart.map(({ consumable, quantity }) => ({
                    consumable_id: consumable.id,
                    quantity,
                })),
                notes: notes.trim() || undefined,
            });
            const ref = res.data?.data?.reference || res.data?.reference;
            setSuccessRef(ref || 'enregistrée');
            setCart([]);
            setNotes('');
            setEditTicketId(null);
            setConfirmOpen(false);
            load();
        } catch (e) {
            const msg =
                e.response?.data?.message ||
                e.response?.data?.errors?.items?.[0] ||
                'Erreur lors de l’envoi.';
            setError(msg);
            setConfirmOpen(false);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ureq-root">
            <header className="ureq-head">
                <h1 className="ureq-title">{editTicketId ? 'Modifier la demande' : 'Nouvelle demande'}</h1>
                <p className="ureq-sub">
                    {editTicketId 
                        ? `Modification de la demande #${editTicketId}` 
                        : 'Sélectionnez des articles puis soumettez votre demande.'}
                </p>
            </header>

            {successRef && (
                <div className="ureq-banner ureq-banner--ok">
                    Demande <strong>{successRef}</strong> enregistrée avec succès.
                    <button type="button" className="ureq-banner-x" onClick={() => setSuccessRef('')}>
                        ✕
                    </button>
                </div>
            )}
            {error && <div className="ureq-banner ureq-banner--err">{error}</div>}

            <div className="ureq-panels">
                <section className="ureq-panel ureq-panel--left">
                    <h2 className="ureq-panel-title">Catalogue</h2>
                    <div className="ureq-filters">
                        <div className="ureq-search">
                            <Search size={16} />
                            <input
                                type="search"
                                placeholder="Rechercher…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="ureq-loading">
                            <span className="ureq-spinner" /> Chargement…
                        </div>
                    ) : (
                        <div className="ureq-list">
                            {filtered.map(c => {
                                const b = stockBadge(c.stock_quantity, c.threshold);
                                const Icon = c.stock_quantity <= 0 ? XCircle : b.cls.includes('low') ? AlertTriangle : CheckCircle;
                                return (
                                    <div key={c.id} className="ureq-card">
                                        <div className="ureq-card-main">
                                            <div className="ureq-card-name">{c.name}</div>
                                            <div className="ureq-card-meta">
                                                Ref. {c.reference}
                                            </div>
                                            <span className={`ureq-badge ${b.cls}`}>
                                                <Icon size={12} /> {b.label}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="ureq-add"
                                            disabled={c.stock_quantity <= 0}
                                            onClick={() => openPick(c)}
                                        >
                                            Ajouter
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="ureq-panel ureq-panel--right">
                    <h2 className="ureq-panel-title">
                        Votre Demande
                        <span className="ureq-count">{cart.length}</span>
                    </h2>

                    {cart.length === 0 ? (
                        <div className="ureq-empty">
                            <Package size={36} strokeWidth={1.25} />
                            <p>Aucun article sélectionné</p>
                        </div>
                    ) : (
                        <ul className="ureq-cart">
                            {cart.map(({ consumable: c, quantity }) => (
                                <li key={c.id} className="ureq-line">
                                    <div className="ureq-line-info">
                                        <div className="ureq-line-name">{c.name}</div>
                                        <div className="ureq-line-sub">Max {c.stock_quantity}</div>
                                    </div>
                                    <div className="ureq-qty">
                                        <button type="button" onClick={() => setCartQty(c.id, -1)} aria-label="Moins">
                                            <Minus size={16} />
                                        </button>
                                        <span>{quantity}</span>
                                        <button type="button" onClick={() => setCartQty(c.id, 1)} aria-label="Plus">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <button type="button" className="ureq-remove" onClick={() => removeLine(c.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <label className="ureq-label">Motif ou commentaire (optionnel)</label>
                    <textarea
                        className="ureq-notes"
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Ex. : besoin pour le service…"
                    />

                    <button
                        type="button"
                        className="ureq-submit"
                        disabled={cart.length === 0 || submitting}
                        onClick={() => setConfirmOpen(true)}
                    >
                        {editTicketId ? 'Mettre à jour la demande' : 'Soumettre la demande'}
                    </button>
                    {editTicketId && (
                        <button 
                            type="button" 
                            className="ureq-btn-secondary" 
                            style={{ width: '100%', marginTop: '10px' }}
                            onClick={() => {
                                setEditTicketId(null);
                                setCart([]);
                                setNotes('');
                            }}
                        >
                            Annuler la modification
                        </button>
                    )}
                </section>
            </div>

            {pickItem && (
                <div className="ureq-modal-back" onClick={() => setPickItem(null)}>
                    <div className="ureq-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ marginBottom: '16px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                            <h3 style={{ margin: 0 }}>{pickItem.name}</h3>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                                <strong>Réf:</strong> {pickItem.reference}
                            </div>
                            {pickItem.description && (
                                <p style={{ fontSize: '13px', color: '#444', marginTop: '8px', fontStyle: 'italic' }}>
                                    {pickItem.description}
                                </p>
                            )}
                        </div>
                        <p className="ureq-modal-sub">Quantité souhaitée (Stock: {pickItem.stock_quantity})</p>
                        <div className="ureq-modal-qty">
                            <button type="button" onClick={() => setPickQty(q => Math.max(1, q - 1))}>
                                <Minus size={18} />
                            </button>
                            <input
                                type="number"
                                min={1}
                                max={pickItem.stock_quantity}
                                value={pickQty}
                                onChange={e =>
                                    setPickQty(
                                        Math.min(
                                            pickItem.stock_quantity,
                                            Math.max(1, parseInt(e.target.value, 10) || 1)
                                        )
                                    )
                                }
                            />
                            <button
                                type="button"
                                onClick={() => setPickQty(q => Math.min(pickItem.stock_quantity, q + 1))}
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                        <div className="ureq-modal-actions">
                            <button type="button" className="ureq-btn-secondary" onClick={() => setPickItem(null)}>
                                Annuler
                            </button>
                            <button type="button" className="ureq-btn-primary" onClick={addToCart}>
                                Ajouter la demande
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmOpen && (
                <div className="ureq-modal-back" onClick={() => !submitting && setConfirmOpen(false)}>
                    <div className="ureq-modal" onClick={e => e.stopPropagation()}>
                        <h3>Confirmer l’envoi ?</h3>
                        <p className="ureq-modal-sub">
                            {cart.length} article(s) seront transmis pour validation.
                        </p>
                        <div className="ureq-modal-actions">
                            <button
                                type="button"
                                className="ureq-btn-secondary"
                                disabled={submitting}
                                onClick={() => setConfirmOpen(false)}
                            >
                                Annuler
                            </button>
                            <button type="button" className="ureq-btn-primary" disabled={submitting} onClick={submit}>
                                {submitting ? 'Envoi…' : 'Confirmer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
