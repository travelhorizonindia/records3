// ─── Button ───────────────────────────────────────────────────────────────────
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  className = '',
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      )}
      {children}
    </button>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export const Input = ({ label, error, required, className = '', ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500
        ${error ? 'border-red-400' : 'border-gray-300'} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Textarea ─────────────────────────────────────────────────────────────────
export const Textarea = ({ label, error, required, className = '', rows = 3, ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <textarea
      rows={rows}
      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y
        ${error ? 'border-red-400' : 'border-gray-300'} ${className}`}
      {...props}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Select ───────────────────────────────────────────────────────────────────
export const Select = ({ label, error, required, options = [], placeholder = 'Select...', className = '', ...props }) => (
  <div className="space-y-1">
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <select
      className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white
        ${error ? 'border-red-400' : 'border-gray-300'} ${className}`}
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) =>
        typeof opt === 'string' ? (
          <option key={opt} value={opt}>{opt}</option>
        ) : (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        )
      )}
    </select>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)

// ─── Checkbox ─────────────────────────────────────────────────────────────────
export const Checkbox = ({ label, className = '', ...props }) => (
  <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" {...props} />
    {label && <span className="text-sm text-gray-700">{label}</span>}
  </label>
)

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
)

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>{children}</div>
)

export const CardHeader = ({ children, className = '' }) => (
  <div className={`px-5 py-4 border-b border-gray-100 ${className}`}>{children}</div>
)

export const CardBody = ({ children, className = '' }) => (
  <div className={`px-5 py-4 ${className}`}>{children}</div>
)

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, size = 'md' }) => {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', '2xl': 'max-w-5xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[80vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────
export const Table = ({ columns, data, loading, emptyText = 'No records found', onRowClick }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <svg className="animate-spin h-6 w-6 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead>
          <tr className="bg-gray-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-400">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key] || '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Alert / Toast ────────────────────────────────────────────────────────────
export const Alert = ({ type = 'error', message, onClose }) => {
  if (!message) return null
  const styles = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  }
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${styles[type]}`}>
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 flex-shrink-0">✕</button>
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, icon, color = 'blue', sub }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        {icon && (
          <div className={`p-3 rounded-xl ${colors[color]}`}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export const EmptyState = ({ title, description, action }) => (
  <div className="text-center py-16">
    <div className="text-4xl mb-3">📋</div>
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, onConfirm, onCancel, title, message, confirmLabel = 'Delete', variant = 'danger' }) => (
  <Modal open={open} onClose={onCancel} title={title} size="sm">
    <p className="text-sm text-gray-600 mb-6">{message}</p>
    <div className="flex gap-3 justify-end">
      <Button variant="secondary" onClick={onCancel}>Cancel</Button>
      <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
    </div>
  </Modal>
)

// ─── Page Header ──────────────────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
)

// ─── Search Input ─────────────────────────────────────────────────────────────
export const SearchInput = ({ value, onChange, placeholder = 'Search...', className = '' }) => (
  <div className={`relative ${className}`}>
    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
)

// ─── Tabs ─────────────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div className="border-b border-gray-200 mb-5">
    <nav className="flex gap-1 -mb-px">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            active === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
              active === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
            }`}>{tab.count}</span>
          )}
        </button>
      ))}
    </nav>
  </div>
)

// ─── Section Divider ──────────────────────────────────────────────────────────
export const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-5">{children}</h3>
)

// ─── Info Row ─────────────────────────────────────────────────────────────────
export const InfoRow = ({ label, value }) => (
  <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
    <span className="text-sm text-gray-500 w-40 flex-shrink-0">{label}</span>
    <span className="text-sm text-gray-900 font-medium">{value || '—'}</span>
  </div>
)
