/**
 * Mobile Detection Hook
 * 
 * Custom React hook for detecting mobile devices and screen size
 * in the Property Flow Design application.
 * 
 * Features:
 * - Mobile device detection
 * - Screen size monitoring
 * - Responsive design support
 * - Window resize handling
 * 
 * @author Account Ledger Team
 * @version 1.0.0
 */

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
