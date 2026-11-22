// Adapted from Magic UI Grid Pattern, distributed through 21st.dev (MIT).
// https://docs.21st.dev/@dillionverma/components/grid-pattern
// https://magicui.design/r/grid-pattern.json
// Copyright (c) Magic UI. See THIRD_PARTY_NOTICES.md.
import { useId, type SVGProps } from 'react'
import { cn } from '../../lib/utils'

interface GridPatternProps extends SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  squares?: [number, number][]
}

export function GridPattern({
  width = 40,
  height = 40,
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = useId()
  return (
    <svg aria-hidden="true" focusable="false" className={cn('grid-pattern', className)} {...props}>
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={-1} y={-1}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
      {squares?.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          strokeWidth={0}
          width={width - 1}
          height={height - 1}
          x={x * width}
          y={y * height}
        />
      ))}
    </svg>
  )
}
