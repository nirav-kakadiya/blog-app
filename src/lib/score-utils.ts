/**
 * Shared score color and grade utilities used across all analysis panels.
 */

export function getScoreColor(score: number): string {
  if (score >= 80) return '#1e8e3e'; // green
  if (score >= 60) return '#f9ab00'; // amber
  return '#d93025'; // red
}

export function getScoreGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-50';
  if (score >= 60) return 'bg-amber-50';
  return 'bg-red-50';
}

export function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-700';
  if (score >= 60) return 'text-amber-700';
  return 'text-red-700';
}
