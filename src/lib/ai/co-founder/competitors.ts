import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';

export interface CompetitorRecord {
  id: string;
  name: string;
  website_url: string;
  category: string;
  notes?: string | null;
  last_analyzed_at?: string | null;
  latest_insights?: {
    positioning?: string;
    promotions?: string;
    topCategories?: string[];
    strategicCounterMove?: string;
    executiveVoiceSummary?: string;
  } | null;
  created_at: string;
}

/**
 * Fetch all registered competitors
 */
export async function getCompetitors(): Promise<CompetitorRecord[]> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('co_founder_competitors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(
        '[Competitors] Table query failed or table not yet created:',
        error.message
      );
      return [];
    }

    return (data || []) as CompetitorRecord[];
  } catch (err) {
    console.error('[Competitors] getCompetitors unexpected error:', err);
    return [];
  }
}

/**
 * Register a new competitor
 */
export async function addCompetitor(params: {
  name: string;
  websiteUrl: string;
  category?: string;
  notes?: string;
}): Promise<{ success: boolean; data?: CompetitorRecord; error?: string }> {
  const supabase = getServiceClient();

  const formattedUrl = params.websiteUrl.startsWith('http')
    ? params.websiteUrl.trim()
    : `https://${params.websiteUrl.trim()}`;

  try {
    const { data, error } = await supabase
      .from('co_founder_competitors')
      .insert({
        name: params.name.trim(),
        website_url: formattedUrl,
        category: params.category?.trim() || 'Fine Jewellery',
        notes: params.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as CompetitorRecord };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add competitor' };
  }
}

/**
 * Delete a registered competitor
 */
export async function deleteCompetitor(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();

  try {
    const { error } = await supabase
      .from('co_founder_competitors')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to delete competitor',
    };
  }
}

/**
 * Scrape basic public metadata from competitor URL
 */
async function scrapePublicMetadata(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return `Target URL responded with HTTP status ${res.status}`;
    }

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title';

    // Extract meta description
    const descMatch =
      html.match(
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i
      );
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract headings
    const headings: string[] = [];
    const hRegex = /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi;
    let match;
    while ((match = hRegex.exec(html)) !== null && headings.length < 15) {
      const clean = match[1].replace(/\s+/g, ' ').trim();
      if (clean.length > 3) headings.push(clean);
    }

    return `Website Title: ${title}\nMeta Description: ${description}\nHeadlines & Sections: ${headings.join(' | ')}`;
  } catch (err: any) {
    return `Could not reach website directly: ${err.message}. Analyzing based on brand recognition and market knowledge.`;
  }
}

/**
 * Perform AI-powered competitor analysis using Gemini
 */
export async function analyzeCompetitor(id: string): Promise<{
  success: boolean;
  insights?: any;
  voiceSummary?: string;
  error?: string;
}> {
  const supabase = getServiceClient();

  // 1. Fetch competitor record
  const { data: comp, error: fetchErr } = await supabase
    .from('co_founder_competitors')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !comp) {
    return {
      success: false,
      error: fetchErr?.message || 'Competitor not found',
    };
  }

  // 2. Scrape live metadata
  const scrapedData = await scrapePublicMetadata(comp.website_url);

  // 3. Query Gemini for competitive strategy
  const apiKey = process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'GEMINI_LIVE_API_KEY is not configured' };
  }

  const prompt = `You are the strategic AI Co-Founder of Ruhvi Fine Jewellery (a direct-to-consumer fine jewellery brand in India specializing in 22K gold-plated, anti-tarnish, waterproof, and handcrafted luxury pieces).

We are tracking a competitor:
Brand Name: ${comp.name}
Website: ${comp.website_url}
Category: ${comp.category}
Founder Notes: ${comp.notes || 'None'}

Live Web Data Extracted:
${scrapedData}

Analyze this competitor specifically in relation to Ruhvi's market position. Return a valid JSON object strictly matching this schema:
{
  "positioning": "Brief summary of their pricing tier and target audience (e.g. Budget silver, Demi-fine, High-end bridal)",
  "promotions": "Active or observable discount strategies and conversion hooks",
  "topCategories": ["Category 1", "Category 2", "Category 3"],
  "strategicCounterMove": "Concrete action Ruhvi should take to differentiate, out-compete, or capture their audience",
  "executiveVoiceSummary": "A concise 2-sentence conversational summary spoken aloud to the founder on LiveKit audio."
}`;

  try {
    // Try gemini-3.5-flash-lite first, fallback to gemini-flash-latest
    const models = ['gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let parsedData: any = null;

    for (const model of models) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2,
              },
            }),
          }
        );

        if (resp.ok) {
          const json = await resp.json();
          const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            parsedData = JSON.parse(rawText);
            break;
          }
        }
      } catch {
        continue;
      }
    }

    if (!parsedData) {
      return {
        success: false,
        error: 'Failed to generate competitor insights from Gemini',
      };
    }

    // 4. Update competitor record in DB
    await supabase
      .from('co_founder_competitors')
      .update({
        last_analyzed_at: new Date().toISOString(),
        latest_insights: parsedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      success: true,
      insights: parsedData,
      voiceSummary:
        parsedData.executiveVoiceSummary ||
        `Analyzed ${comp.name}. Strategic recommendation: ${parsedData.strategicCounterMove}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Analysis failed' };
  }
}
