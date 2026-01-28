'use client';

import { useState, useEffect, useMemo } from 'react';

interface SEOData {
  title: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  canonicalUrl: string;
}

interface SEOAnalysis {
  score: number;
  checks: {
    id: string;
    label: string;
    passed: boolean;
    message: string;
  }[];
}

interface SEOPanelProps {
  content: string;
  initialData?: Partial<SEOData>;
  onChange?: (data: SEOData) => void;
}

export function SEOPanel({ content, initialData, onChange }: SEOPanelProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription || '');
  const [focusKeyword, setFocusKeyword] = useState(initialData?.focusKeyword || '');
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(initialData?.secondaryKeywords || []);
  const [canonicalUrl, setCanonicalUrl] = useState(initialData?.canonicalUrl || '');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (onChange) {
      onChange({ title, metaDescription, focusKeyword, secondaryKeywords, canonicalUrl });
    }
  }, [title, metaDescription, focusKeyword, secondaryKeywords, canonicalUrl, onChange]);

  const analysis = useMemo((): SEOAnalysis => {
    const checks: SEOAnalysis['checks'] = [];
    let score = 0;

    // Title checks
    const titleLength = title.length;
    checks.push({
      id: 'title-length',
      label: 'Title length',
      passed: titleLength >= 30 && titleLength <= 60,
      message: titleLength === 0
        ? 'Add a title'
        : titleLength < 30
        ? `Too short (${titleLength}/30-60 chars)`
        : titleLength > 60
        ? `Too long (${titleLength}/60 chars max)`
        : `Good (${titleLength} chars)`,
    });
    if (titleLength >= 30 && titleLength <= 60) score += 15;

    // Title contains focus keyword
    if (focusKeyword) {
      const titleHasKeyword = title.toLowerCase().includes(focusKeyword.toLowerCase());
      checks.push({
        id: 'title-keyword',
        label: 'Keyword in title',
        passed: titleHasKeyword,
        message: titleHasKeyword ? 'Focus keyword found in title' : 'Add focus keyword to title',
      });
      if (titleHasKeyword) score += 10;
    }

    // Meta description checks
    const descLength = metaDescription.length;
    checks.push({
      id: 'meta-length',
      label: 'Meta description',
      passed: descLength >= 120 && descLength <= 155,
      message: descLength === 0
        ? 'Add a meta description'
        : descLength < 120
        ? `Too short (${descLength}/120-155 chars)`
        : descLength > 155
        ? `Too long (${descLength}/155 chars max)`
        : `Good (${descLength} chars)`,
    });
    if (descLength >= 120 && descLength <= 155) score += 15;

    // Meta contains focus keyword
    if (focusKeyword) {
      const metaHasKeyword = metaDescription.toLowerCase().includes(focusKeyword.toLowerCase());
      checks.push({
        id: 'meta-keyword',
        label: 'Keyword in meta',
        passed: metaHasKeyword,
        message: metaHasKeyword ? 'Focus keyword found in meta description' : 'Add focus keyword to meta description',
      });
      if (metaHasKeyword) score += 10;
    }

    // Content checks
    if (focusKeyword && content) {
      const contentLower = content.toLowerCase();
      const keywordLower = focusKeyword.toLowerCase();

      // Keyword in first 100 words
      const first100Words = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
      const keywordInFirst100 = first100Words.includes(keywordLower);
      checks.push({
        id: 'keyword-intro',
        label: 'Keyword in intro',
        passed: keywordInFirst100,
        message: keywordInFirst100 ? 'Keyword in first 100 words' : 'Add keyword in first 100 words',
      });
      if (keywordInFirst100) score += 10;

      // Keyword density
      const wordCount = content.split(/\s+/).length;
      const keywordCount = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
      const goodDensity = density >= 0.5 && density <= 2.5;
      checks.push({
        id: 'keyword-density',
        label: 'Keyword density',
        passed: goodDensity,
        message: `${density.toFixed(2)}% (target: 0.5-2.5%)`,
      });
      if (goodDensity) score += 10;

      // Keyword in H2
      const h2Regex = /##\s+(.+)/g;
      let h2Match;
      let keywordInH2 = false;
      while ((h2Match = h2Regex.exec(content)) !== null) {
        const h2Text = h2Match[1];
        if (h2Text && h2Text.toLowerCase().includes(keywordLower)) {
          keywordInH2 = true;
          break;
        }
      }
      checks.push({
        id: 'keyword-h2',
        label: 'Keyword in H2',
        passed: keywordInH2,
        message: keywordInH2 ? 'Found in at least one H2' : 'Add keyword to at least one H2',
      });
      if (keywordInH2) score += 10;
    }

    // Content length
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const goodLength = wordCount >= 1000;
    checks.push({
      id: 'content-length',
      label: 'Content length',
      passed: goodLength,
      message: `${wordCount} words (${goodLength ? 'good' : 'aim for 1000+'})`,
    });
    if (goodLength) score += 10;

    // Has internal links
    const internalLinkRegex = /\[([^\]]+)\]\(\/[^)]+\)/g;
    const internalLinks = (content.match(internalLinkRegex) || []).length;
    checks.push({
      id: 'internal-links',
      label: 'Internal links',
      passed: internalLinks >= 2,
      message: `${internalLinks} internal links (aim for 2+)`,
    });
    if (internalLinks >= 2) score += 5;

    // Has external links
    const externalLinkRegex = /\[([^\]]+)\]\(https?:\/\/[^)]+\)/g;
    const externalLinks = (content.match(externalLinkRegex) || []).length;
    checks.push({
      id: 'external-links',
      label: 'External links',
      passed: externalLinks >= 1,
      message: `${externalLinks} external links (aim for 1+)`,
    });
    if (externalLinks >= 1) score += 5;

    return { score, checks };
  }, [title, metaDescription, focusKeyword, content]);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !secondaryKeywords.includes(newKeyword.trim())) {
      setSecondaryKeywords([...secondaryKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSecondaryKeywords(secondaryKeywords.filter((k) => k !== keyword));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">SEO Settings</h3>
          <div className={`px-3 py-1 rounded-full border ${getScoreColor(analysis.score)}`}>
            <span className="font-medium">{analysis.score}/100</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SEO Title
            <span className={`ml-2 text-xs ${title.length > 60 ? 'text-red-500' : 'text-gray-400'}`}>
              {title.length}/60
            </span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter SEO title..."
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              title.length > 60 ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>

        {/* Meta Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Description
            <span className={`ml-2 text-xs ${metaDescription.length > 155 ? 'text-red-500' : 'text-gray-400'}`}>
              {metaDescription.length}/155
            </span>
          </label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="Enter meta description..."
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              metaDescription.length > 155 ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        </div>

        {/* Focus Keyword */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Focus Keyword
          </label>
          <input
            type="text"
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            placeholder="e.g., AI image generation"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Secondary Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secondary Keywords
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
              placeholder="Add keyword..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAddKeyword}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Add
            </button>
          </div>
          {secondaryKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {secondaryKeywords.map((keyword, idx) => (
                <span
                  key={`${keyword}-${idx}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Canonical URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Canonical URL
          </label>
          <input
            type="url"
            value={canonicalUrl}
            onChange={(e) => setCanonicalUrl(e.target.value)}
            placeholder="https://yourdomain.com/blog/post-slug"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Set the primary URL for this content to avoid duplicate content issues
          </p>
        </div>
      </div>

      {/* SEO Checklist */}
      <div className="border-t border-gray-200 p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">SEO Checklist</h4>
        <div className="space-y-2">
          {analysis.checks.map((check) => (
            <div
              key={check.id}
              className={`flex items-center gap-2 text-sm ${
                check.passed ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {check.passed ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth={2} />
                </svg>
              )}
              <span className="font-medium">{check.label}:</span>
              <span className={check.passed ? '' : 'text-gray-400'}>{check.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
