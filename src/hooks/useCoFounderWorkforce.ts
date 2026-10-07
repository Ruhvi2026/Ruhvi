import { useEffect, useState } from 'react';
import { AgentNode } from '@/components/ai/motion-engine/types';

export interface WorkforceApiResponse {
  nodes: AgentNode[];
  summary: {
    totalWorkers: number;
    activeWorkers: number;
    pendingApprovals: number;
    activeSignals: number;
    criticalSignals: number;
  };
  timestamp: string;
}

export function useCoFounderWorkforce() {
  const [data, setData] = useState<WorkforceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch('/api/admin/co-founder/workers', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json: WorkforceApiResponse = await res.json();
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to fetch workforce data';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}
