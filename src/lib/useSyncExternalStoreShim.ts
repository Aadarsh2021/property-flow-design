import React from 'react'

const useSyncExternalStore =
  React?.useSyncExternalStore ??
  (((subscribe, getSnapshot) => {
    throw new Error(
      'React.useSyncExternalStore is unavailable. Ensure the app runs with React 18+.',
    )
  }) as typeof React.useSyncExternalStore)

export { useSyncExternalStore }
export default useSyncExternalStore

