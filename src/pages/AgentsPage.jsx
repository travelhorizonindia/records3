import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getAgents, createAgent, updateAgent, softDeleteAgent } from '../services/agentService.js'
import {
  Button, Input, Modal, Table, Card, CardHeader,
  PageHeader, SearchInput, ConfirmDialog, Alert, SectionTitle, InfoRow
} from '../components/ui/index.jsx'

const emptyForm = () => ({
  name: '', contactPersonName: '', phone: '', alternatePhone1: '', alternatePhone2: '',
  email: '', alternateEmail: '', address: '',
})

export default function AgentsPage() {
  const { user, isAdmin } = useAuth()
  const { data: agents = [], loading, refetch } = useAsync(getAgents)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [editAgent, setEditAgent] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      if (editAgent) { await updateAgent(editAgent.id, f, user.username) }
      else { await createAgent(f, user.username) }
      await refetch()
      setModalOpen(false)
      setSuccessMsg(editAgent ? 'Agent updated.' : 'Agent added.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editAgent, user.username, refetch])
  )

  const [doDelete] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteAgent(deleteTarget.id, user.username)
      await refetch()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetch])
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return agents.filter((a) => a.name?.toLowerCase().includes(q) || a.phone?.toLowerCase().includes(q))
  }, [agents, search])

  const openAdd = () => { setEditAgent(null); setForm(emptyForm()); setErrors({}); setFormError(''); setModalOpen(true) }
  const openEdit = (a) => { setEditAgent(a); setForm({ ...emptyForm(), ...a }); setErrors({}); setFormError(''); setModalOpen(true) }

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
    { key: 'name', label: 'Agent Name' },
    { key: 'contactPersonName', label: 'Contact Person' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    {
      key: 'actions', label: '',
      render: (a) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          {isAdmin && (
            <>
              <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(a)} className="text-red-500">Delete</Button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Agents"
        subtitle={`${agents.length} agent${agents.length !== 1 ? 's' : ''}`}
        actions={isAdmin && <Button onClick={openAdd}>+ Add Agent</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
      <Card className="mt-4">
        <CardHeader><SearchInput value={search} onChange={setSearch} placeholder="Search agents..." className="max-w-sm" /></CardHeader>
        <Table columns={columns} data={filtered} loading={loading} onRowClick={setDetail} />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editAgent ? 'Edit Agent' : 'Add Agent'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Agent Name" required {...field('name')} />
            <Input label="Contact Person" {...field('contactPersonName')} />
            <Input label="Phone" type="tel" {...field('phone')} />
            <Input label="Alternate Phone 1" type="tel" {...field('alternatePhone1')} />
            <Input label="Alternate Phone 2" type="tel" {...field('alternatePhone2')} />
            <Input label="Email" type="email" {...field('email')} />
            <Input label="Alternate Email" type="email" {...field('alternateEmail')} />
          </div>
          <Input label="Address" {...field('address')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editAgent ? 'Update' : 'Add Agent'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name || 'Agent'} size="sm">
        {detail && (
          <div>
            <InfoRow label="Contact Person" value={detail.contactPersonName} />
            <InfoRow label="Phone" value={detail.phone} />
            <InfoRow label="Email" value={detail.email} />
            <InfoRow label="Address" value={detail.address} />
            {isAdmin && <div className="flex justify-end mt-5"><Button variant="secondary" onClick={() => { setDetail(null); openEdit(detail) }}>Edit</Button></div>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Agent"
        message={`Delete agent "${deleteTarget?.name}"?`}
      />
    </div>
  )
}
