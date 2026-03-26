import {
  useEffect,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import type { LucideIcon } from 'lucide-react'

import { cn } from '../../lib/cn'

export function AdminPanel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[24px] border border-[#dbcdb8] bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]',
        className
      )}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[#eadfce] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="admin-display text-[1.15rem] font-semibold text-slate-950">
          {title}
        </h2>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'success'
  | 'danger'
  | 'warning'

export function AdminButton({
  children,
  className,
  icon: Icon,
  iconClassName,
  variant = 'primary',
  ...props
}: {
  children: ReactNode
  className?: string
  icon?: LucideIcon
  iconClassName?: string
  variant?: ButtonVariant
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantClassName = {
    primary:
      'border-[#d0922c] bg-[#d0922c] text-white hover:bg-[#b67a1b] hover:border-[#b67a1b]',
    secondary:
      'border-[#ddd1be] bg-white text-slate-700 hover:border-[#cfbeaa] hover:bg-[#faf7f1]',
    ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-white/70',
    success: 'border-[#2f7d4b] bg-[#2f7d4b] text-white hover:bg-[#25643c]',
    danger: 'border-[#c62f2f] bg-[#c62f2f] text-white hover:bg-[#a82323]',
    warning: 'border-[#f0c95e] bg-[#fff6da] text-[#ac7012] hover:bg-[#fff0bf]',
  } satisfies Record<ButtonVariant, string>

  return (
    <button
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border px-4 text-sm font-semibold leading-none whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60 disabled:cursor-not-allowed disabled:opacity-60',
        variantClassName[variant],
        className
      )}
      type="button"
      {...props}
    >
      {Icon ? (
        <Icon className={cn('h-4 w-4', iconClassName)} strokeWidth={2} />
      ) : null}
      <span>{children}</span>
    </button>
  )
}

type BadgeTone =
  | 'neutral'
  | 'active'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  const toneClassName = {
    neutral: 'bg-slate-100 text-slate-600',
    active: 'bg-[#dce9ff] text-[#2458b8]',
    success: 'bg-[#e3f3e9] text-[#2a8150]',
    warning: 'bg-[#fff1bf] text-[#b87200]',
    danger: 'bg-[#ffe1df] text-[#c7372e]',
    info: 'bg-[#e7f0ff] text-[#3569c7]',
  } satisfies Record<BadgeTone, string>

  return (
    <span
      className={cn(
        'inline-flex min-h-8 min-w-[88px] items-center justify-center rounded-full px-3.5 text-xs font-semibold leading-none whitespace-nowrap',
        toneClassName[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function FieldLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <label
      className={cn(
        'block text-xs font-semibold uppercase tracking-[0.18em] text-[#8da2c5]',
        className
      )}
    >
      {children}
    </label>
  )
}

export const inputClassName =
  'mt-2 min-h-12 w-full rounded-xl border border-[#ddcfba] bg-white px-4 text-[0.95rem] text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition placeholder:text-slate-400 focus:border-[#d0922c] focus:ring-4 focus:ring-[#d0922c]/10'

export const toolbarInputClassName = `${inputClassName} mt-0`

export const tableActionButtonClassName = 'min-w-[112px] rounded-[14px] px-4'

export function EmptyPanel({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8cab2] bg-[#fcfaf6] px-6 py-10 text-center">
      <h3 className="admin-display text-xl font-semibold text-slate-950">
        {title}
      </h3>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  )
}

export function LoadingPanel({ title }: { title: string }) {
  return (
    <AdminPanel className="px-6 py-10">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eadfce] border-t-[#d0922c]" />
        <div>
          <h3 className="admin-display text-xl font-semibold text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Pulling the latest staff workspace data.
          </p>
        </div>
      </div>
    </AdminPanel>
  )
}

export function ErrorPanel({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <AdminPanel className="border-[#f0c7c4] bg-[#fff8f7] px-6 py-6">
      <h3 className="admin-display text-xl font-semibold text-[#8f2621]">
        {title}
      </h3>
      <p className="mt-2 text-sm text-[#a54a42]">{message}</p>
    </AdminPanel>
  )
}

export function InlineNotice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'danger'
  children: ReactNode
  className?: string
}) {
  const toneClassName = {
    info: 'border-[#d6e2ff] bg-[#f5f8ff] text-[#4165a2]',
    success: 'border-[#c9e7d3] bg-[#f5fbf7] text-[#2f7d4b]',
    danger: 'border-[#f0c7c4] bg-[#fff7f6] text-[#a83932]',
  } satisfies Record<'info' | 'success' | 'danger', string>

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 text-sm',
        toneClassName[tone],
        className
      )}
    >
      {children}
    </div>
  )
}

export function TableWrap({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('overflow-x-auto', className)}>{children}</div>
}

export function DataTable({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <table className={cn('min-w-full border-collapse text-left', className)}>
      {children}
    </table>
  )
}

export function TableHeadRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <tr
      className={cn(
        'bg-[#faf7f1] text-xs uppercase tracking-[0.14em] text-[#89a0c4]',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function TableCell({
  children,
  className,
  header = false,
}: {
  children: ReactNode
  className?: string
  header?: boolean
}) {
  const Element = header ? 'th' : 'td'
  return (
    <Element
      className={cn(
        'border-b border-[#eadfce] px-4 py-4 align-top text-sm text-slate-700',
        header ? 'font-semibold' : '',
        className
      )}
    >
      {children}
    </Element>
  )
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
  onClick,
}: {
  label: string
  value: number
  hint: string
  accent: string
  icon: LucideIcon
  onClick?: () => void
}) {
  const cardClassName = cn(
    'relative min-h-[138px] overflow-hidden rounded-[24px] border border-[#dbcdb8] bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]',
    onClick
      ? 'cursor-pointer text-left transition hover:-translate-y-0.5 hover:border-[#d4c3ac] hover:shadow-[0_22px_50px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/60'
      : ''
  )

  const cardContent = (
    <>
      <div
        className="absolute inset-x-0 bottom-0 h-1"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between gap-4 px-6 py-5">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#88a0c5]">
            {label}
          </p>
          <div className="space-y-1">
            <p className="admin-display text-5xl leading-none font-semibold text-slate-950">
              {value}
            </p>
            <p className="text-sm text-slate-500">{hint}</p>
          </div>
        </div>
        <Icon className="mt-2 h-9 w-9 text-slate-200" strokeWidth={1.7} />
      </div>
    </>
  )

  if (onClick) {
    return (
      <button className={cardClassName} type="button" onClick={onClick}>
        {cardContent}
      </button>
    )
  }

  return (
    <AdminPanel className="relative min-h-[138px] overflow-hidden">
      {cardContent}
    </AdminPanel>
  )
}

export function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  preview,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  preview?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#eadfce] py-5 last:border-b-0">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-slate-950">{title}</p>
          {preview}
        </div>
        <p className="max-w-2xl text-sm text-slate-500">{description}</p>
      </div>
      <button
        aria-checked={checked}
        className={cn(
          'relative h-8 w-12 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d0922c]/50',
          checked ? 'bg-[#2f7d4b]' : 'bg-[#cad6e8]',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        disabled={disabled}
        role="switch"
        type="button"
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition',
            checked ? 'left-5' : 'left-1'
          )}
        />
      </button>
    </div>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  className?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        aria-modal="true"
        className={cn(
          'max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[28px] border border-[#dacdb8] bg-[#fffdf9] shadow-[0_28px_80px_rgba(15,23,42,0.2)]',
          className
        )}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#eadfce] px-6 py-5">
          <h2 className="admin-display text-[1.35rem] font-semibold text-slate-950">
            {title}
          </h2>
          <AdminButton variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}

export function DefinitionList({
  items,
  className,
}: {
  items: Array<{ label: string; value: ReactNode }>
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid gap-4 rounded-2xl border border-[#eadfce] bg-[#fcfaf6] p-5 md:grid-cols-2',
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8da2c5]">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm text-slate-700">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Stack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('space-y-6', className)}>{children}</div>
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('px-6 py-6', className)}>{children}</div>
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-[#d7cab4] bg-[#fffdf9] p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]',
        className
      )}
    >
      {children}
    </div>
  )
}
