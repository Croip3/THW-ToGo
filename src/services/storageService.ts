import Dexie, { type Table } from 'dexie'
import type { SrsStatus } from './srsService'
import type { TestResult } from '@/types/models'

/**
 * Dexie wrapper around the IndexedDB store for SRS learning progress.
 * The question bank itself is static JSON (see questionService.ts) and never
 * touches this database — only the dynamic per-question SRS status (and
 * Testsimulation results) are persisted here, so they survive app updates
 * independently of the shipped question content.
 */
class LearningDatabase extends Dexie {
  srsStatuses!: Table<SrsStatus, string>
  testResults!: Table<TestResult, number>

  constructor() {
    super('thw-lernapp')
    this.version(1).stores({
      srsStatuses: 'questionId, dueDate',
    })
    this.version(2).stores({
      srsStatuses: 'questionId, dueDate',
      testResults: '++id, completedAt',
    })
  }
}

const db = new LearningDatabase()

export async function getSrsStatus(questionId: string): Promise<SrsStatus | undefined> {
  return db.srsStatuses.get(questionId)
}

/** Bulk lookup, e.g. for all questions of a topic. Missing entries are simply absent from the map. */
export async function getSrsStatuses(questionIds: string[]): Promise<Map<string, SrsStatus>> {
  const records = await db.srsStatuses.bulkGet(questionIds)
  const map = new Map<string, SrsStatus>()
  records.forEach((record, index) => {
    const questionId = questionIds[index]
    if (record && questionId !== undefined) {
      map.set(questionId, record)
    }
  })
  return map
}

export async function saveSrsStatus(status: SrsStatus): Promise<void> {
  await db.srsStatuses.put(status)
}

/** All persisted SRS statuses, used for dashboard/stats aggregation across topics. */
export async function getAllSrsStatuses(): Promise<SrsStatus[]> {
  return db.srsStatuses.toArray()
}

/** Records the outcome of one completed Testsimulation run. */
export async function saveTestResult(result: TestResult): Promise<void> {
  await db.testResults.add(result)
}

/** All past Testsimulation results, used by the Stats view. */
export async function getAllTestResults(): Promise<TestResult[]> {
  return db.testResults.toArray()
}
