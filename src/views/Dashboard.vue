<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLearningStore, TEST_SESSION_SIZE } from '@/stores/useLearningStore'
import thwEmblem from '@/assets/logo/thw-emblem.webp'

const store = useLearningStore()

onMounted(() => {
  store.refreshOverview()
})

const dueTopics = computed(() => store.overview.filter((entry) => entry.due > 0))
const totalQuestions = computed(() => store.overview.reduce((sum, entry) => sum + entry.total, 0))
const totalLearned = computed(() => store.overview.reduce((sum, entry) => sum + entry.learned, 0))
const progressPercent = computed(() =>
  totalQuestions.value === 0 ? 0 : Math.round((totalLearned.value / totalQuestions.value) * 100),
)
</script>

<template>
  <div class="container py-4">
    <div class="d-flex align-items-center gap-3 mb-4">
      <img :src="thwEmblem" alt="THW Logo" width="56" height="56" />
      <h1 class="h3 mb-0">THW Theorie-Trainer</h1>
    </div>

    <div v-if="store.isOverviewLoading" class="text-muted">Lade Fortschritt…</div>

    <template v-else>
      <div class="card mb-4 shadow-sm">
        <div class="card-body">
          <h2 class="h5 card-title">Gesamtfortschritt</h2>
          <div class="progress mb-2" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar" :style="{ width: `${progressPercent}%` }">{{ progressPercent }}%</div>
          </div>
          <p class="card-text text-muted mb-0">
            {{ totalLearned }} von {{ totalQuestions }} Fragen mindestens einmal beantwortet ·
            <strong>{{ store.totalDue }}</strong> Karten aktuell fällig
          </p>
        </div>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-12 col-sm-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h3 class="h6 card-title">Gemischt lernen</h3>
              <p class="card-text text-muted mb-3">
                Fällige Karten aus allen Themen zufällig gemischt – für abwechslungsreiches Wiederholen.
              </p>
              <RouterLink to="/lernen-gemischt" class="btn btn-primary mt-auto">Gemischt lernen</RouterLink>
            </div>
          </div>
        </div>
        <div class="col-12 col-sm-6">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h3 class="h6 card-title">Testsimulation</h3>
              <p class="card-text text-muted mb-3">
                {{ TEST_SESSION_SIZE }} zufällig ausgewählte Fragen mit mindestens einer Frage aus jedem Thema, wie in einer echten Prüfung.
              </p>
              <RouterLink to="/test" class="btn btn-primary mt-auto">Test starten</RouterLink>
            </div>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="h5 mb-0">Fällige Themen</h2>
        <RouterLink to="/themen" class="btn btn-outline-primary btn-sm">Alle Themen</RouterLink>
      </div>

      <div v-if="dueTopics.length === 0" class="alert alert-success">
        Keine fälligen Karten – gut gemacht! Du kannst trotzdem jederzeit neue Themen lernen.
      </div>

      <div v-else class="row g-3">
        <div v-for="entry in dueTopics" :key="entry.topic" class="col-12 col-sm-6 col-lg-4">
          <div class="card h-100 shadow-sm">
            <div class="card-body d-flex flex-column">
              <h3 class="h6 card-title mb-1">Thema {{ entry.topic }}</h3>
              <p class="small text-muted mb-2 text-truncate" :title="entry.title">{{ entry.title }}</p>
              <p class="card-text text-muted mb-3">{{ entry.due }} von {{ entry.total }} Karten fällig</p>
              <RouterLink :to="`/lernen/${entry.topic}`" class="btn btn-primary mt-auto">Jetzt lernen</RouterLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
