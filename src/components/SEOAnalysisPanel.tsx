'use client';

import { useState, useEffect } from 'react';

interface SEOCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
}

interface SEOResult {
  score: number;
  checks: SEOCheck[];
  suggestions: string[];
}

interface SEOAnalysisPanelProps {
  content: string;
  keyword: string;
  title: string;
}

export function SEOAnalysisPanel({ content, keyword, title }: SEOAnalysisPanelProps) {
  const [result, setResult] = useState<SEOResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use search-score endpoint and extract just SEO
      const res = await fetch('/api/blogs/search-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, keyword, title, blogType: 'guide' }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data.data.seo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (content && keyword && title) runCheck();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Analyzing SEO...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={runCheck} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Retry</button>
      </div>
    );
  }

  if (!result) return null;

  const scoreColor = getColor(result.score);
  const passed = result.checks.filter((c) => c.passed).length;
  const grade = result.score >= 90 ? 'A' : result.score >= 75 ? 'B' : result.score >= 60 ? 'C' : result.score >= 40 ? 'D' : 'F';

  return (
    <div className="space-y-6">
      {/* Score Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">SEO Score — Traditional Search</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className={`text-5xl font-bold ${scoreColor}`}>{grade}</span>
              <span className={`text-2xl font-semibold ${scoreColor}`}>{result.score}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{passed}/{result.checks.length} checks passed — Optimized for Google, Bing rankings</p>
          </div>
          <div className="flex flex-col items-center">
            <ScoreRing score={result.score} color={scoreColor} />
            <button onClick={runCheck} className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">Re-check</button>
          </div>
        </div>
      </div>

      {/* What SEO Checks */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">What does SEO optimize for?</h3>
        <p className="text-xs text-gray-500 mb-4">These checks ensure your content ranks in traditional search engines (Google, Bing) through keyword placement, meta optimization, and content structure.</p>

        {/* Failed checks first */}
        {result.suggestions.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 mb-2">Improvements needed ({result.suggestions.length})</p>
            {result.suggestions.map((s, i) => (
              <p key={i} className="text-xs text-amber-600 ml-2 mb-1">• {s}</p>
            ))}
          </div>
        )}

        {/* All checks grouped */}
        <CheckGroup label="Critical" checks={result.checks.filter((c) => c.importance === 'critical')} />
        <CheckGroup label="Important" checks={result.checks.filter((c) => c.importance === 'important')} />
        <CheckGroup label="Optional" checks={result.checks.filter((c) => c.importance === 'optional')} />
      </div>
    </div>
  );
}

function CheckGroup({ label, checks }: { label: string; checks: SEOCheck[] }) {
  if (checks.length === 0) return null;
  const passed = checks.filter((c) => c.passed).length;
  const style =
    label === 'Critical' ? { bg: 'bg-red-100', text: 'text-red-700' } :
    label === 'Important' ? { bg: 'bg-yellow-100', text: 'text-yellow-700' } :
    { bg: 'bg-gray-100', text: 'text-gray-600' };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>{label}</span>
        <span className="text-xs text-gray-400">{passed}/{checks.length}</span>
      </div>
      {checks.map((check) => (
        <div key={check.id} className="flex items-start gap-2.5 py-1.5 ml-1">
          {check.passed ? (
            <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <div>
            <p className={`text-sm ${check.passed ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>{check.name}</p>
            <p className={`text-xs ${check.passed ? 'text-gray-400' : 'text-gray-600'}`}>{check.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const c = 2 * Math.PI * 36;
  const o = c - (score / 100) * c;
  return (
    <div className="relative w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="5"
          strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" className={color} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${color}`}>{score}%</span>
      </div>
    </div>
  );
}

function getColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}
