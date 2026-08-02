<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Answer } from '@/types/models'
import { useLearningStore, type SessionMode, TEST_SESSION_SIZE } from '@/stores/useLearningStore'
import type { Grade } from '@/services/srsService'
import { shuffleCopy } from '@/utils/random'

const props = defineProps<{ topic?: number; mode?: SessionMode }>()

const store = useLearningStore()

const shuffledAnswers = ref<Answer[]>([])
const selectedAnswers = ref<Answer[]>([])
const submitted = ref(false)
const lastGrade = ref<Grade | null>(null)

function prepareCurrentCard() {
  selectedAnswers.value = []
  submitted.value = false
  lastGrade.value = null
  shuffledAnswers.value = store.currentCard ? shuffleCopy(store.currentCard.question.answers) : []
}

async function loadSession() {
  if (props.mode === 'test') {
    await store.startTestSession()
  } else if (props.mode === 'mixed') {
    await store.startMixedSession()
  } else if (props.topic !== undefined) {
    await store.startSession(props.topic)
  }
  prepareCurrentCard()
}

watch([() => props.topic, () => props.mode], loadSession, { immediate: true })

function toggleAnswer(answer: Answer) {
  if (submitted.value) return
  const index = selectedAnswers.value.indexOf(answer)
  if (index === -1) {
    selectedAnswers.value.push(answer)
  } else {
    selectedAnswers.value.splice(index, 1)
  }
}

function isSelected(answer: Answer): boolean {
  return selectedAnswers.value.includes(answer)
}

function answerClass(answer: Answer): string {
  if (!submitted.value) return isSelected(answer) ? 'btn-primary' : 'btn-outline-secondary'
  return answer.correct ? 'btn-success' : 'btn-danger'
}

async function submitAnswer() {
  if (selectedAnswers.value.length === 0) return
  lastGrade.value = await store.submitAnswer(selectedAnswers.value)
  submitted.value = true
}

function nextCard() {
  store.advance()
  prepareCurrentCard()
}

const progressPercent = computed(() => {
  const total = store.queue.length
  return total === 0 ? 0 : Math.round((store.currentIndex / total) * 100)
})

const headingText = computed(() => {
  if (props.mode === 'test') return 'Testsimulation'
  if (props.mode === 'mixed') return 'Alle Themen (gemischt)'
  return `Thema ${props.topic}`
})

const cancelTarget = computed(() => (props.mode ? '/' : '/themen'))

const emptyQueueMessage = computed(() => {
  if (props.mode === 'test') return 'Für die Testsimulation stehen aktuell keine Fragen zur Verfügung.'
  if (props.mode === 'mixed') return 'Keine fälligen Karten – du hast aktuell alles gelernt.'
  return 'Keine fälligen Karten für dieses Thema. Schau später wieder vorbei oder wähle ein anderes Thema.'
})

const scorePercent = computed(() => {
  const total = store.queue.length
  return total === 0 ? 0 : Math.round((store.sessionCorrect / total) * 100)
})
</script>

<template>
  <div class="container py-4" style="max-width: 40rem">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h1 class="h4 mb-0">{{ headingText }}</h1>
      <RouterLink :to="cancelTarget" class="btn btn-outline-secondary btn-sm">Abbrechen</RouterLink>
    </div>

    <div v-if="store.isLoading" class="text-muted">Lade Karten…</div>

    <div v-else-if="store.queue.length === 0" class="alert alert-success">
      {{ emptyQueueMessage }}
      <div class="mt-3">
        <RouterLink to="/themen" class="btn btn-primary btn-sm">Zurück zur Themenauswahl</RouterLink>
      </div>
    </div>

    <div v-else-if="store.isSessionFinished" class="card shadow-sm">
      <div class="card-body text-center">
        <h2 class="h5">{{ props.mode === 'test' ? 'Test beendet 🎉' : 'Session beendet 🎉' }}</h2>

        <p v-if="props.mode === 'test'" class="mb-3">
          Ergebnis: <strong>{{ store.sessionCorrect }}/{{ store.queue.length }}</strong> richtig ({{ scorePercent }}%)
        </p>
        <template v-else>
          <p class="mb-1">Richtig: <strong>{{ store.sessionCorrect }}</strong></p>
          <p class="mb-3">Falsch: <strong>{{ store.sessionIncorrect }}</strong></p>
        </template>

        <button
          v-if="props.mode === 'test'"
          type="button"
          class="btn btn-primary me-2"
          @click="loadSession"
        >
          Neuer Test
        </button>
        <RouterLink v-else to="/themen" class="btn btn-primary me-2">Weiteres Thema</RouterLink>
        <RouterLink to="/" class="btn btn-outline-secondary">Zum Dashboard</RouterLink>
      </div>

      <div v-if="props.mode === 'test'" class="card-body border-top text-start">
        <h3 class="h6 mb-3">Antworten im Überblick</h3>
        <div v-for="(entry, index) in store.answeredCards" :key="entry.question.id" class="mb-3">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <span class="fw-semibold">{{ index + 1 }}. {{ entry.question.question }}</span>
            <span class="badge flex-shrink-0" :class="entry.grade === 'correct' ? 'bg-success' : 'bg-danger'">
              {{ entry.grade === 'correct' ? 'Richtig' : 'Falsch' }}
            </span>
          </div>
          <div class="d-grid gap-1">
            <div
              v-for="answer in entry.question.answers"
              :key="answer.text"
              class="btn btn-sm text-start d-flex align-items-center review-answer"
              :class="
                answer.correct
                  ? 'btn-success'
                  : entry.selectedAnswers.includes(answer)
                    ? 'btn-danger'
                    : 'btn-outline-secondary'
              "
            >
              <input
                class="form-check-input me-2 flex-shrink-0"
                type="checkbox"
                :checked="entry.selectedAnswers.includes(answer)"
                disabled
              />
              {{ answer.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="progress mb-3" style="height: 0.5rem">
        <div
          class="progress-bar"
          role="progressbar"
          :style="{ width: `${progressPercent}%` }"
          :aria-valuenow="progressPercent"
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
      <p class="text-muted small">
        Karte {{ store.currentIndex + 1 }} von {{ store.queue.length }}
        <span v-if="props.mode === 'test'">(Testsimulation, {{ TEST_SESSION_SIZE }} Fragen)</span>
      </p>

      <div class="card shadow-sm">
        <div class="card-body">
          <span v-if="props.mode" class="badge bg-secondary mb-2">
            Thema {{ store.currentCard?.question.topic }}
          </span>
          <h2 class="h5 card-title mb-3">{{ store.currentCard?.question.question }}</h2>

          <div class="d-grid gap-2 mb-3">
            <button
              v-for="answer in shuffledAnswers"
              :key="answer.text"
              type="button"
              class="btn text-start d-flex align-items-center"
              :class="answerClass(answer)"
              :disabled="submitted"
              @click="toggleAnswer(answer)"
            >
              <input
                class="form-check-input me-2 flex-shrink-0"
                type="checkbox"
                :checked="isSelected(answer)"
                :disabled="submitted"
                @click.stop="toggleAnswer(answer)"
              />
              {{ answer.text }}
            </button>
          </div>

          <div v-if="!submitted">
            <button
              type="button"
              class="btn btn-primary"
              :disabled="selectedAnswers.length === 0"
              @click="submitAnswer"
            >
              Prüfen
            </button>
          </div>
          <div v-else class="d-flex align-items-center justify-content-between">
            <div class="feedback-wrap flex-grow-1 me-3">
              <span class="feedback-bar" :class="lastGrade === 'correct' ? 'bg-success' : 'bg-danger'"></span>
              <span
                class="feedback-text fw-semibold"
                :class="lastGrade === 'correct' ? 'feedback-text-success' : 'feedback-text-danger'"
              >
                {{ lastGrade === 'correct' ? 'Richtig!' : 'Falsch' }}
              </span>
            </div>
            <button type="button" class="btn btn-primary" @click="nextCard">Weiter</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.review-answer {
  cursor: default;
}

.feedback-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  padding: 0.375rem 0.75rem;
}

.feedback-bar {
  position: absolute;
  inset: 0;
  width: 0;
  animation: feedback-sweep 1.1s ease-out forwards;
}

.feedback-text {
  position: relative;
  z-index: 1;
}

.feedback-text-success {
  animation: feedback-color-success 0.4s ease-out forwards;
}

.feedback-text-danger {
  animation: feedback-color-danger 0.4s ease-out forwards;
}

@keyframes feedback-sweep {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}

@keyframes feedback-color-success {
  from {
    color: var(--bs-success);
  }
  to {
    color: #fff;
  }
}

@keyframes feedback-color-danger {
  from {
    color: var(--bs-danger);
  }
  to {
    color: #fff;
  }
}

@media (prefers-reduced-motion: reduce) {
  .feedback-bar,
  .feedback-text-success,
  .feedback-text-danger {
    animation-duration: 0.001ms !important;
  }
}
</style>
