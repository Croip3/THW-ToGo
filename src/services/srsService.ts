/**
 * SM-2 based spaced-repetition scheduling.
 *
 * The learning UI only distinguishes "richtig" / "falsch" (no 4-stufige Anki-Bewertung).
 * That binary grade is mapped onto the original SM-2 quality scale (0-5) so the
 * well-known SM-2 ease-factor formula can still be used unmodified:
 *   - correct   -> quality 4 ("gut")     -> ease factor stays the same
 *   - incorrect -> quality 2 ("ungenügend, aber erinnerlich") -> ease factor drops
 *
 * This file has no knowledge of IndexedDB/Dexie — it only transforms plain
 * SrsStatus objects so the logic stays pure and unit-testable.
 */

export type Grade = 'correct' | 'incorrect'

export interface SrsStatus {
  questionId: string
  easeFactor: number
  interval: number
  repetitions: number
  /** ISO date (YYYY-MM-DD), local calendar day the card is next due. */
  dueDate: string
  /** ISO date (YYYY-MM-DD) of the last review, or null if never reviewed. */
  lastReviewed: string | null
  lapses: number
}

const MIN_EASE_FACTOR = 1.3
const INITIAL_EASE_FACTOR = 2.5
const FIRST_INTERVAL_DAYS = 1
const SECOND_INTERVAL_DAYS = 6

const QUALITY_CORRECT = 4
const QUALITY_INCORRECT = 2

function toDateOnlyString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Original SM-2 ease-factor update formula (Wozniak, 1990). */
function nextEaseFactor(easeFactor: number, quality: number): number {
  const raw = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  return Math.max(MIN_EASE_FACTOR, raw)
}

/** SRS status for a question that has never been reviewed; due immediately. */
export function createInitialSrsStatus(questionId: string, today: Date = new Date()): SrsStatus {
  return {
    questionId,
    easeFactor: INITIAL_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
    dueDate: toDateOnlyString(today),
    lastReviewed: null,
    lapses: 0,
  }
}

/** Computes the next SRS status after answering a card. Does not mutate the input. */
export function reviewQuestion(status: SrsStatus, grade: Grade, today: Date = new Date()): SrsStatus {
  const quality = grade === 'correct' ? QUALITY_CORRECT : QUALITY_INCORRECT
  const easeFactor = nextEaseFactor(status.easeFactor, quality)
  const lastReviewed = toDateOnlyString(today)

  if (grade === 'incorrect') {
    const interval = FIRST_INTERVAL_DAYS
    return {
      ...status,
      easeFactor,
      interval,
      repetitions: 0,
      lapses: status.lapses + 1,
      lastReviewed,
      dueDate: toDateOnlyString(addDays(today, interval)),
    }
  }

  const repetitions = status.repetitions + 1
  let interval: number
  if (repetitions === 1) {
    interval = FIRST_INTERVAL_DAYS
  } else if (repetitions === 2) {
    interval = SECOND_INTERVAL_DAYS
  } else {
    interval = Math.round(status.interval * easeFactor)
  }

  return {
    ...status,
    easeFactor,
    interval,
    repetitions,
    lastReviewed,
    dueDate: toDateOnlyString(addDays(today, interval)),
  }
}

/** Whether a card is due for review on the given day (defaults to today). */
export function isDue(status: SrsStatus, today: Date = new Date()): boolean {
  return status.dueDate <= toDateOnlyString(today)
}
