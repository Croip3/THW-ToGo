export interface Answer {
  text: string
  correct: boolean
}

export interface Question {
  id: string
  topic: number
  question: string
  answers: Answer[]
}

/** One entry of src/data/topics.json — the question bank, grouped by topic. */
export interface Topic {
  id: number
  title: string
  questions: Question[]
}

/** Result of one completed Testsimulation run, persisted for the Stats view. */
export interface TestResult {
  id?: number
  /** Full ISO timestamp (not just a date) so multiple tests on the same day still sort correctly. */
  completedAt: string
  total: number
  correct: number
  incorrect: number
}
