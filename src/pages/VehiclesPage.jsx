import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getVehicles, createVehicle, updateVehicle, softDeleteVehicle } from '../services/vehicleService.js'
import {
  Button, Input, Select, Checkbox, Modal, Table, Card, CardHeader, CardBody,
  PageHeader, SearchInput, Badge, ConfirmDialog, Alert, SectionTitle, Tabs, InfoRow
} from '../components/ui/index.jsx'
import { formatDate, daysUntil } from '../utils/index.js'

const DOC_FIELDS = [
  { key: 'stateTax', label: 'State Tax', from: 'stateTaxFromDate', to: 'stateTaxToDate', url: 'stateTaxFileUrl' },
  { key: 'authorization', label: 'Authorization', from: 'authorizationFromDate', to: 'authorizationToDate', url: 'authorizationFileUrl' },
  { key: 'aitp', label: 'AITP Permit', from: 'aitpFromDate', to: 'aitpToDate', url: 'aitpFileUrl' },
  { key: 'insurance', label: 'Insurance', from: 'insuranceFromDate', to: 'insuranceToDate', url: 'insuranceFileUrl' },
  { key: 'pollution', label: 'Pollution Cert', from: 'pollutionFromDate', to: 'pollutionToDate', url: 'pollutionFileUrl' },
  { key: 'fitness', label: 'Fitness Cert', from: 'fitnessFromDate', to: 'fitnessToDate', url: 'fitnessFileUrl' },
]

const emptyForm = () => ({
  registrationNumber: '', chassisNumber: '', seater: '', color: '', odometer: '',
  stateTaxFromDate: '', stateTaxToDate: '', stateTaxFileUrl: '',
  authorizationFromDate: '', authorizationToDate: '', authorizationFileUrl: '',
  aitpFromDate: '', aitpToDate: '', aitpFileUrl: '',
  insuranceFromDate: '', insuranceToDate: '', insuranceFileUrl: '',
  pollutionFromDate: '', pollutionToDate: '', pollutionFileUrl: '',
  fitnessFromDate: '', fitnessToDate: '', fitnessFileUrl: '',
  isOnLoan: false, monthlyLoanEmi: '', emiDate: '', loanFreeOnDate: '',
})

export default function VehiclesPage() {
  const { user, isAdmin } = useAuth()
  const { data: vehicles = [], loading, refetch } = useAsync(getVehicles)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailVehicle, setDetailVehicle] = useState(null)
  const [editVehicle, setEditVehicle] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [errors, setErrors] = useState({})
  const [successMsg, setSuccessMsg] = useState('')
  const [formError, setFormError] = useState('')

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

  const [doDelete, { loading: deleting }] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteVehicle(deleteTarget.id, user.username)
      await refetch()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetch])
  )

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
    setForm(emptyForm())
    setErrors({})
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (v) => {
    setEditVehicle(v)
    setForm({ ...emptyForm(), ...v })
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
    try {
      await save(form)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: errors[key],
  })

  const getDocStatus = (toDate) => {
    const days = daysUntil(toDate)
    if (days === null) return null
    if (days < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' }
    if (days <= 30) return { label: `${days}d left`, cls: 'bg-yellow-100 text-yellow-700' }
    return { label: 'Valid', cls: 'bg-green-100 text-green-700' }
  }

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

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editVehicle ? 'Edit Vehicle' : 'Add Vehicle'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <SectionTitle>Basic Info</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Registration Number" required {...field('registrationNumber')} />
            <Input label="Chassis Number" {...field('chassisNumber')} />
            <Input label="Seating" placeholder='e.g. 4+1' {...field('seater')} />
            <Input label="Color" {...field('color')} />
            <Input label="Odometer" placeholder='e.g. 45000 km' {...field('odometer')} />
          </div>

          <SectionTitle>Documents</SectionTitle>
          {DOC_FIELDS.map((doc) => (
            <div key={doc.key} className="grid grid-cols-3 gap-3">
              <Input label={`${doc.label} From`} type="date" {...field(doc.from)} />
              <Input label={`${doc.label} To`} type="date" {...field(doc.to)} />
              <Input label="File URL" placeholder="https://..." {...field(doc.url)} />
            </div>
          ))}

          <SectionTitle>Loan Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Checkbox label="Vehicle on Loan" checked={!!form.isOnLoan} onChange={(e) => setForm((f) => ({ ...f, isOnLoan: e.target.checked }))} />
          </div>
          {form.isOnLoan && (
            <div className="grid grid-cols-3 gap-3">
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

      {/* Detail Modal */}
      <Modal open={!!detailVehicle} onClose={() => setDetailVehicle(null)} title={detailVehicle?.registrationNumber || 'Vehicle'} size="lg">
        {detailVehicle && (
          <div>
            <SectionTitle>Basic Info</SectionTitle>
            <InfoRow label="Registration" value={detailVehicle.registrationNumber} />
            <InfoRow label="Chassis" value={detailVehicle.chassisNumber} />
            <InfoRow label="Seating" value={detailVehicle.seater} />
            <InfoRow label="Color" value={detailVehicle.color} />
            <InfoRow label="Odometer" value={detailVehicle.odometer} />

            <SectionTitle>Documents</SectionTitle>
            {DOC_FIELDS.map((doc) => {
              const status = getDocStatus(detailVehicle[doc.to])
              return (
                <div key={doc.key} className="flex items-center gap-3 py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500 w-40">{doc.label}</span>
                  <span className="text-sm text-gray-900">{formatDate(detailVehicle[doc.to]) || '—'}</span>
                  {status && <Badge className={status.cls}>{status.label}</Badge>}
                  {detailVehicle[doc.url] && (
                    <a href={detailVehicle[doc.url]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline ml-auto">View</a>
                  )}
                </div>
              )
            })}

            {isAdmin && (
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => { setDetailVehicle(null); openEdit(detailVehicle) }}>Edit</Button>
              </div>
            )}
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
