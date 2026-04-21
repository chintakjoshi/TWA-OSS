import { useMemo, useRef, useState } from 'react'

import { isCompleteOtpCode, normalizeOtpCode, OTP_CODE_LENGTH } from './otp'

function boxStyles({
  active,
  filled,
  disabled,
}: {
  active: boolean
  filled: boolean
  disabled: boolean
}) {
  return {
    alignItems: 'center',
    backgroundColor: disabled ? '#f8f4ee' : '#fffdf9',
    border: active
      ? '1px solid #d0922c'
      : filled
        ? '1px solid #b89c73'
        : '1px solid #ddcfba',
    borderRadius: '1rem',
    boxShadow: active
      ? '0 0 0 4px rgba(208, 146, 44, 0.12)'
      : 'inset 0 1px 0 rgba(255,255,255,0.65)',
    color: disabled ? '#94a3b8' : '#0f172a',
    display: 'flex',
    fontSize: '1.2rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    height: '3.25rem',
    justifyContent: 'center',
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
    userSelect: 'none' as const,
  }
}

export function OtpCodeInput({
  ariaDescribedBy,
  ariaLabel,
  disabled = false,
  id,
  name,
  value,
  onChange,
}: {
  ariaDescribedBy?: string
  ariaLabel: string
  disabled?: boolean
  id?: string
  name?: string
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const normalizedValue = useMemo(() => normalizeOtpCode(value), [value])
  const activeIndex = normalizedValue.length >= OTP_CODE_LENGTH
    ? OTP_CODE_LENGTH - 1
    : normalizedValue.length

  return (
    <div
      style={{ cursor: disabled ? 'not-allowed' : 'text' }}
      onClick={() => {
        if (!disabled) inputRef.current?.focus()
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          aria-describedby={ariaDescribedBy}
          aria-label={ariaLabel}
          autoComplete="one-time-code"
          disabled={disabled}
          id={id}
          inputMode="numeric"
          maxLength={OTP_CODE_LENGTH}
          minLength={OTP_CODE_LENGTH}
          name={name}
          pattern={`\\d{${OTP_CODE_LENGTH}}`}
          spellCheck={false}
          type="text"
          value={normalizedValue}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onChange(normalizeOtpCode(event.target.value))}
          onFocus={() => setIsFocused(true)}
          style={{
            cursor: disabled ? 'not-allowed' : 'text',
            inset: 0,
            opacity: 0,
            position: 'absolute',
            width: '100%',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: `repeat(${OTP_CODE_LENGTH}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: OTP_CODE_LENGTH }, (_, index) => {
            const character = normalizedValue[index] ?? ''
            const filled = character !== ''
            const active = isFocused && index === activeIndex

            return (
              <div
                key={index}
                data-testid="otp-digit-box"
                style={boxStyles({ active, filled, disabled })}
              >
                {filled ? character : '\u00A0'}
              </div>
            )
          })}
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{
          color: isCompleteOtpCode(normalizedValue) ? '#2f7d4b' : '#64748b',
          fontSize: '0.8rem',
          marginTop: '0.6rem',
          minHeight: '1rem',
          textAlign: 'right',
        }}
      >
        {normalizedValue.length}/{OTP_CODE_LENGTH}
      </div>
    </div>
  )
}
