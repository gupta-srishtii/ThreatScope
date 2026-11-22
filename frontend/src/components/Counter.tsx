import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'
import { number } from '../lib/utils'

export function Counter({ value }: { value: number }) {
  const reduced = useReducedMotion()
  const previous = useRef(value)
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    if (reduced) { setDisplay(value); previous.current = value; return }
    const animation = animate(previous.current, value, { duration: .45, ease: 'easeOut', onUpdate: setDisplay })
    previous.current = value
    return () => animation.stop()
  }, [value, reduced])
  return <><span aria-hidden="true">{number(Math.round(display))}</span><span className="sr-only">{number(value)}</span></>
}
