'use client';

import { useState, useCallback } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

interface FAQEditorProps {
  initialFaqs?: FAQ[];
  onChange?: (faqs: FAQ[]) => void;
  onRegenerate?: (faqId: string) => Promise<FAQ>;
  minFaqs?: number;
  maxFaqs?: number;
}

export function FAQEditor({
  initialFaqs = [],
  onChange,
  onRegenerate,
  minFaqs = 5,
  maxFaqs = 10,
}: FAQEditorProps) {
  const [faqs, setFaqs] = useState<FAQ[]>(initialFaqs);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const toast = useToast();

  const updateFaqs = useCallback((newFaqs: FAQ[]) => {
    setFaqs(newFaqs);
    onChange?.(newFaqs);
  }, [onChange]);

  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setExpandedId(id);
  };

  const handleSaveEdit = (id: string, question: string, answer: string) => {
    // Validate inputs
    const trimmedQuestion = question?.trim() || '';
    const trimmedAnswer = answer?.trim() || '';

    if (!trimmedQuestion || !trimmedAnswer) {
      return; // Don't save empty values
    }

    const newFaqs = faqs.map((faq) =>
      faq.id === id ? { ...faq, question: trimmedQuestion, answer: trimmedAnswer } : faq
    );
    updateFaqs(newFaqs);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (faqs.length <= minFaqs) {
      toast.warning(`Minimum ${minFaqs} FAQs required`);
      return;
    }
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (!deleteConfirmId) return;
    const newFaqs = faqs.filter((faq) => faq.id !== deleteConfirmId);
    updateFaqs(newFaqs);
    setDeleteConfirmId(null);
  };

  const handleAdd = () => {
    if (faqs.length >= maxFaqs) {
      toast.warning(`Maximum ${maxFaqs} FAQs allowed`);
      return;
    }
    const newFaq: FAQ = {
      id: `faq-${Date.now()}`,
      question: '',
      answer: '',
    };
    updateFaqs([...faqs, newFaq]);
    setEditingId(newFaq.id);
    setExpandedId(newFaq.id);
  };

  const handleRegenerate = async (id: string) => {
    if (!onRegenerate) return;
    setRegeneratingId(id);
    try {
      const newFaq = await onRegenerate(id);
      const newFaqs = faqs.map((faq) => (faq.id === id ? newFaq : faq));
      updateFaqs(newFaqs);
    } catch (error) {
      console.error('Failed to regenerate FAQ:', error);
    } finally {
      setRegeneratingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = faqs.findIndex((f) => f.id === draggedId);
    const targetIndex = faqs.findIndex((f) => f.id === targetId);

    const newFaqs = [...faqs];
    const [draggedFaq] = newFaqs.splice(draggedIndex, 1);
    newFaqs.splice(targetIndex, 0, draggedFaq);

    updateFaqs(newFaqs);
    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const getFaqCountColor = () => {
    if (faqs.length < minFaqs) return 'text-yellow-600';
    if (faqs.length > maxFaqs) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Frequently Asked Questions</h3>
          <p className={`text-sm ${getFaqCountColor()}`}>
            {faqs.length} FAQs ({minFaqs}-{maxFaqs} recommended)
          </p>
        </div>
        <button
          onClick={handleAdd}
          disabled={faqs.length >= maxFaqs}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add FAQ
        </button>
      </div>

      <div className="divide-y divide-gray-100">
        {faqs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No FAQs added yet</p>
            <button
              onClick={handleAdd}
              className="text-blue-600 hover:text-blue-700"
            >
              Add your first FAQ
            </button>
          </div>
        ) : (
          faqs.map((faq, index) => (
            <div
              key={faq.id}
              draggable
              onDragStart={(e) => handleDragStart(e, faq.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, faq.id)}
              onDragEnd={handleDragEnd}
              className={`${draggedId === faq.id ? 'opacity-50' : ''} ${
                draggedId && draggedId !== faq.id ? 'border-t-2 border-blue-400' : ''
              }`}
            >
              {editingId === faq.id ? (
                <FAQEditForm
                  faq={faq}
                  onSave={(q, a) => handleSaveEdit(faq.id, q, a)}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <div className="p-4">
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => handleToggleExpand(faq.id)}
                  >
                    {/* Drag handle */}
                    <div className="flex-shrink-0 mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    {/* Number */}
                    <span className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm text-gray-600">
                      {index + 1}
                    </span>

                    {/* Question */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{faq.question || 'No question'}</p>
                    </div>

                    {/* Expand indicator */}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedId === faq.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded answer */}
                  {expandedId === faq.id && (
                    <div className="mt-3 ml-14">
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">
                        {faq.answer || 'No answer'}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(faq.id);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                        {onRegenerate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRegenerate(faq.id);
                            }}
                            disabled={regeneratingId === faq.id}
                            className="text-sm text-gray-600 hover:text-gray-700 disabled:opacity-50"
                          >
                            {regeneratingId === faq.id ? 'Regenerating...' : 'Regenerate'}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(faq.id);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete FAQ"
        description="Are you sure you want to delete this FAQ?"
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

interface FAQEditFormProps {
  faq: FAQ;
  onSave: (question: string, answer: string) => void;
  onCancel: () => void;
}

function FAQEditForm({ faq, onSave, onCancel }: FAQEditFormProps) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && answer.trim()) {
      onSave(question.trim(), answer.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter question..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Enter answer..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!question.trim() || !answer.trim()}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </form>
  );
}
