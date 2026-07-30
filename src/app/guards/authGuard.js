export function setupRouterGuards(router) {
  router.beforeEach((to) => {
    const title = to.meta?.title
    if (title) {
      document.title = `${title} | Investory`
    }
  })
}
