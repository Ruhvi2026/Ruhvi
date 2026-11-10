export const MAILFLARE_D1_DATABASE_ID =
  process.env.CLOUDFLARE_MAILFLARE_D1_ID ||
  '72ace44e-4f70-4047-b00b-0d1e7adffda2';

export interface D1QueryResult<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: {
    duration?: number;
    rows_read?: number;
    rows_written?: number;
  };
}

export interface D1Response<T = Record<string, unknown>> {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

export async function queryMailflareD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.warn(
      '[D1 Client] Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN'
    );
    return [];
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${MAILFLARE_D1_DATABASE_ID}/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql, params }),
        // Revalidate frequently or use no-store for fresh email telemetry
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[D1 Client] HTTP error ${res.status}:`, errText);
      return [];
    }

    const data: D1Response<T> = await res.json();
    if (!data.success || !data.result?.[0]?.results) {
      if (data.errors?.length) {
        console.error('[D1 Client] Query error:', data.errors);
      }
      return [];
    }

    return data.result[0].results;
  } catch (error) {
    console.error('[D1 Client] Network/fetch error:', error);
    return [];
  }
}
