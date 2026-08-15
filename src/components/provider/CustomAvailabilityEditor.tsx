'use client';

import Button from '@/components/ui/Button';
import { CustomAvailabilityEntry, WEEK_DAYS } from '@/lib/validation/customAvailability';

type Props = {
  entries: CustomAvailabilityEntry[];
  onChange: (entries: CustomAvailabilityEntry[]) => void;
  error?: string;
  disabled?: boolean;
};

const TIME_SUGGESTIONS = {
  start: '09:00',
  end: '17:00',
} as const;

export default function CustomAvailabilityEditor({ entries, onChange, error, disabled }: Props) {
  const handleAdd = () => {
    const unusedDay = WEEK_DAYS.find((day) => !entries.some((entry) => entry.day === day));
    const fallbackDay = unusedDay ?? WEEK_DAYS[0];
    onChange([
      ...entries,
      {
        day: fallbackDay,
        startTime: TIME_SUGGESTIONS.start,
        endTime: TIME_SUGGESTIONS.end,
      },
    ]);
  };

  const handleEntryChange = (index: number, field: keyof CustomAvailabilityEntry, value: string) => {
    const nextEntries = entries.map((entry, idx) =>
      idx === index
        ? {
            ...entry,
            [field]: value,
          }
        : entry,
    );
    onChange(nextEntries);
  };

  const handleRemove = (index: number) => {
    const nextEntries = entries.filter((_, idx) => idx !== index);
    onChange(nextEntries);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/70">
        Define specific days and time windows when this parking space is accessible. Use 24-hour time (e.g. 08:00).
      </p>

      <div className="space-y-3">
        {entries.length === 0 ? (
          <CardPlaceholder />
        ) : (
          entries.map((entry, index) => (
            <div
              key={`${entry.day}-${index}`}
              className="grid grid-cols-1 md:grid-cols-[1fr,1fr,1fr,auto] gap-3 items-end border border-white/10 rounded-lg p-4 bg-white/5"
            >
              <div>
                <label className="block text-white/90 text-xs font-semibold mb-1">Day</label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                  value={entry.day}
                  onChange={(event) => handleEntryChange(index, 'day', event.target.value)}
                  disabled={disabled}
                >
                  {WEEK_DAYS.map((day) => {
                    const isTaken = entries.some((item, idx) => item.day === day && idx !== index);
                    return (
                      <option key={day} value={day} disabled={isTaken}>
                        {day}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-white/90 text-xs font-semibold mb-1">Start time</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                  value={entry.startTime}
                  onChange={(event) => handleEntryChange(index, 'startTime', event.target.value)}
                  disabled={disabled}
                  step={300}
                />
              </div>

              <div>
                <label className="block text-white/90 text-xs font-semibold mb-1">End time</label>
                <input
                  type="time"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm"
                  value={entry.endTime}
                  onChange={(event) => handleEntryChange(index, 'endTime', event.target.value)}
                  disabled={disabled}
                  step={300}
                />
              </div>

              <button
                type="button"
                className="text-xs text-red-300 hover:text-red-200 font-semibold"
                onClick={() => handleRemove(index)}
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={disabled || entries.length >= WEEK_DAYS.length}
        >
          {entries.length === 0 ? 'Add availability' : 'Add another day'}
        </Button>
        <p className="text-xs text-white/60">You can add up to one time block per day.</p>
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}

function CardPlaceholder() {
  return (
    <div className="w-full rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-white/70 text-center">
      No custom availability added yet. Use the button below to create your first time block.
    </div>
  );
}

