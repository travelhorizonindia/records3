import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getVehicles, createVehicle, updateVehicle, softDeleteVehicle } from '../services/vehicleService.js'
import { vehicleServiceHistoryService } from '../services/expenseService.js'
import {
  Button, Input, Select, Checkbox, Modal, Table, Card, CardHeader, CardBody,
  PageHeader, SearchInput, Badge, ConfirmDialog, Alert, SectionTitle, InfoRow
} from '../components/ui/index.jsx'
import { formatDate, daysUntil } from '../utils/index.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const DOC_FIELDS = [
  { key: 'stateTax', label: 'State Tax', from: 'stateTaxFromDate', to: 'stateTaxToDate', url: 'stateTaxFileUrl' },
  { key: 'authorization', label: 'Authorization', from: 'authorizationFromDate', to: 'authorizationToDate', url: 'authorizationFileUrl' },
  { key: 'aitp', label: 'AITP Permit', from: 'aitpFromDate', to: 'aitpToDate', url: 'aitpFileUrl' },
  { key: 'insurance', label: 'Insurance', from: 'insuranceFromDate', to: 'insuranceToDate', url: 'insuranceFileUrl' },
  { key: 'pollution', label: 'Pollution Cert', from: 'pollutionFromDate', to: 'pollutionToDate', url: 'pollutionFileUrl' },
  { key: 'fitness', label: 'Fitness Cert', from: 'fitnessFromDate', to: 'fitnessToDate', url: 'fitnessFileUrl' },
]

export const SERVICE_TYPES = [
  'Engine Oil',
  'Gear Oil',
  'Differential Oil',
  'Brake Pad',
  'Air Filter',
  'Clutch Plate',
]

// Brake pad wheel positions
const WHEEL_POSITIONS = [
  { value: 'All', label: 'All Wheels' },
  { value: 'FL', label: 'Front Left' },
  { value: 'FR', label: 'Front Right' },
  { value: 'RL', label: 'Rear Left' },
  { value: 'RR', label: 'Rear Right' },
  { value: 'Front', label: 'Both Front' },
  { value: 'Rear', label: 'Both Rear' },
]

const SERVICE_ICONS = {
  'Engine Oil': '🛢️',
  'Gear Oil': '⚙️',
  'Differential Oil': '🔩',
  'Brake Pad': '🛑',
  'Air Filter': '💨',
  'Clutch Plate': '🔧',
}

const emptyVehicleForm = () => ({
  registrationNumber: '', chassisNumber: '', seater: '', color: '', odometer: '',
  stateTaxFromDate: '', stateTaxToDate: '', stateTaxFileUrl: '',
  authorizationFromDate: '', authorizationToDate: '', authorizationFileUrl: '',
  aitpFromDate: '', aitpToDate: '', aitpFileUrl: '',
  insuranceFromDate: '', insuranceToDate: '', insuranceFileUrl: '',
  pollutionFromDate: '', pollutionToDate: '', pollutionFileUrl: '',
  fitnessFromDate: '', fitnessToDate: '', fitnessFileUrl: '',
  isOnLoan: false, monthlyLoanEmi: '', emiDate: '', loanFreeOnDate: '',
})

const emptyServiceForm = () => ({
  date: new Date().toISOString().split('T')[0],
  odometerKm: '',
  serviceType: 'Engine Oil',
  wheelPosition: 'All',
  notes: '',
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getDocStatus = (toDate) => {
  const days = daysUntil(toDate)
  if (days === null) return null
  if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' }
  if (days <= 30) return { label: `${days}d left`, cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Valid', cls: 'bg-green-100 text-green-700' }
}

const formatKm = (km) => {
  const n = parseFloat(km)
  if (!n) return '—'
  return `${n.toLocaleString('en-IN')} km`
}

// ─── Service History Entry Form ───────────────────────────────────────────────

function ServiceEntryForm({ vehicleId, onSaved, user }) {
  const [form, setForm] = useState(emptyServiceForm())
  const [error, setError] = useState('')

  const isBrakePad = form.serviceType === 'Brake Pad'

  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      if (!f.odometerKm) throw new Error('Odometer reading is required')
      if (!f.serviceType) throw new Error('Service type is required')
      const payload = {
        vehicleId,
        date: f.date,
        odometerKm: f.odometerKm,
        serviceType: f.serviceType,
        wheelPosition: f.serviceType === 'Brake Pad' ? f.wheelPosition : '',
        notes: f.notes,
      }
      await vehicleServiceHistoryService.create(payload, user.username)
      setForm(emptyServiceForm())
      onSaved()
    }, [vehicleId, user.username, onSaved])
  )

  const handleSave = async () => {
    setError('')
    try { await save(form) } catch (e) { setError(e.message) }
  }

  return (
    <div className="border border-blue-100 rounded-xl bg-blue-50/40 p-4 mb-4">
      <p className="text-sm font-semibold text-blue-800 mb-3">Log New Service</p>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))}
        />
        <Input
          label="Odometer (km) *"
          type="number"
          placeholder="e.g. 45000"
          value={form.odometerKm}
          onChange={(e) => setForm(f => ({ ...f, odometerKm: e.target.value }))}
        />
        <Select
          label="Service Type *"
          value={form.serviceType}
          onChange={(e) => setForm(f => ({ ...f, serviceType: e.target.value }))}
          options={SERVICE_TYPES.map(s => ({ value: s, label: `${SERVICE_ICONS[s]} ${s}` }))}
        />
        {isBrakePad ? (
          <Select
            label="Wheel Position"
            value={form.wheelPosition}
            onChange={(e) => setForm(f => ({ ...f, wheelPosition: e.target.value }))}
            options={WHEEL_POSITIONS}
          />
        ) : null}
        <div className={isBrakePad ? 'col-span-2' : ''}>
          <Input
            label="Notes — optional"
            placeholder="Brand, vendor, remarks..."
            value={form.notes}
            onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex justify-end mt-3">
        <Button onClick={handleSave} loading={saving} size="sm">Save Service Entry</Button>
      </div>
    </div>
  )
}

// ─── Service History List ─────────────────────────────────────────────────────

function ServiceHistoryList({ records, onDelete, onUpdate, isAdmin, user }) {
  const [showFullHistory, setShowFullHistory] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)   // record being edited
  const [editForm, setEditForm] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState(null)  // id to delete
  const [saving, setSaving] = useState(false)

  // Group by serviceType for summary "last changed at" view
  const lastByType = useMemo(() => {
    const map = {}
      ;[...records]
        .sort((a, b) => parseFloat(b.odometerKm) - parseFloat(a.odometerKm))
        .forEach((r) => {
          if (!map[r.serviceType]) map[r.serviceType] = r
        })
    return map
  }, [records])

  const sorted = useMemo(
    () => [...records].sort((a, b) => parseFloat(b.odometerKm) - parseFloat(a.odometerKm)),
    [records]
  )

  const startEdit = (r) => {
    setEditingRecord(r.id)
    setEditForm({
      date: r.date || '',
      odometerKm: r.odometerKm || '',
      serviceType: r.serviceType || '',
      wheelPosition: r.wheelPosition || 'All',
      notes: r.notes || '',
    })
  }

  const cancelEdit = () => { setEditingRecord(null); setEditForm({}) }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await onUpdate(editingRecord, editForm)
      setEditingRecord(null)
      setEditForm({})
    } finally {
      setSaving(false)
    }
  }

  if (records.length === 0) {
    return <p className="text-sm text-gray-400 py-3">No service history recorded yet.</p>
  }

  return (
    <div>
      {/* Summary cards — last change per service type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {SERVICE_TYPES.map((type) => {
          const last = lastByType[type]
          return (
            <div key={type} className={`rounded-lg px-3 py-2.5 text-sm border ${last ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span>{SERVICE_ICONS[type]}</span>
                <span className="font-medium text-gray-800 text-xs">{type}</span>
              </div>
              {last ? (
                <>
                  <p className="text-blue-700 font-semibold text-xs">{formatKm(last.odometerKm)}</p>
                  <p className="text-gray-400 text-xs">{formatDate(last.date)}</p>
                  {last.wheelPosition && <p className="text-gray-400 text-xs">Wheel: {last.wheelPosition}</p>}
                </>
              ) : (
                <p className="text-gray-400 text-xs">Not recorded</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Full history — toggled */}
      <button
        type="button"
        onClick={() => setShowFullHistory(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 mb-2"
      >
        <span>{showFullHistory ? '▾' : '▸'}</span>
        {showFullHistory ? 'Hide Full History' : `View Full History (${records.length})`}
      </button>

      {showFullHistory && (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {sorted.map((r) => (
            <div key={r.id}>
              {editingRecord === r.id ? (
                // ── Inline edit form ──────────────────────────────────────────
                <div className="border border-blue-200 rounded-lg bg-blue-50/40 px-3 py-3 text-sm space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input label="Date" type="date" value={editForm.date}
                      onChange={(e) => setEditForm(f => ({ ...f, date: e.target.value }))} />
                    <Input label="Odometer (km)" type="number" value={editForm.odometerKm}
                      onChange={(e) => setEditForm(f => ({ ...f, odometerKm: e.target.value }))} />
                    <Select label="Service Type" value={editForm.serviceType}
                      onChange={(e) => setEditForm(f => ({ ...f, serviceType: e.target.value }))}
                      options={SERVICE_TYPES.map(s => ({ value: s, label: `${SERVICE_ICONS[s]} ${s}` }))} />
                    {editForm.serviceType === 'Brake Pad' && (
                      <Select label="Wheel Position" value={editForm.wheelPosition}
                        onChange={(e) => setEditForm(f => ({ ...f, wheelPosition: e.target.value }))}
                        options={WHEEL_POSITIONS} />
                    )}
                    <div className="col-span-2">
                      <Input label="Notes" value={editForm.notes}
                        onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                    <Button size="sm" loading={saving} onClick={saveEdit}>Save</Button>
                  </div>
                </div>
              ) : (
                // ── Normal row ────────────────────────────────────────────────
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{SERVICE_ICONS[r.serviceType] || '🔧'}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{r.serviceType}</span>
                        {r.serviceType === 'Brake Pad' && r.wheelPosition && (
                          <Badge className="bg-orange-50 text-orange-700 text-xs">{r.wheelPosition}</Badge>
                        )}
                        <span className="text-blue-700 font-semibold text-xs">{formatKm(r.odometerKm)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{formatDate(r.date)}</span>
                        {r.notes && <span>· {r.notes}</span>}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <button onClick={() => startEdit(r)}
                        className="text-xs text-blue-500 hover:text-blue-700" title="Edit entry">
                        Edit
                      </button>
                      <button onClick={() => setDeleteConfirm(r.id)}
                        className="text-xs text-red-400 hover:text-red-600" title="Delete entry">
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onConfirm={async () => { await onDelete(deleteConfirm); setDeleteConfirm(null) }}
        onCancel={() => setDeleteConfirm(null)}
        title="Delete Service Entry"
        message="Are you sure you want to delete this service history entry? This action can be undone by support."
      />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  const { user, isAdmin } = useAuth()
  const { data: vehicles = [], loading, refetch } = useAsync(getVehicles)
  const { data: allServiceHistory = [], refetch: refetchHistory } = useAsync(vehicleServiceHistoryService.getAll)

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailVehicle, setDetailVehicle] = useState(null)
  const [editVehicle, setEditVehicle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyVehicleForm())
  const [errors, setErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [formError, setFormError] = useState('')

  // Live version of detailVehicle (after refetch)
  const liveDetailVehicle = useMemo(
    () => detailVehicle ? vehicles.find(v => v.id === detailVehicle.id) || detailVehicle : null,
    [detailVehicle, vehicles]
  )

  // Service history for the currently open vehicle
  const vehicleServiceHistory = useMemo(() => {
    if (!liveDetailVehicle) return []
    return allServiceHistory.filter(r => r.vehicleId === liveDetailVehicle.id)
  }, [liveDetailVehicle, allServiceHistory])

  // ── Save vehicle ────────────────────────────────────────────────────────────
  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      if (editVehicle) {
        await updateVehicle(editVehicle.id, f, user.username)
      } else {
        await createVehicle(f, user.username)
      }
      await refetch()
      setModalOpen(false)
      setSuccessMsg(editVehicle ? 'Vehicle updated.' : 'Vehicle added.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editVehicle, user.username, refetch])
  )

  // ── Delete vehicle ──────────────────────────────────────────────────────────
  const [doDelete, { loading: deleting }] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteVehicle(deleteTarget.id, user.username)
      await refetch()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetch])
  )

  // ── Delete service history entry ────────────────────────────────────────────
  const handleDeleteServiceEntry = useCallback(async (id) => {
    await vehicleServiceHistoryService.softDelete(id, user.username)
    await refetchHistory()
  }, [user.username, refetchHistory])

  // ── Update service history entry ────────────────────────────────────────────
  const handleUpdateServiceEntry = useCallback(async (id, updates) => {
    await vehicleServiceHistoryService.update(id, updates, user.username)
    await refetchHistory()
  }, [user.username, refetchHistory])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return vehicles.filter(
      (v) =>
        v.registrationNumber?.toLowerCase().includes(q) ||
        v.color?.toLowerCase().includes(q) ||
        v.seater?.toLowerCase().includes(q)
    )
  }, [vehicles, search])

  const openAdd = () => {
    setEditVehicle(null)
    setForm(emptyVehicleForm())
    setErrors({})
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (v) => {
    setEditVehicle(v)
    setForm({ ...emptyVehicleForm(), ...v })
    setErrors({})
    setFormError('')
    setModalOpen(true)
  }

  const validate = () => {
    const e = {}
    if (!form.registrationNumber.trim()) e.registrationNumber = 'Required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setFormError('')
    try { await save(form) } catch (err) { setFormError(err.message) }
  }

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: errors[key],
  })

  const columns = [
    { key: 'registrationNumber', label: 'Reg. Number' },
    { key: 'seater', label: 'Seating' },
    { key: 'color', label: 'Color' },
    {
      key: 'insurance',
      label: 'Insurance',
      render: (v) => {
        const s = getDocStatus(v.insuranceToDate)
        return s ? <Badge className={s.cls}>{s.label}</Badge> : '—'
      },
    },
    {
      key: 'fitness',
      label: 'Fitness',
      render: (v) => {
        const s = getDocStatus(v.fitnessToDate)
        return s ? <Badge className={s.cls}>{s.label}</Badge> : '—'
      },
    },
    {
      key: 'actions',
      label: '',
      render: (v) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isAdmin && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(v)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(v)} className="text-red-500">Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Fleet Management"
        subtitle={`${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`}
        actions={isAdmin && <Button onClick={openAdd}>+ Add Vehicle</Button>}
      />

      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      <Card className="mt-4">
        <CardHeader>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by reg, color, seating..." className="max-w-sm" />
        </CardHeader>
        <Table columns={columns} data={filtered} loading={loading} onRowClick={setDetailVehicle} />
      </Card>

      {/* ── Add / Edit Vehicle Modal ──────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editVehicle ? 'Edit Vehicle' : 'Add Vehicle'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <SectionTitle>Basic Info</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Registration Number" required {...field('registrationNumber')} />
            <Input label="Chassis Number" {...field('chassisNumber')} />
            <Input label="Seating" placeholder='e.g. 4+1' {...field('seater')} />
            <Input label="Color" {...field('color')} />
            <Input label="Odometer" placeholder='e.g. 45000 km' {...field('odometer')} />
          </div>

          <SectionTitle>Documents</SectionTitle>
          {DOC_FIELDS.map((doc) => (
            <div key={doc.key} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label={`${doc.label} From`} type="date" {...field(doc.from)} />
              <Input label={`${doc.label} To`} type="date" {...field(doc.to)} />
              <Input label="File URL" placeholder="https://..." {...field(doc.url)} />
            </div>
          ))}

          <SectionTitle>Loan Details</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Checkbox label="Vehicle on Loan" checked={!!form.isOnLoan} onChange={(e) => setForm((f) => ({ ...f, isOnLoan: e.target.checked }))} />
          </div>
          {form.isOnLoan && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input label="Monthly EMI (₹)" type="number" {...field('monthlyLoanEmi')} />
              <Input label="EMI Date" placeholder='e.g. 5th of every month' {...field('emiDate')} />
              <Input label="Loan Free On" type="date" {...field('loanFreeOnDate')} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editVehicle ? 'Update Vehicle' : 'Add Vehicle'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Detail Modal ─────────────────────────────────────────────────────── */}
      <Modal open={!!detailVehicle} onClose={() => setDetailVehicle(null)} title={liveDetailVehicle?.registrationNumber || 'Vehicle'} size="xl">
        {liveDetailVehicle && (
          <div>
            {/* Basic info */}
            <SectionTitle>Basic Info</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <InfoRow label="Registration" value={liveDetailVehicle.registrationNumber} />
              <InfoRow label="Chassis" value={liveDetailVehicle.chassisNumber} />
              <InfoRow label="Seating" value={liveDetailVehicle.seater} />
              <InfoRow label="Color" value={liveDetailVehicle.color} />
              <InfoRow label="Odometer" value={liveDetailVehicle.odometer} />
            </div>

            {/* Documents */}
            <SectionTitle>Documents</SectionTitle>
            {DOC_FIELDS.map((doc) => {
              const status = getDocStatus(liveDetailVehicle[doc.to])
              return (
                <div key={doc.key} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500 w-36">{doc.label}</span>
                  <span className="text-sm text-gray-900">
                    {liveDetailVehicle[doc.from] ? `${formatDate(liveDetailVehicle[doc.from])} → ` : ''}
                    {formatDate(liveDetailVehicle[doc.to]) || '—'}
                  </span>
                  {status && <Badge className={status.cls}>{status.label}</Badge>}
                  {liveDetailVehicle[doc.url] && (
                    <a href={liveDetailVehicle[doc.url]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline ml-auto">View</a>
                  )}
                </div>
              )
            })}

            {/* Loan */}
            {(liveDetailVehicle.isOnLoan === 'true' || liveDetailVehicle.isOnLoan === true) && (
              <>
                <SectionTitle>Loan</SectionTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <InfoRow label="Monthly EMI" value={liveDetailVehicle.monthlyLoanEmi ? `₹${liveDetailVehicle.monthlyLoanEmi}` : '—'} />
                  <InfoRow label="EMI Date" value={liveDetailVehicle.emiDate} />
                  <InfoRow label="Loan Free On" value={formatDate(liveDetailVehicle.loanFreeOnDate)} />
                </div>
              </>
            )}

            {/* ── Edit Vehicle button — above Service History ────────────────── */}
            {isAdmin && (
              <div className="flex justify-end mt-4 mb-1">
                <Button variant="secondary" size="sm" onClick={() => { setDetailVehicle(null); openEdit(liveDetailVehicle) }}>
                  Edit Vehicle
                </Button>
              </div>
            )}

            {/* ── Service History ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mt-3 mb-3">
              <SectionTitle>Service History</SectionTitle>
            </div>

            {/* Log new service — admin only */}
            {isAdmin && (
              <ServiceEntryForm
                vehicleId={liveDetailVehicle.id}
                user={user}
                onSaved={async () => { await refetchHistory() }}
              />
            )}

            <ServiceHistoryList
              records={vehicleServiceHistory}
              onDelete={handleDeleteServiceEntry}
              onUpdate={handleUpdateServiceEntry}
              isAdmin={isAdmin}
              user={user}
            />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Vehicle"
        message={`Are you sure you want to delete ${deleteTarget?.registrationNumber}? This action can be undone by support.`}
      />
    </div>
  )
}