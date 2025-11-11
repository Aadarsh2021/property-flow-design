import React from 'react'
import { useSyncExternalStore as useSyncExternalStoreShim } from 'use-sync-external-store/shim'
import { useSyncExternalStoreWithSelector as useSyncExternalStoreWithSelectorShim } from 'use-sync-external-store/shim/with-selector'

if (typeof React.useSyncExternalStore !== 'function') {
  React.useSyncExternalStore = useSyncExternalStoreShim
}

const reactWithSelector = React as typeof React & {
  useSyncExternalStoreWithSelector?: typeof useSyncExternalStoreWithSelectorShim
}

if (typeof reactWithSelector.useSyncExternalStoreWithSelector !== 'function') {
  reactWithSelector.useSyncExternalStoreWithSelector = useSyncExternalStoreWithSelectorShim
}

