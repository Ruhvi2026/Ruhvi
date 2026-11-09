import 'server-only';
import {
  NormalizedSearchResult,
  ProviderStatus,
  ResearchSearchOptions,
} from '../types';

export interface GitHubSearchResult {
  status: ProviderStatus;
  results: NormalizedSearchResult[];
  error?: string;
}

/**
 * GitHub Specialist Provider Adapter
 * Searches public repositories, developer documentation, and security advisories.
 * Works unauthenticated (60 req/hr) or with optional GITHUB_READ_TOKEN (5,000 req/hr).
 * Never used as a general web search replacement.
 */
export class GitHubProvider {
  private getToken(): string | null {
    return process.env.GITHUB_READ_TOKEN || null;
  }

  async search(options: ResearchSearchOptions): Promise<GitHubSearchResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s budget

    try {
      const perPage = Math.min(options.maxResults || 5, 10);
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(options.query)}&per_page=${perPage}`;

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Ruhvi-CoFounder-Research/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      };

      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (res.status === 403 || res.status === 429) {
        return {
          status: 'rate_limited',
          results: [],
          error: 'GitHub API rate limit exceeded.',
        };
      }

      if (!res.ok) {
        return {
          status: 'degraded',
          results: [],
          error: `GitHub search returned HTTP error ${res.status}.`,
        };
      }

      const data = await res.json().catch(() => null);
      if (!data || !Array.isArray(data.items)) {
        return {
          status: 'degraded',
          results: [],
          error: 'Invalid response format from GitHub API.',
        };
      }

      const normalized: NormalizedSearchResult[] = data.items.map(
        (repo: any) => ({
          title: repo.full_name || repo.name || 'GitHub Repository',
          url: repo.html_url,
          snippet: (
            repo.description || `GitHub repository: ${repo.full_name}`
          ).slice(0, 400),
          domain: 'github.com',
          publishedAt: repo.pushed_at || repo.updated_at,
          retrievedAt: new Date().toISOString(),
          provider: 'github',
          score: repo.stargazers_count,
          raw: repo,
        })
      );

      return {
        status: 'healthy',
        results: normalized,
      };
    } catch (err: any) {
      const isTimeout = err?.name === 'AbortError';
      return {
        status: 'degraded',
        results: [],
        error: isTimeout
          ? 'GitHub search timed out after 10s.'
          : err?.message || 'GitHub search error.',
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const gitHubProvider = new GitHubProvider();
