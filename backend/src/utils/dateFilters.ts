type DateRangeResult =
  | { valid: true; createdAt?: { gte?: Date; lt?: Date; lte?: Date } }
  | { valid: false; error: string };

export function parseCreatedDateRange(fromValue: unknown, toValue: unknown): DateRangeResult {
  if ((fromValue !== undefined && typeof fromValue !== 'string') || (toValue !== undefined && typeof toValue !== 'string')) {
    return { valid: false, error: 'Invalid date filter' };
  }
  const from = typeof fromValue === 'string' && fromValue ? fromValue : undefined;
  const to = typeof toValue === 'string' && toValue ? toValue : undefined;
  const fromDate = from ? new Date(from) : undefined;
  const rawToDate = to ? new Date(to) : undefined;
  if ((fromDate && Number.isNaN(fromDate.getTime())) || (rawToDate && Number.isNaN(rawToDate.getTime()))) {
    return { valid: false, error: 'Invalid date filter' };
  }
  if (fromDate && rawToDate && fromDate > rawToDate) return { valid: false, error: 'from must be before to' };

  const dateOnlyTo = Boolean(to && /^\d{4}-\d{2}-\d{2}$/.test(to));
  const endDate = dateOnlyTo && rawToDate ? new Date(rawToDate.getTime() + 24 * 60 * 60 * 1000) : rawToDate;
  return {
    valid: true,
    ...(fromDate || endDate) && { createdAt: { ...(fromDate && { gte: fromDate }), ...(endDate && (dateOnlyTo ? { lt: endDate } : { lte: endDate })) } },
  };
}
