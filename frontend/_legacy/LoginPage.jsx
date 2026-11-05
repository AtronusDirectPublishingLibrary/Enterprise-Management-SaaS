import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('pms2026');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('token', data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F3A35] relative overflow-hidden">
      <div className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md relative z-10 border-t-4 border-[#C3A86A]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#0F3A35] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-[#C3A86A]" />
          </div>
          <h1 className="text-3xl font-serif text-[#0F3A35] font-bold">Staff Portal</h1>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm text-center border border-red-200 flex items-center justify-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 pl-10 pr-4" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-300 rounded-lg py-3 pl-10 pr-4" required />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#C3A86A] hover:bg-[#b09356] text-[#0F3A35] font-bold py-3 rounded-lg transition-colors">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}