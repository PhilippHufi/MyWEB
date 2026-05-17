import { CloudSun, Droplets, RefreshCw, Sunrise, Sunset, Wind } from 'lucide-react';
import { useEffect } from 'react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { WidgetShell } from '../components/WidgetShell';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';

export function WeatherWidget(props) {
  const [city, setCity] = useLocalStorage('life:weather-city', 'Linz');
  const { data, loading, error, run } = useAsync(() => api.weather(city), [city]);

  useEffect(() => {
    const timer = window.setInterval(run, 30 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [run]);

  return (
    <WidgetShell title="Wetter" icon={CloudSun} action={<button className="icon-soft" onClick={run} aria-label="Wetter aktualisieren"><RefreshCw className="h-4 w-4" /></button>} {...props}>
      <div className="mb-4 flex gap-2">
        <input className="life-input" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Stadt" />
        <Button onClick={run}>OK</Button>
      </div>
      {loading && <Loader />}
      <ErrorState message={error} />
      {data && !loading && (
        <div className="space-y-5">
          <div>
            <p className="text-sm text-slate-400">{data.city}</p>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-black text-white">{data.temperature}°</span>
              <span className="pb-2 text-sm capitalize text-cyan-100">{data.status}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric icon={Droplets} label="Luft" value={`${data.humidity ?? '-'}%`} />
            <Metric icon={Wind} label="Wind" value={`${data.wind ?? '-'} m/s`} />
            <Metric icon={Sunrise} label="Aufgang" value={time(data.sunrise)} />
            <Metric icon={Sunset} label="Untergang" value={time(data.sunset)} />
          </div>
        </div>
      )}
    </WidgetShell>
  );
}

function Metric({ icon: Icon, label, value }) {
  return <div className="rounded-md bg-white/5 p-3"><Icon className="mb-2 h-4 w-4 text-cyan-300" /><p className="text-slate-400">{label}</p><p className="font-semibold text-white">{value}</p></div>;
}

function time(value) {
  return value ? new Date(value).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' }) : '-';
}
