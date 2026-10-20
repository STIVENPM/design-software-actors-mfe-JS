import type { operations } from '../generated/actors'

export type AvailabilityException = operations['listInstructorAvailabilityExceptions']['responses'][200]['content']['application/json'][number]
export type AvailabilityExceptionInput = operations['createInstructorAvailabilityException']['requestBody']['content']['application/json']
export type AvailabilityExceptionId = operations['removeInstructorAvailabilityException']['parameters']['path']['exception_id']
export type AvailabilityExceptionType = AvailabilityExceptionInput['exception_type']

// OpenAPI date-time includes a UTC marker or offset; compare instants, not calendar dates.
export function isFutureAvailabilityException(item: AvailabilityException, now = Date.now()): boolean {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(item.start_datetime)) return false
  const startsAt = Date.parse(item.start_datetime)
  return Number.isFinite(startsAt) && startsAt > now
}
