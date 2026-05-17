import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { Button } from '../components/Button';

export function GoogleCallbackPage() {
  const [state, setState] = useState({ loading: true, error: '' });

  useEffect(() => {
    async function exchange() {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        if (!code) throw new Error('Google hat keinen OAuth-Code geliefert.');
        const redirectUri = localStorage.getItem('life:google-redirect-uri') || `${window.location.origin}/google/callback`;
        await api.googleExchange(code, redirectUri);
        setState({ loading: false, error: '' });
      } catch (error) {
        setState({ loading: false, error: error.message });
      }
    }
    exchange();
  }, []);

  return (
    <main className="life-bg flex min-h-screen items-center justify-center p-4">
      <section className="glass-panel w-full max-w-md p-6 text-center">
        {state.loading ? (
          <>
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-cyan-300" />
            <h1 className="text-xl font-bold text-white">Google wird verbunden</h1>
          </>
        ) : state.error ? (
          <>
            <XCircle className="mx-auto mb-4 h-10 w-10 text-rose-300" />
            <h1 className="text-xl font-bold text-white">Verbindung fehlgeschlagen</h1>
            <p className="mt-3 text-sm text-slate-300">{state.error}</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-300" />
            <h1 className="text-xl font-bold text-white">Google Calendar ist verbunden</h1>
            <p className="mt-3 text-sm text-slate-300">Du kannst jetzt Termine im Dashboard anzeigen und erstellen.</p>
          </>
        )}
        <Button className="mt-6 w-full" onClick={() => { window.location.href = '/'; }}>Zurueck zum Dashboard</Button>
      </section>
    </main>
  );
}
