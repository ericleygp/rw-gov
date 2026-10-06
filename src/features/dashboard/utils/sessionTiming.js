const millisecondsPerDay = 24 * 60 * 60 * 1000

function localCalendarDayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / millisecondsPerDay
}

export function getSessionTiming(sessionAt, now) {
  const sessionDate = new Date(sessionAt)

  if (Number.isNaN(sessionDate.getTime())) {
    return { daysRemaining: null, hasPassed: true }
  }

  return {
    daysRemaining: localCalendarDayNumber(sessionDate) - localCalendarDayNumber(now),
    hasPassed: sessionDate.getTime() < now.getTime(),
  }
}
