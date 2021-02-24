import {useMemo, useRef} from "react";

export default function useOnce(fn: Function, updater) {
  const once = useRef()

  return useMemo(() => {
    if (!once.current) {
      once.current = fn()
    }
    return once.current
  }, updater)
}