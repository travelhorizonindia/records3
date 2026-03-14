import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getDrivers, createDriver, updateDriver, softDeleteDriver } from '../services/driverService.js'
import {
  Button, Input, Modal, Table, Card, CardHeader, CardBody,
  PageHeader, SearchInput, ConfirmDialog, Alert, SectionTitle, InfoRow
} from '../components/ui/index.jsx'
import { formatDate } from '../utils/index.js'

const emptyForm = () => ({
  name: '', phone: '', alternatePhone1: '', alternatePhone2: '',
  email: '', address: '',
  drivingLicenseFileUrl: '', aadharFileUrl: '', photoFileUrl: '',
  otherDoc1Name: '', otherDoc1FileUrl: '', otherDoc2Name: '', otherDoc2FileUrl: '',
  monthlyFixedSalary: '', joiningDate: '', notes: '',
})

export default function DriversPage() {
  const { user, isAdmin, isViewer } = useAuth()
  const { data: drivers = [], loading, refetch } = useAsync(getDrivers)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailDriver, setDetailDriver] = useState(null)
  const [editDriver, setEditDriver] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      if (editDriver) {
        await updateDriver(editDriver.id, f, user.username)
      } else {
        await createDriver(f, user.username)
      }
      await refetch()
      setModalOpen(false)
      setSuccessMsg(editDriver ? 'Driver updated.' : 'Driver added.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editDriver, user.username, refetch])
  )

  const [doDelete] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteDriver(deleteTarget.id, user.username)
      await refetch()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetch])
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return drivers.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.phone?.toLowerCase().includes(q) ||
        d.email?.toLowerCase().includes(q)
    )
  }, [drivers, search])

  const openAdd = () => { setEditDriver(null); setForm(emptyForm()); setErrors({}); setFormError(''); setModalOpen(true) }
  const openEdit = (d) => { setEditDriver(d); setForm({ ...emptyForm(), ...d }); setErrors({}); setFormError(''); setModalOpen(true) }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    try { await save(form) } catch (err) { setFormError(err.message) }
  }

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: (ev) => setForm((f) => ({ ...f, [key]: ev.target.value })),
    error: errors[key],
  })

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'joiningDate', label: 'Joined', render: (d) => formatDate(d.joiningDate) },
    { key: 'monthlyFixedSalary', label: 'Base Salary', render: (d) => d.monthlyFixedSalary ? `₹${Number(d.monthlyFixedSalary).toLocaleString('en-IN')}` : '—' },
    {
      key: 'actions', label: '',
      render: (d) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isAdmin && !isViewer && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(d)} className="text-red-500">Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle={`${drivers.length} driver${drivers.length !== 1 ? 's' : ''}`}
        actions={isAdmin && !isViewer && <Button onClick={openAdd}>+ Add Driver</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      <Card className="mt-4">
        <CardHeader><SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone..." className="max-w-sm" /></CardHeader>
        <Table columns={columns} data={filtered} loading={loading} onRowClick={setDetailDriver} />
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editDriver ? 'Edit Driver' : 'Add Driver'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <SectionTitle>Personal Info</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name" required {...field('name')} />
            <Input label="Phone" type="tel" {...field('phone')} />
            <Input label="Alternate Phone 1" type="tel" {...field('alternatePhone1')} />
            <Input label="Alternate Phone 2" type="tel" {...field('alternatePhone2')} />
            <Input label="Email" type="email" {...field('email')} />
            <Input label="Joining Date" type="date" {...field('joiningDate')} />
          </div>
          <Input label="Address" {...field('address')} />

          <SectionTitle>Employment</SectionTitle>
          <Input label="Monthly Fixed Salary (₹)" type="number" {...field('monthlyFixedSalary')} />

          <SectionTitle>Documents (URLs)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Driving License URL" {...field('drivingLicenseFileUrl')} />
            <Input label="Aadhar URL" {...field('aadharFileUrl')} />
            <Input label="Photo URL" {...field('photoFileUrl')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Other Doc 1 Name" {...field('otherDoc1Name')} />
            <Input label="Other Doc 1 URL" {...field('otherDoc1FileUrl')} />
            <Input label="Other Doc 2 Name" {...field('otherDoc2Name')} />
            <Input label="Other Doc 2 URL" {...field('otherDoc2FileUrl')} />
          </div>

          <SectionTitle>Notes</SectionTitle>
          <textarea rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.notes ?? ''} onChange={(ev) => setForm((f) => ({ ...f, notes: ev.target.value }))}
            placeholder="Internal notes about this driver..." />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editDriver ? 'Update' : 'Add Driver'}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal open={!!detailDriver} onClose={() => setDetailDriver(null)} title={detailDriver?.name || 'Driver'} size="md">
        {detailDriver && (
          <div>
            <InfoRow label="Phone" value={detailDriver.phone} />
            <InfoRow label="Alternate Phone" value={detailDriver.alternatePhone1} />
            <InfoRow label="Email" value={detailDriver.email} />
            <InfoRow label="Address" value={detailDriver.address} />
            <InfoRow label="Joining Date" value={formatDate(detailDriver.joiningDate)} />
            <InfoRow label="Base Salary" value={detailDriver.monthlyFixedSalary ? `₹${Number(detailDriver.monthlyFixedSalary).toLocaleString('en-IN')}` : ''} />
            <SectionTitle>Documents</SectionTitle>
            {detailDriver.drivingLicenseFileUrl && <div className="py-1"><a href={detailDriver.drivingLicenseFileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Driving License</a></div>}
            {detailDriver.aadharFileUrl && <div className="py-1"><a href={detailDriver.aadharFileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">Aadhar Card</a></div>}
            {detailDriver.notes && (
              <>
                <SectionTitle>Notes</SectionTitle>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{detailDriver.notes}</div>
              </>
            )}
            {isAdmin && !isViewer && <div className="flex justify-end mt-5"><Button variant="secondary" onClick={() => { setDetailDriver(null); openEdit(detailDriver) }}>Edit</Button></div>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Driver"
        message={`Are you sure you want to delete ${deleteTarget?.name}?`}
      />
    </div>
  )
}