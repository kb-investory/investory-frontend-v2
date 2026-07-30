export function setupRouterGuards(router) {
  router.beforeEach((to, from, next) => {
    const title = to.meta?.title
    if (title) {
      document.title = `${title} | Investory`
    }
    next()
  })
}
