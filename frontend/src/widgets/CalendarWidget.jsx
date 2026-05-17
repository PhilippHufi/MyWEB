import { CalendarDays, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { WidgetShell } from '../components/WidgetShell';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';

export function CalendarWidget(props) {
  const { data = [], loading, error, run } = useAsync(api.googleEvents, [], { initialData: [] });
  const [form, setForm] = useState({ title: '', start: '', end: '', location: '' });
  const grouped = useMemo(() => groupByDay(data || []), [data]);

  async function connect() {
    const { url, redirectUri } = await api.googleAuthUrl();
    localStorage.setItem('life:google-redirect-uri', redirectUri);
    window.location.href = url;
  }

  async function createEvent(event) {
    event.preventDefault();
    await api.createGoogleEvent(form);
    setForm({ title: '', start: '', end: '', location: '' });
    run();
  }

  return (
    <WidgetShell title="Google Calendar" icon={CalendarDays} action={<button className="icon-soft" onClick={run} aria-label="Kalender aktualisieren"><RefreshCw className="h-4 w-4" /></button>} className="lg:col-span-2" {...props}>
      {loading && <Loader />}
      <ErrorState message={error} />
      {(error?.includes('not connected') || error?.includes('Google Calendar')) && <Button onClick={connect}>Google verbinden</Button>}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-3">
          {Object.entries(grouped).map(([day, events]) => (
            <div key={day} className="rounded-md bg-white/5 p-3">
              <p className="mb-2 text-sm font-semibold text-cyan-200">{day}</p>
              {events.map((event) => <p key={event.id} className="text-sm text-slate-200">{formatTime(event.start)} - {event.title}</p>)}
            </div>
          ))}
          {!loading && !Object.keys(grouped).length && !error && <p className="text-sm text-slate-400">Keine Termine in den nächsten 7 Tagen.</p>}
        </div>
        <form className="space-y-2" onSubmit={createEvent}>
          <input className="life-input" placeholder="Neuer Termin" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <input className="life-input" type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
          <input className="life-input" type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
          <input className="life-input" placeholder="Ort" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Button className="w-full"><Plus className="h-4 w-4" /> Termin</Button>
        </form>
      </div>
    </WidgetShell>
  );
}

function groupByDay(events) {
  return events.reduce((acc, event) => {
    const key = new Date(event.start).toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit' });
    acc[key] = acc[key] || [];
    acc[key].push(event);
    return acc;
  }, {});
}

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '';
}
