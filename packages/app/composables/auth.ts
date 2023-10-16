export async function useAuth() {
  const { data: user, refresh: updateSession } = await useFetch('/api/user');

  const isAuthenticated = computed(() => !!user.value?.token);

  function login() {
    window.location.href = `/api/auth/login`;
  }

  function logout() {
    window.location.href = '/api/auth/logout';
  }

  return {
    isAuthenticated,
    user,
    login,
    logout,
    updateSession,
  };
}
