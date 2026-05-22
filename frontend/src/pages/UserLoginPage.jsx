import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves } from 'lucide-react';
import { useUserAuth } from '../context/UserAuthContext';
import './UserLoginPage.css';

export default function UserLoginPage() {
    const [email, setEmail]       = useState('mohammed.alami@onee.ma');
    const [password, setPassword] = useState('user123');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);
    const { login }               = useUserAuth();
    const navigate                = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/user/catalog');
        } catch (err) {
            const msg =
                err.response?.data?.errors?.email?.[0] ||
                err.response?.data?.message ||
                'Erreur de connexion';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ul-root">
            <div className="ul-container">
                {/* Floating orbs */}
                <div className="ul-orb ul-orb-1" aria-hidden />
                <div className="ul-orb ul-orb-2" aria-hidden />

                <div className="ul-card">
                    {/* Brand */}
                    <div className="ul-brand">
                        <div className="ul-logo" aria-hidden>
                            <Waves size={28} strokeWidth={2} className="ul-logo-icon" />
                        </div>
                        <h1 className="ul-title">ONEE</h1>
                        <p className="ul-subtitle">Branche Eau</p>
                        <p className="ul-tagline">Espace Agent — Catalogue Consommables</p>
                    </div>

                    {/* Role badge */}
                    <div className="ul-role-badge">
                        <span className="ul-role-dot" />
                        Accès Agent
                    </div>

                    <form onSubmit={handleSubmit} className="ul-form">
                        {error && <div className="ul-error">{error}</div>}

                        <div className="ul-field">
                            <label htmlFor="user-login-email">Email</label>
                            <input
                                id="user-login-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="votre.email@onee.ma"
                                required
                                className="ul-input"
                            />
                        </div>

                        <div className="ul-field">
                            <label htmlFor="user-login-password">Mot de passe</label>
                            <input
                                id="user-login-password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="ul-input"
                            />
                        </div>

                        <button
                            id="user-login-submit"
                            type="submit"
                            disabled={loading}
                            className="ul-button"
                        >
                            {loading ? (
                                <>
                                    <span className="ul-spinner" />
                                    Connexion…
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </button>
                    </form>

                    <p className="ul-footer-note">DR Béni Mellal Khénifra — Khouribga</p>
                </div>

                <p className="ul-copyright">© 2026 ONEE — Tous droits réservés</p>
            </div>
        </div>
    );
}
