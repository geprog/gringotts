export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();
  await auth.load();
  const { user } = auth;

  if (!user && to.path !== '/auth/login') {
    return navigateTo('/auth/login');
  }

  if (user && to.path === '/auth/login') {
    return navigateTo('/');
  }
});
