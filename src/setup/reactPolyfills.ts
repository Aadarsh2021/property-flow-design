type ReactModule = typeof import('react')

let hasPatched = false

const ensureGlobals = async () => {
  if (typeof window === 'undefined') return
  const win = window as any
  if (win.__awaitReact) return

  win.__awaitReact = import('react')
    .then((module) => (module as { default?: ReactModule }).default ?? (module as ReactModule))
    .then((React) => {
      win.React = React
      ;(globalThis as any).React = React
      return React
    })
    .catch((error) => {
      console.error('[polyfill] Failed to preload React for globals', error)
      throw error
    })
}

const applyPolyfill = async () => {
  try {
    await ensureGlobals()
    const win = typeof window !== 'undefined' ? (window as any) : undefined
    const React = (win?.React ?? (win?.__awaitReact ? await win.__awaitReact : undefined)) as ReactModule | undefined

    if (!React) {
      console.error('[polyfill] React global unavailable after ensureGlobals')
      return
    }

    if (typeof React.useSyncExternalStore !== 'function') {
      const shimModule = (await import('use-sync-external-store/shim')) as unknown as {
        default?: ReactModule['useSyncExternalStore']
        useSyncExternalStore?: ReactModule['useSyncExternalStore']
      }
      const useSyncExternalStoreShim = shimModule.useSyncExternalStore ?? shimModule.default

      if (typeof useSyncExternalStoreShim === 'function') {
        React.useSyncExternalStore = useSyncExternalStoreShim
      } else {
        console.warn('[polyfill] useSyncExternalStore shim could not be loaded')
      }
    }

    hasPatched = true
  } catch (error) {
    console.error('[polyfill] Failed to apply React polyfill', error)
  }
}

void applyPolyfill()

