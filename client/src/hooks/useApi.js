import { useCallback, useEffect, useState } from 'react';
import api, { errorInfo } from '../api/client';

// GET helper: returns { data, loading, error, reload }. Pass a falsy path to skip.
export default function useApi(path, params) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: '' });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify([path, params]);

  useEffect(() => {
    if (!path) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: '' }));
    api.get(path, { params })
      .then((res) => alive && setState({ data: res.data, loading: false, error: '' }))
      .catch((err) => alive && setState({ data: null, loading: false, error: errorInfo(err).message }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
