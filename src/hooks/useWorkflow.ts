'use client';

import { useState, useCallback, useEffect } from 'react';
import { BlogType } from '@/types';

export type WorkflowStep = 'input' | 'titles' | 'content' | 'images' | 'seo' | 'publish';

interface BlogState {
  id?: string;
  keyword?: string;
  blogType?: BlogType;
  titles?: string[];
  selectedTitle?: string;
  content?: string;
  images?: {
    id: string;
    url: string;
    altText: string;
    placement: string;
  }[];
  seoScore?: number;
  canonicalUrl?: string;
  metaDescription?: string;
}

interface WorkflowState {
  step: WorkflowStep;
  blogState: BlogState;
  loading: boolean;
  error: string | null;
  saveSuccess: boolean;
}

const STORAGE_KEY = 'blog-workflow-draft';

const STEPS: WorkflowStep[] = ['input', 'titles', 'content', 'images', 'seo', 'publish'];

export function useWorkflow() {
  const [state, setState] = useState<WorkflowState>({
    step: 'input',
    blogState: {},
    loading: false,
    error: null,
    saveSuccess: false,
  });

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          step: parsed.step || 'input',
          blogState: parsed.blogState || {},
        }));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save draft to localStorage whenever state changes
  useEffect(() => {
    if (state.blogState.id) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step: state.step,
          blogState: state.blogState,
        })
      );
    }
  }, [state.step, state.blogState]);

  const setStep = useCallback((step: WorkflowStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setSaveSuccess = useCallback((saveSuccess: boolean) => {
    setState((prev) => ({ ...prev, saveSuccess }));
    if (saveSuccess) {
      setTimeout(() => setState((prev) => ({ ...prev, saveSuccess: false })), 3000);
    }
  }, []);

  const updateBlogState = useCallback((updates: Partial<BlogState>) => {
    setState((prev) => ({
      ...prev,
      blogState: { ...prev.blogState, ...updates },
    }));
  }, []);

  const goToNext = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    if (currentIndex < STEPS.length - 1) {
      setState((prev) => ({ ...prev, step: STEPS[currentIndex + 1] }));
    }
  }, [state.step]);

  const goToPrevious = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    if (currentIndex > 0) {
      setState((prev) => ({ ...prev, step: STEPS[currentIndex - 1] }));
    }
  }, [state.step]);

  const canGoNext = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    return currentIndex < STEPS.length - 1;
  }, [state.step]);

  const canGoPrevious = useCallback(() => {
    const currentIndex = STEPS.indexOf(state.step);
    return currentIndex > 0;
  }, [state.step]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      step: 'input',
      blogState: {},
      loading: false,
      error: null,
      saveSuccess: false,
    });
  }, []);

  const currentStepIndex = STEPS.indexOf(state.step);

  return {
    ...state,
    currentStepIndex,
    totalSteps: STEPS.length,
    steps: STEPS,
    setStep,
    setLoading,
    setError,
    setSaveSuccess,
    updateBlogState,
    goToNext,
    goToPrevious,
    canGoNext,
    canGoPrevious,
    clearDraft,
  };
}
