import { getSpeakerColorByName } from '../../lib/colors';

interface Props {
  speaker: string;
}

export default function SpeakerLabel({ speaker }: Props) {
  const color = getSpeakerColorByName(speaker);

  return (
    <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color }}>
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {speaker}
    </span>
  );
}
