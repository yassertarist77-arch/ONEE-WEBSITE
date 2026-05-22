import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
    const [email, setEmail] = useState('admin@onee.ma');
    const [password, setPassword] = useState('Admin@2026');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-root">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-brand">
                        <div className="login-logo-placeholder" aria-hidden>
                            <Droplet size={30} strokeWidth={2.2} className="login-logo-svg" />
                        </div>
                        <h1 className="login-title-onee">ONEE</h1>
                        <p className="login-branch">Branche Eau</p>
                        <p className="login-tagline">Gestion des Consommables</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                type="email"
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Your email here"
                                required
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="login-password">Mot de passe</label>
                            <input
                                id="login-password"
                                type="password"
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="form-input"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="login-button">
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Connexion...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </button>
                    </form>

                    <p className="login-footer-note">DR Béni Mellal Khénifra — Khouribga</p>
                </div>
                <p className="login-copyright-below">© 2026 ONEE — Tous droits réservés</p>
            </div>
        </div>
    );
}
