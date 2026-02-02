export interface SitemapEntry {
  url: string;
  path: string;
  lastmod?: string;
}

// In-memory cache
let cachedEntries: SitemapEntry[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function crawlSitemap(sitemapUrl: string): Promise<SitemapEntry[]> {
  // Return cache if fresh
  if (cachedEntries && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedEntries;
  }

  try {
    const res = await fetch(sitemapUrl, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Sitemap fetch failed: ${res.status}`);

    const xml = await res.text();
    const entries = parseSitemapXml(xml, sitemapUrl);

    // Check for sitemap index (sub-sitemaps)
    const subSitemaps = extractSubSitemaps(xml);
    if (subSitemaps.length > 0) {
      for (const sub of subSitemaps) {
        try {
          const subRes = await fetch(sub);
          if (subRes.ok) {
            const subXml = await subRes.text();
            entries.push(...parseSitemapXml(subXml, sitemapUrl));
          }
        } catch {
          // Skip failed sub-sitemaps
        }
      }
    }

    cachedEntries = entries;
    cacheTimestamp = Date.now();
    return entries;
  } catch (error) {
    console.error('Sitemap crawl failed:', error);
    return cachedEntries || [];
  }
}

export function clearSitemapCache(): void {
  cachedEntries = null;
  cacheTimestamp = 0;
}

function parseSitemapXml(xml: string, sitemapUrl: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  const urlRegex = /<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g;
  let match;

  // Extract base domain from sitemap URL
  const sitemapOrigin = new URL(sitemapUrl).origin;

  while ((match = urlRegex.exec(xml)) !== null) {
    const url = match[1].trim();
    const lastmod = match[2]?.trim();

    try {
      const parsed = new URL(url);
      entries.push({
        url,
        path: parsed.pathname,
        lastmod,
      });
    } catch {
      // Skip invalid URLs
    }
  }

  return entries;
}

function extractSubSitemaps(xml: string): string[] {
  const sitemaps: string[] = [];
  const sitemapRegex = /<sitemap>\s*<loc>([^<]+)<\/loc>/g;
  let match;

  while ((match = sitemapRegex.exec(xml)) !== null) {
    sitemaps.push(match[1].trim());
  }

  return sitemaps;
}

export function autoCategorize(path: string): string {
  if (path.startsWith('/m/')) return 'model';
  if (path.includes('image-effects') || path.includes('video-effects')) return 'effect';
  if (path.includes('-filter') || path.includes('-transformation')) return 'effect';

  const coreToolPaths = [
    '/text-to-image', '/text-to-video', '/image-to-image', '/image-to-video',
    '/video-to-video', '/image-upscaler', '/video-upscaler', '/image-enhancer',
    '/ai-image-enhancer', '/image-background-remover', '/video-background-remover',
    '/watermark-remover', '/ai-talking-avatar', '/ai-image-animator', '/ai-human-generator',
  ];
  if (coreToolPaths.some(p => path.startsWith(p))) return 'core-tool';

  return 'specialized';
}

export function slugToKeywords(path: string): string[] {
  // Remove leading slash and any language prefix like /es/ /ja/
  let cleanPath = path.replace(/^\/(?:[a-z]{2}\/)?/, '');
  // Remove /m/ prefix for model pages
  cleanPath = cleanPath.replace(/^m\//, '');

  // Use only the last segment of nested paths to avoid duplication
  // e.g. "veo/veo-2" → "veo-2", "seedream/seedream-4-5" → "seedream-4-5"
  const segments = cleanPath.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || cleanPath;

  // Generate keyword variants to handle version numbers with dots/hyphens/spaces
  // e.g. "seedream-4-5" → ["seedream 4.5", "seedream 4-5", "seedream 4 5"]
  const keywords = new Set<string>();

  // Base: hyphens → spaces ("seedream-4-5" → "seedream 4 5")
  const base = lastSegment.replace(/[-_]/g, ' ').trim().toLowerCase();
  if (base) keywords.add(base);

  // Variant: version-style dots ("seedream 4 5" → "seedream 4.5")
  // Pattern: word followed by space-separated numbers → word N.N
  const dotVersion = base.replace(/(\d+)\s+(\d+)/g, '$1.$2');
  if (dotVersion !== base) keywords.add(dotVersion);

  // Variant: hyphenated version ("seedream 4 5" → "seedream 4-5")
  const hyphenVersion = base.replace(/(\d+)\s+(\d+)/g, '$1-$2');
  if (hyphenVersion !== base) keywords.add(hyphenVersion);

  // Also add full path variant for parent context (e.g. "veo 2" and "veo veo 2")
  if (segments.length > 1) {
    const fullKeyword = segments.join(' ').replace(/[-_]/g, ' ').trim().toLowerCase();
    // Only add if meaningfully different from the last-segment keywords
    if (fullKeyword && !keywords.has(fullKeyword)) {
      keywords.add(fullKeyword);
    }
  }

  return Array.from(keywords).filter(k => k.length > 0);
}
