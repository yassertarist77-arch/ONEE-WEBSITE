import { useState, useEffect } from 'react';
import { Users, UserPlus, Pencil, Trash2, Key, Copy, Check } from 'lucide-react';
import userService from '../services/userService';
import Layout from '../components/Layout';

import { ENTITIES } from '../constants/entities';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        matricule: '',
        entity: '',
        ville: '',
        password: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Reset password state
    const [resetResult, setResetResult] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await userService.getAll();
            setUsers(response.data.data);
        } catch (err) {
            setError('Erreur lors du chargement des utilisateurs');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                matricule: user.matricule || '',
                entity: user.entity || '',
                ville: user.ville || '',
                password: '' // Don't pre-fill password for editing
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                email: '',
                matricule: '',
                entity: '',
                ville: '',
                password: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingUser(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            setError('');
            
            if (editingUser) {
                // Remove password if empty
                const data = { ...formData };
                if (!data.password) delete data.password;
                
                await userService.update(editingUser.id, data);
                setSuccess('Utilisateur mis à jour avec succès');
            } else {
                await userService.create(formData);
                setSuccess('Utilisateur créé avec succès');
            }
            
            handleCloseModal();
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Une erreur est survenue');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
        
        try {
            await userService.delete(id);
            setSuccess('Utilisateur supprimé avec succès');
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la suppression');
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleResetPassword = async (id) => {
        if (!window.confirm('Réinitialiser le mot de passe de cet utilisateur ?')) return;
        
        try {
            const response = await userService.resetPassword(id);
            setResetResult({
                userName: users.find(u => u.id === id)?.name,
                password: response.data.new_password
            });
        } catch (err) {
            setError('Erreur lors de la réinitialisation du mot de passe');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(resetResult.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <Layout>
            <div className="page-shell">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Gestion des Utilisateurs</h1>
                        <p className="subtitle">Consultez et gérez les comptes utilisateurs</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserPlus size={18} />
                        Ajouter un utilisateur
                    </button>
                </div>

                {success && <div className="success-message" style={{ marginBottom: '20px' }}>{success}</div>}
                {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

                {resetResult && (
                    <div className="info-card" style={{ marginBottom: '24px', border: '1px solid var(--primary-color)', background: 'rgba(37, 99, 235, 0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', color: 'var(--primary-color)' }}>Nouveau mot de passe généré</h3>
                                <p style={{ margin: '0 0 12px 0' }}>Pour <strong>{resetResult.userName}</strong> :</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <code style={{ background: 'var(--bg-secondary)', padding: '8px 16px', borderRadius: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        {resetResult.password}
                                    </code>
                                    <button onClick={copyToClipboard} className="btn-icon" title="Copier">
                                        {copied ? <Check size={18} color="green" /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button onClick={() => setResetResult(null)} className="btn-close">&times;</button>
                        </div>
                        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Note: Ce mot de passe ne s'affichera qu'une seule fois. Veuillez le copier avant de fermer.
                        </p>
                    </div>
                )}

                {loading ? (
                    <div className="loading">Chargement...</div>
                ) : (
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Nom</th>
                                    <th>Email</th>
                                    <th>Matricule</th>
                                    <th>Entité</th>
                                    <th>Ville</th>
                                    <th>Demandes</th>
                                    <th>Date Création</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="empty-cell">Aucun utilisateur trouvé</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id}>
                                            <td style={{ fontWeight: 500 }}>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.matricule || '-'}</td>
                                            <td>{user.entity || '-'}</td>
                                            <td>{user.ville || '-'}</td>
                                            <td>
                                                <span className={`badge ${user.tickets_count > 0 ? 'badge-blue' : 'badge-gray'}`}>
                                                    {user.tickets_count} demande(s)
                                                </span>
                                            </td>
                                            <td>{formatDate(user.created_at)}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button onClick={() => handleResetPassword(user.id)} className="btn-icon" title="Réinitialiser le mot de passe">
                                                        <Key size={16} />
                                                    </button>
                                                    <button onClick={() => handleOpenModal(user)} className="btn-icon" title="Modifier">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button onClick={() => handleDelete(user.id)} className="btn-icon btn-icon-danger" title="Supprimer">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>{editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h2>
                                <button onClick={handleCloseModal} className="btn-close">&times;</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Nom Complet *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Matricule</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.matricule}
                                        onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Entité *</label>
                                    <select
                                        className="form-input"
                                        value={formData.entity}
                                        onChange={(e) => {
                                            const newEntity = e.target.value;
                                            setFormData({ ...formData, entity: newEntity, ville: '' });
                                        }}
                                        required
                                    >
                                        <option value="">Sélectionner une entité</option>
                                        {Object.keys(ENTITIES).map(entity => (
                                            <option key={entity} value={entity}>{entity}</option>
                                        ))}
                                    </select>
                                </div>
                                {formData.entity && ENTITIES[formData.entity] && ENTITIES[formData.entity].length > 0 && (
                                    <div className="form-group">
                                        <label className="form-label">Ville *</label>
                                        <select
                                            className="form-input"
                                            value={formData.ville}
                                            onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                                            required
                                        >
                                            <option value="">Sélectionner une ville</option>
                                            {ENTITIES[formData.entity]?.map(ville => (
                                                <option key={ville} value={ville}>{ville}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">
                                        {editingUser ? 'Nouveau mot de passe (laisser vide pour conserver l\'actuel)' : 'Mot de passe *'}
                                    </label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        minLength={6}
                                    />
                                </div>
                                
                                {error && <div className="error-message" style={{ marginTop: '12px' }}>{error}</div>}
                                
                                <div className="modal-footer" style={{ marginTop: '24px' }}>
                                    <button type="button" onClick={handleCloseModal} className="btn-secondary">Annuler</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? 'Traitement...' : editingUser ? 'Mettre à jour' : 'Créer l\'utilisateur'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
