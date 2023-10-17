import { defineStore } from 'pinia';

export const useAuth = defineStore('auth', () => {
  const { data: user, refresh: updateSession } = useFetch('/api/user');

  const isAuthenticated = computed(() => !!user.value?.token);

  function login() {
    window.location.href = `/api/auth/login`;
  }

  function logout() {
    window.location.href = '/api/auth/logout';
  }

  const loaded = ref(false);
  async function load() {
    if (loaded.value) {
      return;
    }

    await updateSession();

    loaded.value = true;
  }

  return {
    load,
    isAuthenticated,
    user,
    login,
    logout,
    updateSession,
  };
});
