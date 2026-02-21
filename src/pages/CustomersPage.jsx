import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getCustomers, createCustomer, updateCustomer, softDeleteCustomer } from '../services/customerService.js'
import {
  Button, Input, Modal, Table, Card, CardHeader,
  PageHeader, SearchInput, ConfirmDialog, Alert, InfoRow
} from '../components/ui/index.jsx'

const emptyForm = () => ({
  name: '', phone: '', alternatePhone1: '', alternatePhone2: '',
  email: '', alternateEmail: '', address: '',
})

export default function CustomersPage() {
  const { user, isAdmin } = useAuth()
  const { data: customers = [], loading, refetch } = useAsync(getCustomers)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [editCustomer, setEditCustomer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      if (editCustomer) { await updateCustomer(editCustomer.id, f, user.username) }
      else { await createCustomer(f, user.username) }
      await refetch()
      setModalOpen(false)
      setSuccessMsg(editCustomer ? 'Customer updated.' : 'Customer added.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editCustomer, user.username, refetch])
  )

  const [doDelete] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteCustomer(deleteTarget.id, user.username)
      await refetch()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetch])
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return customers.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    )
  }, [customers, search])

  const openAdd = () => { setEditCustomer(null); setForm(emptyForm()); setErrors({}); setFormError(''); setModalOpen(true) }
  const openEdit = (c) => { setEditCustomer(c); setForm({ ...emptyForm(), ...c }); setErrors({}); setFormError(''); setModalOpen(true) }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
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
    { key: 'address', label: 'City', render: (c) => c.address?.split(',').pop()?.trim() || '—' },
    {
      key: 'actions', label: '',
      render: (c) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(c)} className="text-red-500">Delete</Button>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
        actions={<Button onClick={openAdd}>+ Add Customer</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      <Card className="mt-4">
        <CardHeader><SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone..." className="max-w-sm" /></CardHeader>
        <Table columns={columns} data={filtered} loading={loading} onRowClick={setDetail} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCustomer ? 'Edit Customer' : 'Add Customer'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" required {...field('name')} />
            <Input label="Phone" required type="tel" {...field('phone')} />
            <Input label="Alternate Phone 1" type="tel" {...field('alternatePhone1')} />
            <Input label="Alternate Phone 2" type="tel" {...field('alternatePhone2')} />
            <Input label="Email" type="email" {...field('email')} />
            <Input label="Alternate Email" type="email" {...field('alternateEmail')} />
          </div>
          <Input label="Address" {...field('address')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editCustomer ? 'Update' : 'Add Customer'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Customer'} size="sm">
        {detail && (
          <div>
            <InfoRow label="Phone" value={detail.phone} />
            <InfoRow label="Alternate Phone" value={detail.alternatePhone1} />
            <InfoRow label="Email" value={detail.email} />
            <InfoRow label="Address" value={detail.address} />
            <div className="flex justify-end mt-5"><Button variant="secondary" onClick={() => { setDetail(null); openEdit(detail) }}>Edit</Button></div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Customer"
        message={`Delete customer "${deleteTarget?.name}"?`}
      />
    </div>
  )
}
