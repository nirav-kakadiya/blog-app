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
    } else if (selectedIndex !== null) {
      onSelect(editedTitles[selectedIndex]);
    }
  };

  const canProceed = (isCustom && customTitle.trim().length >= 10) || selectedIndex !== null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Select a Title</h2>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {loading ? 'Regenerating...' : 'Regenerate Titles'}
        </button>
      </div>

      <div className="space-y-3">
        {editedTitles.map((title, index) => (
          <div
            key={index}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              selectedIndex === index
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleSelect(index)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start flex-1">
                <input
                  type="radio"
                  name="title"
                  checked={selectedIndex === index && !isCustom}
                  onChange={() => handleSelect(index)}
                  className="mt-1 mr-3"
                />
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editedTitles[index]}
                    onChange={(e) => handleEditChange(index, e.target.value)}
                    onBlur={handleEditSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="text-gray-900">{title}</span>
                )}
              </div>
              <div className="flex items-center ml-2 space-x-2">
                <span className="text-xs text-gray-400">{title.length} chars</span>
                {editingIndex !== index && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(index);
                    }}
                    className="text-xs text-gray-500 hover:text-blue-600"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Custom Title Option */}
        <div
          className={`p-4 border rounded-lg cursor-pointer transition-all ${
            isCustom
              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={handleCustomSelect}
        >
          <div className="flex items-start">
            <input
              type="radio"
              name="title"
              checked={isCustom}
              onChange={handleCustomSelect}
              className="mt-1 mr-3"
            />
            <div className="flex-1">
              <span className="text-gray-700">Write custom title</span>
              {isCustom && (
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter your custom title..."
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleProceed}
        disabled={!canProceed || loading}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Continue with Selected Title
      </button>
    </div>
  );
}
