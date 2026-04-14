import { formatDate } from '../../../utils/formatters';

const TEN_YEARS_IN_DAYS = 3650;

const DAY_TO_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function toUtcDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date, amount) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function buildPastMeetingDateOptions(meeting) {
  const weekday = DAY_TO_INDEX[meeting?.day];
  if (weekday == null) return [];

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lastAllowedDate = addUtcDays(todayUtc, -1);
  if (lastAllowedDate.getTime() < 0) return [];

  const createdAtDate = toUtcDate(meeting?.createdAt);
  const startDate = createdAtDate || addUtcDays(lastAllowedDate, -TEN_YEARS_IN_DAYS);

  if (!startDate || lastAllowedDate.getTime() < startDate.getTime()) {
    return [];
  }

  let cursor = lastAllowedDate;
  while (cursor.getUTCDay() !== weekday) {
    cursor = addUtcDays(cursor, -1);
  }

  const options = [];
  while (cursor.getTime() >= startDate.getTime()) {
    const value = toDateKey(cursor);
    options.push({
      value,
      label: formatDate(value),
    });
    cursor = addUtcDays(cursor, -7);
  }

  return options;
}
