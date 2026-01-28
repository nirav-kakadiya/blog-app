'use client';

import { useState, useCallback } from 'react';

interface BlogImage {
  id: string;
  prompt: string;
  s3Url: string;
  altText: string;
  placement: string;
  sectionId?: string;
}

interface ImagePanelProps {
  blogId: string;
  images: BlogImage[];
  onInsert?: (image: BlogImage) => void;
  onRegenerate?: (imageId: string, newPrompt?: string) => Promise<void>;
  onDelete?: (imageId: string) => Promise<void>;
  onUpdateAltText?: (imageId: string, altText: string) => Promise<void>;
  onGenerateNew?: (prompt: string) => Promise<void>;
  isGenerating?: boolean;
}

export function ImagePanel({
  blogId,
  images: rawImages,
  onInsert,
  onRegenerate,
  onDelete,
  onUpdateAltText,
  onGenerateNew,
  isGenerating = false,
}: ImagePanelProps) {
  // Ensure images is always an array to handle API returning non-array values
  const images = Array.isArray(rawImages) ? rawImages : [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingAltText, setEditingAltText] = useState<string | null>(null);
  const [newPrompt, setNewPrompt] = useState('');
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRegenerate = useCallback(async (imageId: string, prompt?: string) => {
    if (!onRegenerate) return;
    setRegeneratingId(imageId);
    try {
      await onRegenerate(imageId, prompt);
    } finally {
      setRegeneratingId(null);
    }
  }, [onRegenerate]);

  const handleDelete = useCallback(async (imageId: string) => {
    if (!onDelete) return;
    if (!confirm('Delete this image?')) return;
    setDeletingId(imageId);
    try {
      await onDelete(imageId);
    } finally {
      setDeletingId(null);
    }
  }, [onDelete]);

  const handleUpdateAltText = useCallback(async (imageId: string, altText: string) => {
    if (!onUpdateAltText) return;
    const trimmedAltText = altText?.trim() || '';
    if (!trimmedAltText) return; // Don't save empty alt text
    await onUpdateAltText(imageId, trimmedAltText);
    setEditingAltText(null);
  }, [onUpdateAltText]);

  const handleGenerateNew = useCallback(async () => {
    if (!onGenerateNew || !newPrompt.trim()) return;
    await onGenerateNew(newPrompt.trim());
    setNewPrompt('');
    setShowNewPromptForm(false);
  }, [onGenerateNew, newPrompt]);

  const selectedImage = images.find(img => img.id === selectedId);

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Blog Images</h3>
          <p className="text-sm text-gray-500">{images.length} images</p>
        </div>
        {onGenerateNew && (
          <button
            onClick={() => setShowNewPromptForm(!showNewPromptForm)}
            disabled={isGenerating}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Generating...' : '+ Add Image'}
          </button>
        )}
      </div>

      {/* New Image Form */}
      {showNewPromptForm && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="Enter image prompt..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setShowNewPromptForm(false);
                setNewPrompt('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateNew}
              disabled={!newPrompt.trim() || isGenerating}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Generate
            </button>
          </div>
        </div>
      )}

      {/* Image Grid */}
      <div className="flex-1 overflow-auto p-4">
        {images.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No images generated yet</p>
            {onGenerateNew && (
              <button
                onClick={() => setShowNewPromptForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Generate your first image
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                isSelected={selectedId === image.id}
                isRegenerating={regeneratingId === image.id}
                isDeleting={deletingId === image.id}
                onSelect={() => setSelectedId(image.id === selectedId ? null : image.id)}
                onInsert={onInsert ? () => onInsert(image) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Image Details */}
      {selectedImage && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Placement</label>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
              {selectedImage.placement.replace('_', ' ')}
            </span>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Alt Text</label>
            {editingAltText === selectedImage.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue={selectedImage.altText}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUpdateAltText(selectedImage.id, e.currentTarget.value);
                    } else if (e.key === 'Escape') {
                      setEditingAltText(null);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => setEditingAltText(null)}
                  className="text-xs text-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p
                className="text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-1 rounded"
                onClick={() => onUpdateAltText && setEditingAltText(selectedImage.id)}
                title="Click to edit"
              >
                {selectedImage.altText}
              </p>
            )}
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Prompt</label>
            <p className="text-xs text-gray-600 max-h-20 overflow-y-auto">{selectedImage.prompt}</p>
          </div>

          <div className="flex gap-2">
            {onInsert && (
              <button
                onClick={() => onInsert(selectedImage)}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Insert
              </button>
            )}
            {onRegenerate && (
              <button
                onClick={() => handleRegenerate(selectedImage.id)}
                disabled={regeneratingId === selectedImage.id}
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {regeneratingId === selectedImage.id ? '...' : 'Regenerate'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => handleDelete(selectedImage.id)}
                disabled={deletingId === selectedImage.id}
                className="px-3 py-1.5 text-red-600 text-sm hover:bg-red-50 rounded disabled:opacity-50"
              >
                {deletingId === selectedImage.id ? '...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageCardProps {
  image: BlogImage;
  isSelected: boolean;
  isRegenerating: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onInsert?: () => void;
}

function ImageCard({
  image,
  isSelected,
  isRegenerating,
  isDeleting,
  onSelect,
  onInsert,
}: ImageCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative group rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'
      } ${isRegenerating || isDeleting ? 'opacity-50' : ''}`}
      onClick={onSelect}
    >
      <div className="aspect-video bg-gray-100 relative">
        {isLoading && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ) : (
          <img
            src={image.s3Url}
            alt={image.altText}
            className={`w-full h-full object-cover ${isLoading ? 'invisible' : ''}`}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {onInsert && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInsert();
              }}
              className="px-3 py-1.5 bg-white text-gray-900 text-sm rounded-lg hover:bg-gray-100"
            >
              Insert
            </button>
          )}
        </div>

        {/* Placement badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded capitalize">
            {image.placement.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}
