import { useEffect, useRef, useState } from 'react'
import './FlashNumber.css'

/**
 * A number that pops briefly when it changes, so you notice a count moving after you
 * drag a card or save a form. The first render doesn't pop.
 */
export default function FlashNumber({ value }: { value: number }) {
  const previous = useRef(value)
  const [flashes, setFlashes] = useState(0)

  useEffect(() => {
    if (previous.current === value) return
    previous.current = value
    setFlashes((n) => n + 1)
  }, [value])

  // A new key remounts the span, which restarts the animation on every change
  return (
    <span key={flashes} className={flashes > 0 ? 'flash-number flash-number--changed' : 'flash-number'}>
      {value}
    </span>
  )
}
