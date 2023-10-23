// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['nuxt-icon', '@nuxt/ui', '@pinia/nuxt'],
  runtimeConfig: {
    auth: {
      name: 'nuxt-session',
      password: 'my-super-secret-password-is-minimum-32-characters-long',
    },
    public: {
      api: {
        baseUrl: 'http://localhost:7171/api',
      },
    },
  },
  ignore: ['data/**/*'],
  ui: {
    icons: ['mdi', 'simple-icons', 'heroicons', 'ion'],
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
  // nitro: {
  //   preset: 'node',
  // },
});
