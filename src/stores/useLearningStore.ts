import { defineStore } from 'pinia'
import type { Answer, Question } from '@/types/models'
import {
  isAnswerCorrect,
  loadAllQuestions,
  loadQuestionsForTopic,
  loadTopicList,
  pickTestQuestions,
} from '@/services/questionService'
import {
  createInitialSrsStatus,
  isDue,
  reviewQuestion,
  type Grade,
  type SrsStatus,
} from '@/services/srsService'
import {
  getAllSrsStatuses,
  getSrsStatuses,
  saveSrsStatus,
  saveTestResult,
} from '@/services/storageService'
import { shuffleCopy } from '@/utils/random'

export const TEST_SESSION_SIZE = 40

/** A Testsimulation run counts as "bestanden" from this fraction of correct answers upward. */
export const TEST_PASS_RATIO = 0.8

/**
 * 'topic'  — single topic, only its due/new cards (existing behaviour)
 * 'mixed'  — due/new cards pooled across all topics, in random order
 * 'test'   — a fixed-size, completely random sample of questions from all
 *            topics, ignoring due dates entirely (mock exam)
 */
export type SessionMode = 'topic' | 'mixed' | 'test'

export interface StudyCard {
  question: Question
  status: SrsStatus
}

/** One answered card, kept for the post-session review (currently used by the Testsimulation). */
export interface AnsweredCard {
  question: Question
  selectedAnswers: Answer[]
  grade: Grade
}

export interface TopicOverview {
  topic: number
  title: string
  total: number
  due: number
  learned: number
}

interface LearningState {
  mode: SessionMode | null
  topic: number | null
  queue: StudyCard[]
  currentIndex: number
  sessionCorrect: number
  sessionIncorrect: number
  answeredCards: AnsweredCard[]
  isLoading: boolean
  overview: TopicOverview[]
  isOverviewLoading: boolean
}

function toStudyCards(
  questions: Question[],
  statusMap: Map<string, SrsStatus>,
  today: Date,
): StudyCard[] {
  return questions.map((question) => ({
    question,
    status: statusMap.get(question.id) ?? createInitialSrsStatus(question.id, today),
  }))
}

export const useLearningStore = defineStore('learning', {
  state: (): LearningState => ({
    mode: null,
    topic: null,
    queue: [],
    currentIndex: 0,
    sessionCorrect: 0,
    sessionIncorrect: 0,
    answeredCards: [],
    isLoading: false,
    overview: [],
    isOverviewLoading: false,
  }),

  getters: {
    currentCard: (state): StudyCard | undefined => state.queue[state.currentIndex],
    remainingCount: (state): number => Math.max(state.queue.length - state.currentIndex, 0),
    isSessionFinished: (state): boolean =>
      state.queue.length > 0 && state.currentIndex >= state.queue.length,
    totalDue: (state): number => state.overview.reduce((sum, entry) => sum + entry.due, 0),
  },

  actions: {
    resetSessionCounters(): void {
      this.currentIndex = 0
      this.sessionCorrect = 0
      this.sessionIncorrect = 0
      this.answeredCards = []
    },

    /** Loads all due (and new) cards for a single topic and starts a fresh study session. */
    async startSession(topic: number): Promise<void> {
      this.isLoading = true
      this.mode = 'topic'
      this.topic = topic
      this.resetSessionCounters()

      try {
        const questions = await loadQuestionsForTopic(topic)
        const statusMap = await getSrsStatuses(questions.map((question) => question.id))
        const today = new Date()
        const cards = toStudyCards(questions, statusMap, today)

        this.queue = cards.filter((card) => isDue(card.status, today))
      } finally {
        this.isLoading = false
      }
    },

    /** Loads due/new cards pooled across every topic, shuffled together. */
    async startMixedSession(): Promise<void> {
      this.isLoading = true
      this.mode = 'mixed'
      this.topic = null
      this.resetSessionCounters()

      try {
        const questions = await loadAllQuestions()
        const statusMap = await getSrsStatuses(questions.map((question) => question.id))
        const today = new Date()
        const cards = toStudyCards(questions, statusMap, today)

        this.queue = shuffleCopy(cards.filter((card) => isDue(card.status, today)))
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Mock-exam mode: a random sample of questions from all topics, ignoring
     * due dates, guaranteed to include at least one question per topic.
     */
    async startTestSession(size: number = TEST_SESSION_SIZE): Promise<void> {
      this.isLoading = true
      this.mode = 'test'
      this.topic = null
      this.resetSessionCounters()

      try {
        const topics = await loadTopicList()
        const selected = pickTestQuestions(topics, size)
        const statusMap = await getSrsStatuses(selected.map((question) => question.id))
        const today = new Date()

        this.queue = toStudyCards(selected, statusMap, today)
      } finally {
        this.isLoading = false
      }
    },

    /** Grades the current card, persists the new SRS status and returns the grade. */
    async submitAnswer(selectedAnswers: Answer[]): Promise<Grade> {
      const card = this.currentCard
      if (!card) {
        throw new Error('submitAnswer() aufgerufen ohne aktive Karte in der Session')
      }

      const grade: Grade = isAnswerCorrect(card.question, selectedAnswers) ? 'correct' : 'incorrect'
      const updatedStatus = reviewQuestion(card.status, grade)
      await saveSrsStatus(updatedStatus)

      card.status = updatedStatus
      if (grade === 'correct') {
        this.sessionCorrect += 1
      } else {
        this.sessionIncorrect += 1
      }
      this.answeredCards.push({ question: card.question, selectedAnswers, grade })

      return grade
    },

    /** Moves on to the next card in the queue; records the result once a Testsimulation completes. */
    async advance(): Promise<void> {
      this.currentIndex += 1

      if (this.mode === 'test' && this.isSessionFinished) {
        await saveTestResult({
          completedAt: new Date().toISOString(),
          total: this.queue.length,
          correct: this.sessionCorrect,
          incorrect: this.sessionIncorrect,
        })
      }
    },

    /** Recomputes due/learned/total counts per topic for the Dashboard and TopicSelect views. */
    async refreshOverview(): Promise<void> {
      this.isOverviewLoading = true
      try {
        const today = new Date()
        const allStatuses = await getAllSrsStatuses()
        const statusById = new Map(allStatuses.map((status) => [status.questionId, status]))
        const topics = await loadTopicList()

        this.overview = topics.map((topic): TopicOverview => {
          let due = 0
          let learned = 0

          for (const question of topic.questions) {
            const status = statusById.get(question.id)
            if (!status || isDue(status, today)) due += 1
            if (status && status.repetitions > 0) learned += 1
          }

          return { topic: topic.id, title: topic.title, total: topic.questions.length, due, learned }
        })
      } finally {
        this.isOverviewLoading = false
      }
    },
  },
})
