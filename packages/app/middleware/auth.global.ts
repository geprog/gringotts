export default defineNuxtRouteMiddleware((to, from) => {
  const token = useCookie('project-token');

  if (token.value && to.path === '/auth/login') {
    return navigateTo('/');
  }

  if (!token.value && to.path !== '/auth/login') {
    return navigateTo('/auth/login');
  }
});
