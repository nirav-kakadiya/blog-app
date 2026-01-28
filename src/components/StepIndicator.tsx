'use client';

import type { WorkflowStep } from '@/hooks/useWorkflow';

interface StepConfig {
  key: WorkflowStep;
  label: string;
  icon: string;
  description: string;
}

const STEP_CONFIGS: StepConfig[] = [
  { key: 'input', label: 'Topic', icon: '1', description: 'Enter keyword and type' },
  { key: 'titles', label: 'Title', icon: '2', description: 'Select blog title' },
  { key: 'content', label: 'Edit', icon: '3', description: 'Review and edit content' },
  { key: 'images', label: 'Images', icon: '4', description: 'Generate and manage images' },
  { key: 'seo', label: 'SEO', icon: '5', description: 'Optimize for search' },
  { key: 'publish', label: 'Publish', icon: '6', description: 'Publish to platforms' },
];

interface Props {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
  allowNavigation?: boolean;
  completedSteps?: WorkflowStep[];
}

export function StepIndicator({
  currentStep,
  onStepClick,
  allowNavigation = false,
  completedSteps = [],
}: Props) {
  const currentStepIndex = STEP_CONFIGS.findIndex((s) => s.key === currentStep);

  const isStepCompleted = (step: WorkflowStep) => completedSteps.includes(step);
  const isStepActive = (step: WorkflowStep) => step === currentStep;
  const isStepAccessible = (stepIndex: number) => {
    if (!allowNavigation) return false;
    // Can go back to any previous step or the next step after completed ones
    return stepIndex <= currentStepIndex;
  };

  return (
    <div className="hidden md:flex items-center gap-1">
      {STEP_CONFIGS.map((step, index) => {
        const completed = isStepCompleted(step.key);
        const active = isStepActive(step.key);
        const accessible = isStepAccessible(index);

        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => accessible && onStepClick?.(step.key)}
              disabled={!accessible}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                accessible ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
              }`}
              style={{
                background:
                  active
                    ? '#1a73e8'
                    : completed
                    ? '#e8f0fe'
                    : 'transparent',
                color:
                  active
                    ? 'white'
                    : completed
                    ? '#1a73e8'
                    : '#9aa0a6',
              }}
              title={step.description}
            >
              <span
                className="w-5 h-5 text-xs font-medium flex items-center justify-center rounded-full"
                style={{
                  background: completed && !active ? '#1a73e8' : 'transparent',
                  color: completed && !active ? 'white' : 'inherit',
                }}
              >
                {completed && !active ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.icon
                )}
              </span>
              <span className="text-sm font-medium">{step.label}</span>
            </button>
            {index < STEP_CONFIGS.length - 1 && (
              <div
                className="w-8 h-0.5 mx-1"
                style={{
                  background: currentStepIndex > index ? '#1a73e8' : '#dadce0',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Mobile version - compact
export function MobileStepIndicator({
  currentStep,
}: {
  currentStep: WorkflowStep;
}) {
  const currentStepIndex = STEP_CONFIGS.findIndex((s) => s.key === currentStep);
  const stepConfig = STEP_CONFIGS[currentStepIndex];

  return (
    <div className="md:hidden flex items-center gap-2">
      <span className="text-sm text-gray-500">
        Step {currentStepIndex + 1} of {STEP_CONFIGS.length}
      </span>
      <span className="text-gray-300">|</span>
      <span className="text-sm font-medium text-gray-900">{stepConfig?.label}</span>
    </div>
  );
}
