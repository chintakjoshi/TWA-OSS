import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react'

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger'

type ButtonProps = {
  children: ReactNode
  className?: string
  tone?: ButtonTone
} & React.ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  children,
  className,
  tone = 'primary',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx('button', `button-${tone}`, className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}

type AnchorButtonProps = {
  children: ReactNode
  href: string
  className?: string
  tone?: ButtonTone
} & React.AnchorHTMLAttributes<HTMLAnchorElement>

export function AnchorButton({
  children,
  className,
  href,
  tone = 'primary',
  ...props
}: AnchorButtonProps) {
  return (
    <a
      className={cx('button', `button-${tone}`, className)}
      href={href}
      {...props}
    >
      {children}
    </a>
  )
}

export function Card({
  children,
  className,
  strong = false,
  dark = false,
}: {
  children: ReactNode
  className?: string
  strong?: boolean
  dark?: boolean
}) {
  return (
    <section
      className={cx(
        'surface-card',
        strong && 'surface-card-strong',
        dark && 'surface-card-dark',
        className
      )}
    >
      {children}
    </section>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cx('card-body', className)}>{children}</div>
}

export function Alert({
  children,
  className,
  tone = 'info',
}: {
  children: ReactNode
  className?: string
  tone?: 'info' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className={cx('alert', `alert-${tone}`, className)}>{children}</div>
  )
}

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode
  className?: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}) {
  return (
    <span className={cx('badge', `badge-${tone}`, className)}>{children}</span>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  const generatedId = useId()
  const hintId = `${generatedId}-hint`
  const controlElement =
    isValidElement(children) && typeof children.type === 'string'
      ? children
      : null
  const controlProps = controlElement?.props as
    | { id?: string; 'aria-describedby'?: string }
    | undefined
  const controlId = controlProps?.id ?? generatedId
  const describedBy = [controlProps?.['aria-describedby'], hint ? hintId : null]
    .filter(Boolean)
    .join(' ')
  const enhancedChildren =
    controlElement !== null
      ? cloneElement(controlElement as ReactElement<Record<string, unknown>>, {
          id: controlId,
          'aria-describedby': describedBy || undefined,
        })
      : children

  return (
    <div className="field">
      <label htmlFor={controlElement ? controlId : undefined}>{label}</label>
      {enhancedChildren}
      {hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: Array<Array<ReactNode>>
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <Card className="modal-panel" strong>
        <CardBody className="stack-md">
          <div
            className="cluster"
            style={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h2 className="card-title">{title}</h2>
            <Button tone="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
          <div onClick={(event) => event.stopPropagation()}>{children}</div>
        </CardBody>
      </Card>
    </div>
  )
}
