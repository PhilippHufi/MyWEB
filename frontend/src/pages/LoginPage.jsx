import { Lock } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { ErrorState } from '../components/ErrorState';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('Philipp');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await api.login(username, password);
      localStorage.setItem('life:token', result.token);
      onLogin(result.token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="life-bg flex min-h-screen items-center justify-center p-4">
      <form className="glass-panel w-full max-w-sm p-6" onSubmit={submit}>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-md bg-cyan-300 p-3 text-slate-950"><Lock className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">MyWEB</h1>
            <p className="text-sm text-slate-400">Privates Life-Dashboard</p>
          </div>
        </div>
        <div className="space-y-3">
          <input className="life-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Benutzer" />
          <input className="life-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passwort" />
          <ErrorState message={error} />
          <Button className="w-full">Einloggen</Button>
        </div>
      </form>
    </main>
  );
}
