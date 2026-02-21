import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import {
  driverAllowanceService, tollExpenseService, parkingExpenseService,
  stateTaxExpenseService, fuelExpenseService, vehicleMaintenanceService,
  driverSalaryService, businessExpenseService,
} from '../services/expenseService.js'
import { getVehicles } from '../services/vehicleService.js'
import { getDrivers } from '../services/driverService.js'
import { getEnquiries } from '../services/enquiryService.js'
import {
  Button, Input, Select, Modal, Table, Card, CardHeader, CardBody,
  PageHeader, Badge, Alert, Tabs, SectionTitle, Checkbox
} from '../components/ui/index.jsx'
import { PAYMENT_MODE_OPTIONS, BUSINESS_EXPENSE_CATEGORY_OPTIONS } from '../constants/index.js'
import { formatDate, formatCurrency } from '../utils/index.js'

const EXPENSE_TABS = [
  { key: 'fuel', label: 'Fuel' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'allowance', label: 'Driver Allowance' },
  { key: 'toll', label: 'Toll' },
  { key: 'parking', label: 'Parking' },
  { key: 'stateTax', label: 'State Tax' },
  { key: 'salary', label: 'Driver Salary' },
  { key: 'business', label: 'Business' },
]

export default function ExpensesPage() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState('fuel')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const { data: vehicles = [] } = useAsync(getVehicles)
  const { data: drivers = [] } = useAsync(getDrivers)
  const { data: enquiries = [] } = useAsync(getEnquiries)

  const { data: fuel = [], loading: fLoading, refetch: refetchFuel } = useAsync(fuelExpenseService.getAll)
  const { data: maintenance = [], loading: mLoading, refetch: refetchMaintenance } = useAsync(vehicleMaintenanceService.getAll)
  const { data: allowances = [], loading: aLoading, refetch: refetchAllowances } = useAsync(driverAllowanceService.getAll)
  const { data: tolls = [], loading: tlLoading, refetch: refetchTolls } = useAsync(tollExpenseService.getAll)
  const { data: parking = [], loading: pkLoading, refetch: refetchParking } = useAsync(parkingExpenseService.getAll)
  const { data: stateTax = [], loading: stLoading, refetch: refetchStateTax } = useAsync(stateTaxExpenseService.getAll)
  const { data: salary = [], loading: slLoading, refetch: refetchSalary } = useAsync(driverSalaryService.getAll)
  const { data: business = [], loading: bLoading, refetch: refetchBusiness } = useAsync(businessExpenseService.getAll)

  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: v.registrationNumber }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))
  const bookingOptions = enquiries.filter(e => e.bookingId).map((e) => ({ value: e.bookingId, label: `${e.bookingId} - ${e.customerName || e.customerPhone}` }))

  const config = {
    fuel: { service: fuelExpenseService, data: fuel, loading: fLoading, refetch: refetchFuel },
    maintenance: { service: vehicleMaintenanceService, data: maintenance, loading: mLoading, refetch: refetchMaintenance },
    allowance: { service: driverAllowanceService, data: allowances, loading: aLoading, refetch: refetchAllowances },
    toll: { service: tollExpenseService, data: tolls, loading: tlLoading, refetch: refetchTolls },
    parking: { service: parkingExpenseService, data: parking, loading: pkLoading, refetch: refetchParking },
    stateTax: { service: stateTaxExpenseService, data: stateTax, loading: stLoading, refetch: refetchStateTax },
    salary: { service: driverSalaryService, data: salary, loading: slLoading, refetch: refetchSalary },
    business: { service: businessExpenseService, data: business, loading: bLoading, refetch: refetchBusiness },
  }

  const current = config[tab]

  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      await current.service.create(f, user.username)
      await current.refetch()
      setModalOpen(false)
      setSuccessMsg('Expense recorded.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [current, user.username])
  )

  const handleVerify = useCallback(async (id) => {
    await current.service.verify(id, user.username)
    await current.refetch()
  }, [current, user.username])

  const handleDelete = useCallback(async (id) => {
    await current.service.softDelete(id, user.username)
    await current.refetch()
  }, [current, user.username])

  const field = (key, type = 'text') => ({
    value: form[key] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    type,
  })

  const openAdd = () => {
    setForm({ date: new Date().toISOString().split('T')[0] })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    try { await save(form) } catch (err) { setFormError(err.message) }
  }

  // ── Column definitions per tab ──────────────────────────────────────────────
  const getColumns = () => {
    const verifyCol = {
      key: 'status', label: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isVerified === 'true'
            ? <Badge className="bg-green-100 text-green-700">Verified</Badge>
            : isAdmin
              ? <Button size="sm" variant="ghost" className="text-green-600" onClick={(e) => { e.stopPropagation(); handleVerify(row.id) }}>Verify</Button>
              : <Badge className="bg-gray-100 text-gray-600">Unverified</Badge>
          }
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(row.id) }}>Del</Button>
          )}
        </div>
      ),
    }

    const common = { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount || r.totalAmount) }

    switch (tab) {
      case 'fuel':
        return [
          { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicles.find(v => v.id === r.vehicleId)?.registrationNumber || r.vehicleId },
          { key: 'driverId', label: 'Driver', render: (r) => drivers.find(d => d.id === r.driverId)?.name || r.driverId },
          common, { key: 'notes', label: 'Notes' }, verifyCol,
        ]
      case 'maintenance':
        return [
          { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicles.find(v => v.id === r.vehicleId)?.registrationNumber || r.vehicleId },
          { key: 'description', label: 'Description' },
          common, verifyCol,
        ]
      case 'allowance':
        return [
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'amountPerDay', label: '₹/Day' },
          { key: 'numberOfDays', label: 'Days' },
          { key: 'totalAmount', label: 'Total', render: (r) => formatCurrency(r.totalAmount) },
          verifyCol,
        ]
      case 'stateTax':
        return [
          { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'stateName', label: 'State' },
          common,
          { key: 'isAitpEvaluation', label: 'AITP Eval', render: (r) => r.isAitpEvaluation === 'true' ? <Badge className="bg-purple-100 text-purple-700">Eval Only</Badge> : '—' },
          verifyCol,
        ]
      case 'salary':
        return [
          { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          { key: 'driverId', label: 'Driver', render: (r) => drivers.find(d => d.id === r.driverId)?.name || r.driverId },
          common, { key: 'mode', label: 'Mode' }, { key: 'notes', label: 'Notes' },
          { key: 'del', label: '', render: (r) => isAdmin && <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}>Del</Button> },
        ]
      case 'business':
        return [
          { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          common,
          { key: 'del', label: '', render: (r) => isAdmin && <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }}>Del</Button> },
        ]
      default: // toll, parking
        return [
          { key: 'bookingId', label: 'Booking ID' },
          { key: 'totalAmount', label: 'Amount', render: (r) => formatCurrency(r.totalAmount) },
          { key: 'notes', label: 'Notes' }, verifyCol,
        ]
    }
  }

  const renderForm = () => {
    switch (tab) {
      case 'fuel':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" required {...field('date', 'date')} />
              <Select label="Vehicle" required options={vehicleOptions} value={form.vehicleId || ''} onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))} />
              <Select label="Driver" required options={driverOptions} value={form.driverId || ''} onChange={(e) => setForm(f => ({ ...f, driverId: e.target.value }))} />
              <Input label="Amount (₹)" required {...field('amount', 'number')} />
              <Select label="Booking (optional)" options={bookingOptions} value={form.bookingId || ''} onChange={(e) => setForm(f => ({ ...f, bookingId: e.target.value }))} />
              <Input label="Notes" {...field('notes')} />
            </div>
          </>
        )
      case 'maintenance':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" required {...field('date', 'date')} />
            <Select label="Vehicle" required options={vehicleOptions} value={form.vehicleId || ''} onChange={(e) => setForm(f => ({ ...f, vehicleId: e.target.value }))} />
            <Input label="Amount (₹)" required {...field('amount', 'number')} />
            <Input label="Description" required {...field('description')} />
            <Input label="Notes" {...field('notes')} />
          </div>
        )
      case 'allowance':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Booking" required options={bookingOptions} value={form.bookingId || ''} onChange={(e) => setForm(f => ({ ...f, bookingId: e.target.value }))} />
            <Input label="Amount Per Day (₹)" required {...field('amountPerDay', 'number')} />
            <Input label="Number of Days" required {...field('numberOfDays', 'number')} />
            <Input label="Total Amount (₹)" {...field('totalAmount', 'number')} />
            <Input label="Notes" {...field('notes')} />
          </div>
        )
      case 'toll':
      case 'parking':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Booking" required options={bookingOptions} value={form.bookingId || ''} onChange={(e) => setForm(f => ({ ...f, bookingId: e.target.value }))} />
            <Input label="Total Amount (₹)" required {...field('totalAmount', 'number')} />
            <Input label="Notes" {...field('notes')} />
          </div>
        )
      case 'stateTax':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Booking" required options={bookingOptions} value={form.bookingId || ''} onChange={(e) => setForm(f => ({ ...f, bookingId: e.target.value }))} />
            <Input label="State Name" required {...field('stateName')} />
            <Input label="Date" required {...field('date', 'date')} />
            <Input label="Amount (₹)" required {...field('amount', 'number')} />
            <Checkbox label="AITP Evaluation Only (not actually paid)" checked={!!form.isAitpEvaluation}
              onChange={(e) => setForm(f => ({ ...f, isAitpEvaluation: e.target.checked }))} className="col-span-2" />
            <Input label="Notes" {...field('notes')} />
          </div>
        )
      case 'salary':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Select label="Driver" required options={driverOptions} value={form.driverId || ''} onChange={(e) => setForm(f => ({ ...f, driverId: e.target.value }))} />
            <Input label="Date" required {...field('date', 'date')} />
            <Input label="Amount (₹)" required {...field('amount', 'number')} />
            <Select label="Mode" required options={PAYMENT_MODE_OPTIONS} value={form.mode || ''} onChange={(e) => setForm(f => ({ ...f, mode: e.target.value }))} />
            <Input label="Notes" {...field('notes')} />
          </div>
        )
      case 'business':
        return (
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" required {...field('date', 'date')} />
            <Select label="Category" required options={BUSINESS_EXPENSE_CATEGORY_OPTIONS} value={form.category || ''} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} />
            <Input label="Amount (₹)" required {...field('amount', 'number')} />
            <Input label="Description" required {...field('description')} />
          </div>
        )
      default: return null
    }
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        actions={<Button onClick={openAdd}>+ Record Expense</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      <Card className="mt-4">
        <CardHeader>
          <Tabs tabs={EXPENSE_TABS} active={tab} onChange={setTab} />
        </CardHeader>
        <Table
          columns={getColumns()}
          data={current.data}
          loading={current.loading}
          emptyText={`No ${tab} expenses recorded.`}
        />
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Expense" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <SectionTitle>{EXPENSE_TABS.find(t => t.key === tab)?.label} Expense</SectionTitle>
          {renderForm()}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
