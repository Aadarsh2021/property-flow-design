import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'

type StoreRef<T> = { value: T; getSnapshot: () => T }

const objectIs: typeof Object.is =
  typeof Object.is === 'function'
    ? Object.is
    : (value, nextValue) =>
        (value === nextValue && (value !== 0 || 1 / value === 1 / nextValue)) ||
        (value !== value && nextValue !== nextValue)

function handleStoreChange<T>(
  instRef: MutableRefObject<StoreRef<T>>,
  setState: Dispatch<SetStateAction<StoreRef<T>>>,
) {
  const { getSnapshot } = instRef.current
  const nextValue = getSnapshot()
  if (!objectIs(nextValue, instRef.current.value)) {
    setState({ value: nextValue })
  }
}

function subscribeToStore<T>(
  subscribe: (listener: () => void) => () => void,
  instRef: MutableRefObject<StoreRef<T>>,
  setState: Dispatch<SetStateAction<StoreRef<T>>>,
) {
  return subscribe(() => {
    handleStoreChange(instRef, setState)
  })
}

export function useSyncExternalStore<T>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => T,
): T {
  const instRef = useRef<StoreRef<T>>({
    value: getSnapshot(),
    getSnapshot,
  })
  const [state, setState] = useState<StoreRef<T>>(instRef.current)
  const value = state.value

  useLayoutEffect(() => {
    instRef.current.value = value
    instRef.current.getSnapshot = getSnapshot
  }, [value, getSnapshot])

  useEffect(() => {
    return subscribeToStore(subscribe, instRef, setState)
  }, [subscribe])

  useEffect(() => {
    handleStoreChange(instRef, setState)
  })

  return value
}

export default useSyncExternalStore

