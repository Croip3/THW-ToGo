<script setup lang="ts">
import { onMounted } from 'vue'
import { useLearningStore } from '@/stores/useLearningStore'

const store = useLearningStore()

onMounted(() => {
  if (store.overview.length === 0) {
    store.refreshOverview()
  }
})

function learnedPercent(total: number, learned: number): number {
  return total === 0 ? 0 : Math.round((learned / total) * 100)
}
</script>

<template>
  <div class="container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h1 class="h3 mb-0">Themen wählen</h1>
      <RouterLink to="/lernen-gemischt" class="btn btn-outline-primary btn-sm">Gemischt lernen</RouterLink>
    </div>

    <div v-if="store.isOverviewLoading" class="text-muted">Lade Themen…</div>

    <div v-else class="row g-3">
      <div v-for="entry in store.overview" :key="entry.topic" class="col-12 col-sm-6 col-lg-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <h2 class="h5 card-title mb-1">Thema {{ entry.topic }}</h2>
            <p class="small text-muted mb-2 text-truncate" :title="entry.title">{{ entry.title }}</p>

            <div class="progress mb-2" style="height: 0.5rem">
              <div
                class="progress-bar"
                role="progressbar"
                :style="{ width: `${learnedPercent(entry.total, entry.learned)}%` }"
                :aria-valuenow="learnedPercent(entry.total, entry.learned)"
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>

            <p class="card-text text-muted small mb-3">
              {{ entry.total }} Fragen ·
              <span :class="entry.due > 0 ? 'text-warning fw-semibold' : 'text-success'">
                {{ entry.due }} fällig
              </span>
              · {{ entry.learned }} gelernt
            </p>

            <RouterLink :to="`/lernen/${entry.topic}`" class="btn btn-primary mt-auto">
              {{ entry.due > 0 ? 'Starten' : 'Wiederholen' }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
