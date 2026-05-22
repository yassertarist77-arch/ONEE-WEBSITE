import { useState, useEffect } from 'react';
import { UserPlus, Pencil, Trash2, Key, Copy, Check, X } from 'lucide-react';
import userService from '../services/userService';
import Layout from '../components/Layout';

import { ENTITIES } from '../constants/entities';

export default function UsersManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Modal states
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
    const [tempPassword, setTempPassword] = useState(null);
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
                password: ''
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            setError('');
            
            if (editingUser) {
                const data = { ...formData };
                if (!data.password) delete data.password;
                await userService.update(editingUser.id, data);
                setSuccess('Utilisateur mis à jour');
            } else {
                await userService.create(formData);
                setSuccess('Utilisateur ajouté');
            }
            
            setShowModal(false);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de l\'enregistrement');
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (user) => {
        if (!window.confirm(`Réinitialiser le mot de passe de ${user.name} ?`)) return;
        
        try {
            const response = await userService.resetPassword(user.id);
            setTempPassword({
                name: user.name,
                password: response.data.new_password
            });
        } catch (err) {
            setError('Erreur lors de la réinitialisation');
        }
    };

    const handleDelete = async (user) => {
        if (!window.confirm(`Supprimer l'utilisateur ${user.name} ?`)) return;
        
        try {
            await userService.delete(user.id);
            setSuccess('Utilisateur supprimé');
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur lors de la suppression');
            setTimeout(() => setError(''), 5000);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(tempPassword.password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    return (
        <Layout>
            <div className="page-shell">
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>Gestion des Utilisateurs</h1>
                        <p className="subtitle">Administrez les comptes utilisateurs du système</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="btn btn-premium">
                        <UserPlus size={20} strokeWidth={2.5} />
                        Ajouter un utilisateur
                    </button>
                </div>

                {success && <div className="success-message">{success}</div>}
                {error && <div className="error-message">{error}</div>}

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
                                    <th>Date d'inscription</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td><strong>{user.name}</strong></td>
                                        <td>{user.email}</td>
                                        <td>{user.matricule}</td>
                                        <td>{user.entity || '-'}</td>
                                        <td>{user.ville || '-'}</td>
                                        <td>
                                            <span className="badge badge-gray">{user.tickets_count}</span>
                                        </td>
                                        <td>{formatDate(user.created_at)}</td>
                                          <td style={{ textAlign: 'right' }}>
                                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                  <button onClick={() => handleOpenModal(user)} className="btn-icon" title="Modifier">
                                                      <Pencil size={16} />
                                                  </button>
                                                  <button onClick={() => handleResetPassword(user)} className="btn-icon" title="Réinitialiser MDP">
                                                      <Key size={16} />
                                                  </button>
                                                  <button onClick={() => handleDelete(user)} className="btn-icon danger-hover" title="Supprimer">
                                                      <Trash2 size={16} />
                                                  </button>
                                              </div>
                                          </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h2>{editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</h2>
                                <button onClick={() => setShowModal(false)} className="btn-icon"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Nom Complet</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
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
                                        required
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
                                        <option value="">Sélectionner une entité...</option>
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
                                            <option value="">Sélectionner une ville...</option>
                                            {ENTITIES[formData.entity]?.map(ville => (
                                                <option key={ville} value={ville}>{ville}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">
                                        Mot de passe {editingUser && '(Laisser vide pour ne pas changer)'}
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
                                <div className="modal-footer" style={{ marginTop: '24px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Annuler</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? 'Enregistrement...' : 'Enregistrer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Password Result Modal */}
                {tempPassword && (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                            <div className="modal-header">
                                <h2>Nouveau mot de passe</h2>
                                <button onClick={() => setTempPassword(null)} className="btn-icon"><X size={20} /></button>
                            </div>
                            <div style={{ padding: '20px 0' }}>
                                <p>Nouveau mot de passe pour <strong>{tempPassword.name}</strong> :</p>
                                <div style={{ 
                                    background: '#f1f5f9', 
                                    padding: '15px', 
                                    borderRadius: '8px', 
                                    fontSize: '24px', 
                                    fontWeight: 'bold', 
                                    margin: '15px 0',
                                    fontFamily: 'monospace',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '15px'
                                }}>
                                    {tempPassword.password}
                                    <button onClick={copyToClipboard} className="btn-icon" style={{ padding: '4px' }}>
                                        {copied ? <Check size={18} color="green" /> : <Copy size={18} />}
                                    </button>
                                </div>
                                <div className="error-message" style={{ margin: '10px 0', fontSize: '13px' }}>
                                    Attention: Ce mot de passe ne sera plus affiché après fermeture.
                                </div>
                            </div>
                             <button onClick={() => setTempPassword(null)} className="btn-ghost" style={{ width: '100%' }}>Fermer</button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
