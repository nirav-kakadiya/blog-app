'use client';

import { useState, useEffect } from 'react';
import { BlogType } from '@/types';
import { SEOPanel } from '@/components/SEOPanel';
import { SkeletonTabPanel } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { Check, X, Zap, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { getScoreColor as getScoreHex } from '@/lib/score-utils';

interface SearchCheck {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
}

interface UnifiedSuggestion {
  source: 'seo' | 'aeo' | 'schema';
  importance: 'critical' | 'important' | 'optional';
  message: string;
}

interface SchemaItem {
  type: string;
  data: Record<string, unknown>;
}

interface SearchScoreResult {
  overall: number;
  grade: string;
  seo: { score: number; checks: SearchCheck[]; suggestions: string[] };
  aeo: { score: number; checks: SearchCheck[]; suggestions: string[] };
  schemas: { schemas: SchemaItem[]; jsonLd: string };
  suggestions: UnifiedSuggestion[];
  summary: string;
}

interface SEOSettingsProps {
  content: string;
  initialData: {
    title: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    canonicalUrl: string;
  };
  onChange: (data: {
    title: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    canonicalUrl: string;
  }) => void;
}

interface SearchScorePanelProps {
  content: string;
  keyword: string;
  title: string;
  blogType: BlogType;
  metaDescription?: string;
  seoSettings?: SEOSettingsProps;
}

const IMPORTANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  important: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Important' },
  optional: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Optional' },
};

export function SearchScorePanel({ content, keyword, title, blogType, metaDescription, seoSettings }: SearchScorePanelProps) {
  const [result, setResult] = useState<SearchScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'seo' | 'aeo' | 'schema' | 'settings'>('seo');
  const toast = useToast();

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blogs/search-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, keyword, title, blogType, metaDescription }),
      });
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (content && keyword && title) {
      runCheck();
    }
  }, []);

  if (loading) {
    return <SkeletonTabPanel />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={runCheck} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          Retry
        </button>
      </div>
    );
  }

  if (!result) return null;

  const overallColor = getTextColor(result.overall);
  const seoColor = getTextColor(result.seo.score);
  const aeoColor = getTextColor(result.aeo.score);

  const tabs = seoSettings
    ? (['seo', 'aeo', 'schema', 'settings'] as const)
    : (['seo', 'aeo', 'schema'] as const);

  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Unified Search Score</p>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold ${overallColor}`}>{result.grade}</span>
              <span className={`text-2xl font-semibold ${overallColor}`}>{result.overall}%</span>
            </div>
            <p className="text-sm text-gray-500 mt-2 max-w-md">{result.summary}</p>
          </div>
          <button
            onClick={runCheck}
            className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-analyze
          </button>
        </div>

        {/* SEO vs AEO side by side */}
        <div className="grid grid-cols-2 gap-4">
          <ScoreRing label="SEO" score={result.seo.score} color={seoColor} subtitle="Traditional Search" />
          <ScoreRing label="AEO" score={result.aeo.score} color={aeoColor} subtitle="AI/LLM Search" />
        </div>

        {/* Schema badges */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 mb-2">Schema.org Structured Data</p>
          <div className="flex flex-wrap gap-2">
            {result.schemas.schemas.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                {s.type}
              </span>
            ))}
            {result.schemas.schemas.length === 0 && (
              <span className="text-xs text-gray-400">No schemas generated</span>
            )}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            What to Fix ({result.suggestions.length})
          </h3>
          <ul className="space-y-2">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                  IMPORTANCE_STYLES[s.importance].bg} ${IMPORTANCE_STYLES[s.importance].text}`}>
                  {s.source.toUpperCase()}
                </span>
                <span className="text-gray-700">{s.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex-shrink-0 ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab === 'seo' ? `SEO Checks (${result.seo.score}%)` :
               tab === 'aeo' ? `AEO Checks (${result.aeo.score}%)` :
               tab === 'schema' ? `Schema (${result.schemas.schemas.length})` :
               'Settings'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'seo' && <CheckList checks={result.seo.checks} />}
          {activeTab === 'aeo' && <CheckList checks={result.aeo.checks} />}
          {activeTab === 'schema' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">
                  Generated JSON-LD ({result.schemas.schemas.map((s) => s.type).join(', ')})
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<script type="application/ld+json">\n${result.schemas.jsonLd}\n</script>`
                    );
                    toast.success('JSON-LD copied to clipboard');
                  }}
                  className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy JSON-LD
                </button>
              </div>
              <pre className="bg-gray-900 text-green-400 text-xs rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
                <code>{`<script type="application/ld+json">\n${result.schemas.jsonLd}\n</script>`}</code>
              </pre>
            </div>
          )}
          {activeTab === 'settings' && seoSettings && (
            <SEOPanel
              content={seoSettings.content}
              initialData={seoSettings.initialData}
              onChange={seoSettings.onChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ label, score, color, subtitle }: { label: string; score: number; color: string; subtitle: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 rounded-xl">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle
            cx="40" cy="40" r="36" fill="none"
            stroke="currentColor" strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`${color} transition-all duration-700 ease-out`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${color}`}>{score}%</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900 mt-2">{label}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  );
}

function CheckList({ checks }: { checks: SearchCheck[] }) {
  const groups = {
    critical: checks.filter((c) => c.importance === 'critical'),
    important: checks.filter((c) => c.importance === 'important'),
    optional: checks.filter((c) => c.importance === 'optional'),
  };

  return (
    <div className="space-y-4">
      {(['critical', 'important', 'optional'] as const).map((group) => {
        const items = groups[group];
        if (items.length === 0) return null;
        const style = IMPORTANCE_STYLES[group];
        const passed = items.filter((c) => c.passed).length;

        return (
          <div key={group}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                {style.label}
              </span>
              <span className="text-xs text-gray-400">{passed}/{items.length} passed</span>
            </div>
            <div className="space-y-1">
              {items.map((check) => (
                <div key={check.id} className="flex items-start gap-2.5 py-1.5">
                  {check.passed ? (
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm ${check.passed ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                      {check.name}
                    </p>
                    <p className={`text-xs ${check.passed ? 'text-gray-400' : 'text-gray-600'}`}>
                      {check.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTextColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-red-500';
}
