<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { loadTopicList } from '@/services/questionService'
import { getAllSrsStatuses, getAllTestResults } from '@/services/storageService'
import { isDue, type SrsStatus } from '@/services/srsService'
import { TEST_PASS_RATIO } from '@/stores/useLearningStore'
import type { TestResult } from '@/types/models'
import TestScoreChart from '@/components/TestScoreChart.vue'

interface TopicRow {
  topic: number
  title: string
  total: number
  learned: number
  due: number
  lapses: number
}

const isLoading = ref(true)
const rows = ref<TopicRow[]>([])
const overallLapses = ref(0)
const overallReviewed = ref(0)
const overallTotal = ref(0)
const averageEaseFactor = ref<number | null>(null)
const testResults = ref<TestResult[]>([])

onMounted(async () => {
  isLoading.value = true
  const today = new Date()
  const allStatuses = await getAllSrsStatuses()
  const statusById = new Map<string, SrsStatus>(allStatuses.map((status) => [status.questionId, status]))

  const topics = await loadTopicList()
  const results: TopicRow[] = []

  for (const topic of topics) {
    let learned = 0
    let due = 0
    let lapses = 0

    for (const question of topic.questions) {
      const status = statusById.get(question.id)
      if (!status || isDue(status, today)) due += 1
      if (status && status.repetitions > 0) learned += 1
      if (status) lapses += status.lapses
    }

    results.push({ topic: topic.id, title: topic.title, total: topic.questions.length, learned, due, lapses })
  }

  rows.value = results
  overallTotal.value = results.reduce((sum, row) => sum + row.total, 0)
  overallLapses.value = allStatuses.reduce((sum, status) => sum + status.lapses, 0)
  overallReviewed.value = allStatuses.filter((status) => status.repetitions > 0).length

  const reviewed = allStatuses.filter((status) => status.repetitions > 0)
  averageEaseFactor.value =
    reviewed.length === 0
      ? null
      : reviewed.reduce((sum, status) => sum + status.easeFactor, 0) / reviewed.length

  testResults.value = await getAllTestResults()

  isLoading.value = false
})

const averageEaseFactorLabel = computed(() =>
  averageEaseFactor.value === null ? '–' : averageEaseFactor.value.toFixed(2),
)

function passed(result: TestResult): boolean {
  return result.total > 0 && result.correct / result.total >= TEST_PASS_RATIO
}

const testCount = computed(() => testResults.value.length)
const testPassed = computed(() => testResults.value.filter(passed).length)
const testFailed = computed(() => testCount.value - testPassed.value)

const testAverageLabel = computed(() => {
  if (testResults.value.length === 0) return '–'
  const avgCorrect =
    testResults.value.reduce((sum, result) => sum + result.correct, 0) / testResults.value.length
  const avgTotal =
    testResults.value.reduce((sum, result) => sum + result.total, 0) / testResults.value.length
  return `${avgCorrect.toFixed(1)} / ${avgTotal.toFixed(0)}`
})

const sortedTestResults = computed(() =>
  [...testResults.value].sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
)

function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="container py-4">
    <h1 class="h3 mb-4">Statistik</h1>

    <div v-if="isLoading" class="text-muted">Lade Statistik…</div>

    <template v-else>
      <h2 class="h5 mb-3">Testsimulationen</h2>
      <div class="row g-3 mb-3">
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold">{{ testCount }}</div>
              <div class="text-muted small">Tests absolviert</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold text-success">{{ testPassed }}</div>
              <div class="text-muted small">Bestanden</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold text-danger">{{ testFailed }}</div>
              <div class="text-muted small">Nicht bestanden</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold">{{ testAverageLabel }}</div>
              <div class="text-muted small">Ø richtige Antworten</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card shadow-sm mb-3">
        <div class="card-body">
          <TestScoreChart :results="testResults" :pass-ratio="TEST_PASS_RATIO" />
        </div>
      </div>

      <div v-if="testResults.length === 0" class="text-muted mb-4">
        Noch keine Testsimulation absolviert.
      </div>
      <div v-else class="table-responsive mb-4">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Datum</th>
              <th class="text-end">Ergebnis</th>
              <th class="text-end">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="result in sortedTestResults" :key="result.id">
              <td>{{ formatDateTime(result.completedAt) }}</td>
              <td class="text-end">{{ result.correct }} / {{ result.total }}</td>
              <td class="text-end">
                <span class="badge" :class="passed(result) ? 'bg-success' : 'bg-danger'">
                  {{ passed(result) ? 'Bestanden' : 'Nicht bestanden' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="h5 mb-3">Themen</h2>
      <div class="row g-3 mb-4">
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold">{{ overallReviewed }}/{{ overallTotal }}</div>
              <div class="text-muted small">Fragen gelernt</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold">{{ overallLapses }}</div>
              <div class="text-muted small">Fehlversuche gesamt</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="card text-center shadow-sm h-100">
            <div class="card-body">
              <div class="fs-4 fw-semibold">{{ averageEaseFactorLabel }}</div>
              <div class="text-muted small">Ø Ease-Factor</div>
            </div>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table table-sm align-middle">
          <thead>
            <tr>
              <th>Thema</th>
              <th class="text-end">Fragen</th>
              <th class="text-end">Gelernt</th>
              <th class="text-end">Fällig</th>
              <th class="text-end">Fehlversuche</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.topic">
              <td>Thema {{ row.topic }} <span class="text-muted">– {{ row.title }}</span></td>
              <td class="text-end">{{ row.total }}</td>
              <td class="text-end">{{ row.learned }}</td>
              <td class="text-end">{{ row.due }}</td>
              <td class="text-end">{{ row.lapses }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
