// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@pinia/nuxt'],
  runtimeConfig: {
    auth: {
      name: 'nuxt-session',
      password: 'my-super-secret-password-is-minimum-32-characters-long',
    },
    public: {
      api: {
        clientBaseUrl: 'http://localhost:7171/api',
        baseUrl: 'http://localhost:7171/api',
      },
    },
  },
  app: {
    head: {
      title: 'Gringotts',
      link: [
        { rel: 'alternate icon', type: 'image/png', href: '/logo.png' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  icon: {
    provider: 'server',
  },

  compatibilityDate: '2025-08-11',

  // nitro: {
  //   preset: 'node',
  // },
});
