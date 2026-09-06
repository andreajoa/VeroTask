export type ReputationLabel = "New" | "Building history" | "Established";

export function reputationLabel(ratingCount: number, completedJobs: number): ReputationLabel {
  if (ratingCount === 0 && completedJobs < 2) return "New";
  if (ratingCount < 10 || completedJobs < 10) return "Building history";
  return "Established";
}

export function averageStars(ratings: number[]): number {
  if (ratings.length === 0) return 5;
  const valid = ratings.filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
  if (valid.length === 0) return 5;
  return valid.reduce((sum, rating) => sum + rating, 0) / valid.length;
}

export function reputationConfidence(ratingCount: number, completedJobs: number): number {
  if (ratingCount <= 0 && completedJobs <= 0) return 0;
  const ratingConfidence = Math.min(1, Math.max(0, ratingCount) / 20);
  const jobConfidence = Math.min(1, Math.max(0, completedJobs) / 25);
  return Number(((ratingConfidence * 0.7) + (jobConfidence * 0.3)).toFixed(4));
}

export function algorithmReputationScore(input: {
  rating: number;
  ratingCount: number;
  completedJobs: number;
}): number {
  const rating = Math.min(5, Math.max(1, input.rating));
  const quality = rating / 5;
  const confidence = reputationConfidence(input.ratingCount, input.completedJobs);
  // A new 5.0 remains visually 5.0, but does not algorithmically outrank a proven 4.9.
  const score = (quality * 0.7) + (confidence * 0.3);
  return Number((score * 100).toFixed(2));
}
