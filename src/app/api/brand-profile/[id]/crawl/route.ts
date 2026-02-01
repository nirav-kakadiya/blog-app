import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError } from '@/lib/errors';
import { crawlSitemap, autoCategorize, slugToKeywords, clearSitemapCache } from '@/lib/platform-links';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const profile = await prisma.brandProfile.findUnique({ where: { id } });
    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }
    if (!profile.sitemapUrl) {
      return NextResponse.json({ success: false, error: 'No sitemap URL configured' }, { status: 400 });
    }

    // Clear cache to force fresh crawl
    clearSitemapCache();
    const entries = await crawlSitemap(profile.sitemapUrl);

    if (entries.length === 0) {
      return NextResponse.json({ success: false, error: 'No entries found in sitemap' }, { status: 400 });
    }

    // Get existing tools to avoid duplicates
    const existingTools = await prisma.brandTool.findMany({
      where: { brandProfileId: id },
      select: { path: true },
    });
    const existingPaths = new Set(existingTools.map(t => t.path));

    // Filter out pages that are already tools and non-tool pages (legal, etc.)
    const skipPaths = new Set(['/', '/terms.html', '/privacy.html', '/cancellation.html']);
    const newEntries = entries.filter(e =>
      !existingPaths.has(e.path) &&
      !skipPaths.has(e.path) &&
      e.path !== '' &&
      !e.path.includes('.html') // Skip static HTML pages
    );

    // Auto-categorize and prepare tool data
    const discoveredTools = newEntries.map(entry => {
      const category = autoCategorize(entry.path);
      const keywords = slugToKeywords(entry.path);
      const name = keywords[0]
        ? keywords[0].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        : entry.path.replace(/^\//, '').replace(/[-_]/g, ' ');

      return {
        path: entry.path,
        name,
        category,
        keywords,
        url: entry.url,
        lastmod: entry.lastmod,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalEntries: entries.length,
        newEntries: discoveredTools.length,
        existingCount: existingPaths.size,
        discovered: discoveredTools,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
