import { Quote, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { WidgetShell } from '../components/WidgetShell';
import { Loader } from '../components/Loader';
import { ErrorState } from '../components/ErrorState';

export function QuoteWidget(props) {
  const { data, loading, error, run } = useAsync(api.quote, []);
  return (
    <WidgetShell title="Zitat" icon={Quote} action={<button className="icon-soft" onClick={run} aria-label="Neues Zitat"><RefreshCw className="h-4 w-4" /></button>} {...props}>
      {loading && <Loader />}
      <ErrorState message={error} />
      {data && <blockquote className="space-y-4"><p className="text-xl font-semibold leading-snug text-white">"{data.content}"</p><footer className="text-sm text-cyan-200">{data.author}</footer></blockquote>}
    </WidgetShell>
  );
}
