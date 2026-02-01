'use client';

import { useState, useEffect } from 'react';
import { BlogType } from '@/types';

interface ContentCheck {
  id: string;
  name: string;
  category: 'structure' | 'quality' | 'readability' | 'completeness';
  passed: boolean;
  message: string;
  importance: 'critical' | 'important' | 'optional';
  details?: string;
}

interface ContentCheckResult {
  score: number;
  grade: string;
  checks: ContentCheck[];
  suggestions: string[];
  summary: string;
}

interface ContentCheckPanelProps {
  content: string;
  keyword: string;
  title: string;
  blogType: BlogType;
}

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  structure: { label: 'Structure', description: 'Heading hierarchy, sections, and layout' },
  quality: { label: 'Quality', description: 'Content depth, links, and originality' },
  readability: { label: 'Readability', description: 'Sentence length, formatting, and reading level' },
  completeness: { label: 'Completeness', description: 'Required sections, word count, and media' },
};

const IMPORTANCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', label: 'Critical' },
  important: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Important' },
  optional: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Optional' },
};

export function ContentCheckPanel({ content, keyword, title, blogType }: ContentCheckPanelProps) {
  const [result, setResult] = useState<ContentCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/blogs/check-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, keyword, title, blogType }),
      });
      if (!res.ok) throw new Error('Check failed');
      const data = await res.json();
      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run check');
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
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Analyzing content quality...</p>
      </div>
    );
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

  const gradeColor =
    result.score >= 90
      ? 'text-green-600'
      : result.score >= 75
        ? 'text-green-500'
        : result.score >= 60
          ? 'text-yellow-500'
          : result.score >= 40
            ? 'text-orange-500'
            : 'text-red-500';

  const gradeBg =
    result.score >= 90
      ? 'from-green-50 to-green-100 border-green-200'
      : result.score >= 75
        ? 'from-green-50 to-emerald-50 border-green-200'
        : result.score >= 60
          ? 'from-yellow-50 to-amber-50 border-yellow-200'
          : result.score >= 40
            ? 'from-orange-50 to-amber-50 border-orange-200'
            : 'from-red-50 to-rose-50 border-red-200';

  const passed = result.checks.filter((c) => c.passed).length;
  const total = result.checks.length;

  const categories = ['structure', 'quality', 'readability', 'completeness'] as const;

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className={`bg-gradient-to-br ${gradeBg} border rounded-2xl p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Content Quality Score</p>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold ${gradeColor}`}>{result.grade}</span>
              <span className={`text-2xl font-semibold ${gradeColor}`}>{result.score}%</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">{result.summary}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {passed}/{total} checks passed
            </p>
            {/* Mini progress ring */}
            <div className="mt-2 relative w-16 h-16 mx-auto">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeDasharray={`${(passed / total) * 175.9} 175.9`}
                  className={gradeColor}
                />
              </svg>
            </div>
            <button
              onClick={runCheck}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Re-check
            </button>
          </div>
        </div>
      </div>

      {/* Suggestions - What to Fix */}
      {result.suggestions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            What to Fix ({result.suggestions.length})
          </h3>
          <ul className="space-y-2">
            {result.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <span className="text-gray-700">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checks by Category */}
      {categories.map((category) => {
        const categoryChecks = result.checks.filter((c) => c.category === category);
        if (categoryChecks.length === 0) return null;

        const categoryPassed = categoryChecks.filter((c) => c.passed).length;
        const categoryTotal = categoryChecks.length;
        const meta = CATEGORY_LABELS[category];

        return (
          <CategorySection
            key={category}
            label={meta.label}
            description={meta.description}
            passed={categoryPassed}
            total={categoryTotal}
            checks={categoryChecks}
          />
        );
      })}
    </div>
  );
}

function CategorySection({
  label,
  description,
  passed,
  total,
  checks,
}: {
  label: string;
  description: string;
  passed: number;
  total: number;
  checks: ContentCheck[];
}) {
  const [expanded, setExpanded] = useState(passed < total);
  const allPassed = passed === total;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              allPassed ? 'bg-green-100' : 'bg-amber-100'
            }`}
          >
            {allPassed ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              allPassed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {passed}/{total}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-3 space-y-1">
          {checks.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckItem({ check }: { check: ContentCheck }) {
  const style = IMPORTANCE_STYLES[check.importance];

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Pass/Fail indicator */}
      <div className="mt-0.5 flex-shrink-0">
        {check.passed ? (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${check.passed ? 'text-gray-700' : 'text-gray-900'}`}>
            {check.name}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>
        <p className={`text-xs mt-0.5 ${check.passed ? 'text-gray-400' : 'text-gray-600'}`}>{check.message}</p>
        {!check.passed && check.details && (
          <p className="text-xs mt-1 text-blue-600 font-medium">{check.details}</p>
        )}
      </div>
    </div>
  );
}
