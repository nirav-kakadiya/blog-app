'use client';

import { useState } from 'react';

interface Props {
  titles: string[];
  onSelect: (title: string) => void;
  onRegenerate: () => void;
  loading?: boolean;
}

export function TitleSelector({ titles, onSelect, onRegenerate, loading = false }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedTitles, setEditedTitles] = useState<string[]>(titles);

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
    setIsCustom(false);
    setEditingIndex(null);
  };

  const handleCustomSelect = () => {
    setSelectedIndex(null);
    setIsCustom(true);
    setEditingIndex(null);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setSelectedIndex(index);
    setIsCustom(false);
  };

  const handleEditChange = (index: number, value: string) => {
    const updated = [...editedTitles];
    updated[index] = value;
    setEditedTitles(updated);
  };

  const handleEditSave = () => {
    setEditingIndex(null);
  };

  const handleProceed = () => {
    if (isCustom && customTitle.trim()) {
      onSelect(customTitle.trim());
    } else if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < editedTitles.length) {
      const title = editedTitles[selectedIndex];
      if (title) {
        onSelect(title);
      }
    }
  };

  const canProceed = (isCustom && customTitle.trim().length >= 10) || selectedIndex !== null;

  return (
    <div className="space-y-6">
      {/* Header with Regenerate */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Select or customize one of the generated titles</p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Title Options */}
      <div className="space-y-3">
        {editedTitles.map((title, index) => (
          <div
            key={index}
            onClick={() => !loading && handleSelect(index)}
            className={`group relative p-5 rounded-xl border-2 cursor-pointer transition-all ${
              selectedIndex === index
                ? 'border-blue-500 bg-blue-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-start gap-4">
              {/* Radio Circle */}
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                selectedIndex === index
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 group-hover:border-gray-400'
              }`}>
                {selectedIndex === index && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>

              {/* Title Content */}
              <div className="flex-1 min-w-0">
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editedTitles[index]}
                    onChange={(e) => handleEditChange(index, e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                    className="w-full px-3 py-2 text-gray-900 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className={`text-base ${selectedIndex === index ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                    {title}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-400 tabular-nums">{title.length} chars</span>
                {editingIndex !== index && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Selection Indicator */}
            {selectedIndex === index && (
              <div className="absolute top-3 right-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {/* Custom Title Option */}
        <div
          onClick={() => !loading && handleCustomSelect()}
          className={`group relative p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            isCustom
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start gap-4">
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
              isCustom
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-300 group-hover:border-gray-400'
            }`}>
              {isCustom && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <svg className={`w-4 h-4 ${isCustom ? 'text-blue-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span className={`text-sm font-medium ${isCustom ? 'text-blue-700' : 'text-gray-600'}`}>
                  Write your own title
                </span>
              </div>
              {isCustom && (
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter your custom title (at least 10 characters)..."
                  className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={handleProceed}
        disabled={!canProceed || loading}
        className="w-full py-4 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-3"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating Content...
          </>
        ) : (
          <>
            Continue with Selected Title
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}
