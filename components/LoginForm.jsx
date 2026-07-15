import { useState } from "react";

const LoginForm = ({ onLogin, error, loading }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = (e) => { e.preventDefault(); onLogin(email, password); };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-amber-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <div className="flex flex-col items-center space-y-3 mb-8">
          <div className="h-16 w-16 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">FWE</span>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900">Fakhama Weddings & Events</h1>
          <p className="text-sm text-gray-500 text-center">BMW Série 3 2026</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input id="email" type="email" placeholder="votre@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 placeholder-gray-400" required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input id="password" type="password" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-gray-900 placeholder-gray-400" required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-rose-600 to-amber-600 text-white py-2 px-4 rounded-md hover:from-rose-700 hover:to-amber-700 transition-all disabled:opacity-60">
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── PRICE SIMULATION ──────────────────────────────────────────────────────────

export default LoginForm;
