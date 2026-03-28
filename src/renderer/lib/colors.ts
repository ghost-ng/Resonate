/** Speaker color palette — 8 distinct colors for differentiating speakers */
export const SPEAKER_COLORS = [
  '#5b8def', // blue
  '#f06292', // pink
  '#4db6ac', // teal
  '#ffb74d', // orange
  '#ba68c8', // purple
  '#81c784', // green
  '#e57373', // red
  '#64b5f6', // light blue
] as const;

export function getSpeakerColor(index: number): string {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

/** Given a speaker name, return a deterministic color */
export function getSpeakerColorByName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length];
}
