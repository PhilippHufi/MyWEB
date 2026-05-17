import { Laugh, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { WidgetShell } from '../components/WidgetShell';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';

export function JokeWidget(props) {
  const { data, loading, error, run } = useAsync(api.joke, []);
  return (
    <WidgetShell title="Witz" icon={Laugh} action={<button className="icon-soft" onClick={run} aria-label="Neuer Witz"><RefreshCw className="h-4 w-4" /></button>} {...props}>
      {loading && <Loader />}
      <ErrorState message={error} />
      {data && <div className="space-y-4"><p className="text-lg font-semibold text-white">{data.setup}</p><p className="rounded-md bg-fuchsia-400/10 p-3 text-fuchsia-100">{data.punchline}</p></div>}
    </WidgetShell>
  );
}
