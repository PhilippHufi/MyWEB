import { useCallback, useEffect, useState } from 'react';

export function useAsync(loader, deps = [], options = {}) {
  const [data, setData] = useState(options.initialData ?? null);
  const [loading, setLoading] = useState(Boolean(options.immediate ?? true));
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await loader();
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Fehler beim Laden');
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    if (options.immediate !== false) run();
  }, [run, options.immediate]);

  return { data, setData, loading, error, run };
}
