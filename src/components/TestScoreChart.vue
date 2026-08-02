<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TestResult } from '@/types/models'

const props = defineProps<{
  results: TestResult[]
  passRatio: number
}>()

const VIEW_WIDTH = 600
const VIEW_HEIGHT = 220
const PADDING = { top: 16, right: 16, bottom: 28, left: 40 }
const PLOT_WIDTH = VIEW_WIDTH - PADDING.left - PADDING.right
const PLOT_HEIGHT = VIEW_HEIGHT - PADDING.top - PADDING.bottom

interface Point {
  x: number
  y: number
  completedAt: string
  correct: number
  total: number
  percent: number
  passed: boolean
}

function formatDateShort(isoDateTime: string): string {
  const date = new Date(isoDateTime)
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.`
}

function formatDateTimeLong(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function yFor(percent: number): number {
  return PADDING.top + (1 - percent / 100) * PLOT_HEIGHT
}

const chronological = computed(() =>
  [...props.results].sort((a, b) => a.completedAt.localeCompare(b.completedAt)),
)

const points = computed<Point[]>(() => {
  const list = chronological.value
  const n = list.length
  return list.map((result, index) => {
    const percent = result.total === 0 ? 0 : (result.correct / result.total) * 100
    const x = n <= 1 ? PADDING.left + PLOT_WIDTH / 2 : PADDING.left + (index / (n - 1)) * PLOT_WIDTH
    return {
      x,
      y: yFor(percent),
      completedAt: result.completedAt,
      correct: result.correct,
      total: result.total,
      percent,
      passed: percent / 100 >= props.passRatio,
    }
  })
})

const linePath = computed(() =>
  points.value.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' '),
)

const firstPoint = computed<Point | undefined>(() => points.value[0])
const lastPoint = computed<Point | undefined>(() => points.value[points.value.length - 1])

const passLineY = computed(() => yFor(props.passRatio * 100))

const gridLines = [0, 50, 100]

const hoveredIndex = ref<number | null>(null)
const hoveredPoint = computed(() => (hoveredIndex.value === null ? null : points.value[hoveredIndex.value]))

function tooltipStyle(point: Point) {
  return {
    left: `${(point.x / VIEW_WIDTH) * 100}%`,
    top: `${(point.y / VIEW_HEIGHT) * 100}%`,
  }
}
</script>

<template>
  <div v-if="points.length === 0" class="text-muted">Noch keine Testsimulation absolviert.</div>

  <div v-else class="chart-wrap">
    <svg
      :viewBox="`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`"
      role="img"
      aria-label="Testergebnisse im zeitlichen Verlauf, Details in der Tabelle darunter"
    >
      <!-- gridlines -->
      <g v-for="value in gridLines" :key="value">
        <line
          :x1="PADDING.left"
          :x2="VIEW_WIDTH - PADDING.right"
          :y1="yFor(value)"
          :y2="yFor(value)"
          class="gridline"
        />
        <text :x="PADDING.left - 8" :y="yFor(value)" class="tick-label" text-anchor="end" dominant-baseline="middle">
          {{ value }}%
        </text>
      </g>

      <!-- pass threshold reference line -->
      <line
        :x1="PADDING.left"
        :x2="VIEW_WIDTH - PADDING.right"
        :y1="passLineY"
        :y2="passLineY"
        class="pass-line"
      />
      <text :x="VIEW_WIDTH - PADDING.right" :y="passLineY - 4" class="pass-label" text-anchor="end">
        Bestehensgrenze ({{ Math.round(passRatio * 100) }}%)
      </text>

      <!-- x-axis date labels: first and last only, to avoid collisions -->
      <text
        v-if="firstPoint"
        :x="firstPoint.x"
        :y="VIEW_HEIGHT - PADDING.bottom + 16"
        class="tick-label"
        text-anchor="start"
      >
        {{ formatDateShort(firstPoint.completedAt) }}
      </text>
      <text
        v-if="lastPoint && points.length > 1"
        :x="lastPoint.x"
        :y="VIEW_HEIGHT - PADDING.bottom + 16"
        class="tick-label"
        text-anchor="end"
      >
        {{ formatDateShort(lastPoint.completedAt) }}
      </text>

      <!-- trend line -->
      <path :d="linePath" class="trend-line" fill="none" />

      <!-- direct label on the last point -->
      <text v-if="lastPoint" :x="lastPoint.x" :y="lastPoint.y - 12" class="end-label" text-anchor="end">
        {{ Math.round(lastPoint.percent) }}%
      </text>

      <!-- points + hover hit-areas -->
      <g v-for="(point, index) in points" :key="point.completedAt + index">
        <circle :cx="point.x" :cy="point.y" r="4" :class="point.passed ? 'dot-success' : 'dot-danger'" />
        <circle
          :cx="point.x"
          :cy="point.y"
          r="10"
          class="hit-area"
          tabindex="0"
          role="img"
          :aria-label="`${formatDateTimeLong(point.completedAt)}: ${point.correct} von ${point.total} richtig, ${point.passed ? 'bestanden' : 'nicht bestanden'}`"
          @mouseenter="hoveredIndex = index"
          @mouseleave="hoveredIndex = null"
          @focus="hoveredIndex = index"
          @blur="hoveredIndex = null"
        >
          <title>
            {{ formatDateTimeLong(point.completedAt) }}: {{ point.correct }}/{{ point.total }} richtig ({{
              Math.round(point.percent)
            }}%) – {{ point.passed ? 'Bestanden' : 'Nicht bestanden' }}
          </title>
        </circle>
      </g>
    </svg>

    <div v-if="hoveredPoint" class="chart-tooltip" :style="tooltipStyle(hoveredPoint)">
      <div class="fw-semibold">{{ formatDateTimeLong(hoveredPoint.completedAt) }}</div>
      <div>{{ hoveredPoint.correct }} / {{ hoveredPoint.total }} richtig ({{ Math.round(hoveredPoint.percent) }}%)</div>
      <span class="badge" :class="hoveredPoint.passed ? 'bg-success' : 'bg-danger'">
        {{ hoveredPoint.passed ? 'Bestanden' : 'Nicht bestanden' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.chart-wrap {
  position: relative;
}

svg {
  width: 100%;
  height: auto;
  display: block;
}

.gridline {
  stroke: var(--bs-border-color);
  stroke-width: 1;
}

.tick-label {
  fill: var(--bs-secondary-color);
  font-size: 11px;
}

.pass-line {
  stroke: var(--bs-secondary-color);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.pass-label {
  fill: var(--bs-secondary-color);
  font-size: 10px;
}

.trend-line {
  stroke: var(--bs-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.end-label {
  fill: var(--bs-body-color);
  font-size: 12px;
  font-weight: 600;
}

.dot-success {
  fill: var(--bs-success);
  stroke: #fff;
  stroke-width: 2;
}

.dot-danger {
  fill: var(--bs-danger);
  stroke: #fff;
  stroke-width: 2;
}

.hit-area {
  fill: transparent;
  cursor: pointer;
}

.hit-area:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.chart-tooltip {
  position: absolute;
  transform: translate(-50%, -125%);
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.8rem;
  box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.1);
  pointer-events: none;
  white-space: nowrap;
  z-index: 1;
}
</style>
