import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue'),
    },
    {
      path: '/themen',
      name: 'topics',
      component: () => import('@/views/TopicSelect.vue'),
    },
    {
      path: '/lernen/:topic',
      name: 'study-session',
      component: () => import('@/views/StudySession.vue'),
      props: (route) => ({ topic: Number(route.params.topic) }),
    },
    {
      path: '/lernen-gemischt',
      name: 'study-session-mixed',
      component: () => import('@/views/StudySession.vue'),
      props: { mode: 'mixed' },
    },
    {
      path: '/test',
      name: 'study-session-test',
      component: () => import('@/views/StudySession.vue'),
      props: { mode: 'test' },
    },
    {
      path: '/statistik',
      name: 'stats',
      component: () => import('@/views/Stats.vue'),
    },
  ],
})

export default router
