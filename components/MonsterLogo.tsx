// MonsterLogo — SVG monster mascot as a React component.
// The `color` prop controls all body-surface fills (body, horns, feet).
// Eyes are always white with dark pupils. Smile is always white.
// `showText` renders a wordmark beside the monster as a <span>.
// Default wordmark is "LeadMonster" (platform brand). Pass `text` to override
// with a per-product name (e.g. on product subsites).

interface MonsterLogoProps {
  color?: string       // body/horns/feet fill (default: '#abd5f4')
  size?: number        // height in px — SVG scales proportionally (default: 40)
  showText?: boolean   // show wordmark (default: false)
  text?: string        // wordmark string — overrides default "LeadMonster"
  textColor?: string   // wordmark text color (default: '#1a365d')
  className?: string
}

export function MonsterLogo({
  color = '#02a9e6',
  size = 40,
  showText = false,
  text,
  textColor = '#1a365d',
  className,
}: MonsterLogoProps) {
  // Scale factor for the viewBox (0 0 40 52)
  const width = Math.round((size / 52) * 40)

  return (
    <span
      className={`inline-flex items-center gap-2 ${className ?? ''}`}
      aria-label="LeadMonster"
    >
      <svg
        viewBox="0 0 40 52"
        width={width}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        {/* Left horn */}
        <ellipse
          cx="13"
          cy="7"
          rx="3.5"
          ry="6"
          fill={color}
          transform="rotate(-18 13 7)"
        />
        {/* Right horn */}
        <ellipse
          cx="27"
          cy="7"
          rx="3.5"
          ry="6"
          fill={color}
          transform="rotate(18 27 7)"
        />

        {/* Body blob — rounded shape */}
        <path
          d="M 6 38 C 2 38 1 33 1 27 L 1 19 C 1 10 5 6 11 5 C 13 2 16 0 20 0 C 24 0 27 2 29 5 C 35 6 39 10 39 19 L 39 27 C 39 33 38 38 34 38 Z"
          fill={color}
        />

        {/* Left eye white */}
        <circle cx="14" cy="21" r="5.5" fill="white" />
        {/* Left pupil */}
        <circle cx="15" cy="22" r="2.8" fill="#1a1a1a" />
        {/* Left eye shine */}
        <circle cx="16.5" cy="20.5" r="1" fill="white" />

        {/* Right eye white */}
        <circle cx="26" cy="21" r="5.5" fill="white" />
        {/* Right pupil */}
        <circle cx="27" cy="22" r="2.8" fill="#1a1a1a" />
        {/* Right eye shine */}
        <circle cx="28.5" cy="20.5" r="1" fill="white" />

        {/* Smile */}
        <path
          d="M 13 31 Q 20 38 27 31"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />

        {/* Three fur spike dots on top of head */}
        <circle cx="20" cy="1.5" r="1.8" fill={color} />

        {/* Left foot */}
        <ellipse cx="14" cy="41" rx="5.5" ry="3.5" fill={color} />
        {/* Right foot */}
        <ellipse cx="26" cy="41" rx="5.5" ry="3.5" fill={color} />

        {/* Belly highlight */}
        <ellipse cx="20" cy="26" rx="7" ry="9" fill="white" fillOpacity="0.15" />
      </svg>

      {showText && (
        <span
          style={{ color: textColor, fontWeight: 700, fontSize: '1.1em', letterSpacing: '-0.01em' }}
        >
          {text ?? 'LeadMonster'}
        </span>
      )}
    </span>
  )
}
