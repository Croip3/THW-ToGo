<script setup lang="ts">
import thwEmblem from '@/assets/logo/thw-emblem.webp'
</script>

<template>
  <nav class="navbar navbar-expand-sm navbar-dark bg-primary mb-3">
    <div class="container">
      <RouterLink class="navbar-brand d-flex align-items-center gap-2" to="/">
        <span class="navbar-logo-badge">
          <img :src="thwEmblem" alt="" width="22" height="22" />
        </span>
        THW ToGo
      </RouterLink>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Navigation umschalten"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div id="navbarNav" class="collapse navbar-collapse">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/" active-class="active">Dashboard</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/themen" active-class="active">Themen</RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/statistik" active-class="active">Statistik</RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <RouterView />

  <footer class="text-center text-muted small py-4 mt-5 border-top">
    Diese App ist ein inoffizielles, privates Lernprojekt und steht in keiner Verbindung zur Bundesanstalt
    Technisches Hilfswerk (THW). Alle Marken und Logos gehören ihren jeweiligen Rechteinhabern.
  </footer>
</template>

<style scoped>
.navbar-logo-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  background: #fff;
  border-radius: 50%;
  padding: 0.25rem;
}
</style>
