import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeCustomAvailability,
  validateCustomAvailability,
} from '../src/lib/validation/customAvailability';

describe('sanitizeCustomAvailability', () => {
  it('trims values and drops incomplete entries', () => {
    const result = sanitizeCustomAvailability([
      { day: '  monday ', startTime: '08:00', endTime: '18:00' },
      { day: ' ', startTime: '09:00', endTime: '' },
      { day: 'Friday', startTime: ' 07:30 ', endTime: ' 12:30 ' },
    ]);

    assert.deepEqual(result, [
      { day: 'Monday', startTime: '08:00', endTime: '18:00' },
      { day: 'Friday', startTime: '07:30', endTime: '12:30' },
    ]);
  });
});

describe('validateCustomAvailability', () => {
  it('accepts a well-formed schedule', () => {
    const entries = [
      { day: 'Monday', startTime: '08:00', endTime: '18:00' },
      { day: 'Tuesday', startTime: '09:15', endTime: '17:30' },
    ];

    const error = validateCustomAvailability(entries);
    assert.equal(error, null);
  });

  it('rejects invalid days', () => {
    const error = validateCustomAvailability([{ day: 'Funday', startTime: '08:00', endTime: '09:00' }]);
    assert.equal(error, 'Invalid day "Funday".');
  });

  it('rejects invalid time ranges', () => {
    const error = validateCustomAvailability([{ day: 'Monday', startTime: '25:00', endTime: '09:00' }]);
    assert.equal(error, 'Start and end times must be valid 24h times (HH:MM).');
  });

  it('rejects start times that are not before end times', () => {
    const error = validateCustomAvailability([{ day: 'Monday', startTime: '18:00', endTime: '17:00' }]);
    assert.equal(error, 'Start time must be before end time for Monday.');
  });
});

