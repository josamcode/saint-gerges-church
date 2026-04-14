function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth(year, month) {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] || 0;
}

export function extractBirthDateFromNationalId(nationalId) {
  const digits = String(nationalId || '').replace(/\D/g, '');

  if (digits.length < 7) return '';

  const centuryDigit = digits[0];
  const yearPart = Number.parseInt(digits.slice(1, 3), 10);
  const month = Number.parseInt(digits.slice(3, 5), 10);
  const day = Number.parseInt(digits.slice(5, 7), 10);

  const centuryBase =
    centuryDigit === '2' ? 1900
      : centuryDigit === '3' ? 2000
        : centuryDigit === '1' ? 1800
          : null;

  if (!centuryBase) return '';

  const year = centuryBase + yearPart;
  const maxDay = getDaysInMonth(year, month);

  if (!month || month > 12 || !day || day > maxDay) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
