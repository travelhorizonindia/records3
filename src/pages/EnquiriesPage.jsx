import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getEnquiries, createEnquiry, updateEnquiry, confirmBooking, softDeleteEnquiry } from '../services/enquiryService.js'
import { getTrips, createTrip, updateTrip, softDeleteTrip } from '../services/tripService.js'
import { getAgents } from '../services/agentService.js'
import { getCustomers, createCustomer, updateCustomer } from '../services/customerService.js'
import { getVehicles } from '../services/vehicleService.js'
import { getDrivers } from '../services/driverService.js'
import { getPayments, createPayment, verifyPayment } from '../services/paymentService.js'
import {
  Button, Input, Select, Textarea, Modal, Table, Card, CardHeader, CardBody,
  PageHeader, SearchInput, Badge, ConfirmDialog, Alert, SectionTitle, Tabs, InfoRow, Checkbox
} from '../components/ui/index.jsx'
import {
  BOOKING_STATUS_OPTIONS, BOOKING_STATUS_COLORS, TRIP_TYPE_OPTIONS, LOCAL_SUB_TYPE_OPTIONS,
  VEHICLE_TYPE_OPTIONS, PAYMENT_MODE_OPTIONS
} from '../constants/index.js'
import { formatDate, formatDateTime, formatCurrency, generateId } from '../utils/index.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Enquiry', label: 'Enquiry' },
  { key: 'Upcoming', label: 'Upcoming' },
  { key: 'Ongoing', label: 'Ongoing' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
]

// Agent types where customer phone/name is required
const DIRECT_AGENT_TYPES = ['self', 'google_ads']

// ─── Empty form factories ─────────────────────────────────────────────────────

const emptyEnquiryForm = () => ({
  // Customer
  customerPhone: '',
  customerName: '',
  customerId: '',
  // Agent
  agentId: '',
  // Guest (person actually travelling)
  guestName: '',
  guestPhone: '',
  // Alternate contact
  alternateContactName: '',
  alternateContactPhone: '',
  // Trip basics (optional at enquiry stage)
  pickupDateTime: '',
  pickupLocation: '',
  dropLocation: '',
  trainFlightNumber: '',
  customerRequests: '',
  notes: '',
  enquiryQuote: '',
})

const emptyTripForm = () => ({
  tripType: '',
  localSubType: '',
  vehicleType: '',
  startDate: '',
  endDate: '',
  travelPlan: '',
  isVendorTrip: false,
  vendorName: '',
  vendorPhone: '',
  vendorCommission: '',
  pickupDateTime: '',
  pickupLocation: '',
  dropLocation: '',
  allocatedVehicleId: '',
  allocatedVehicleNumber: '',
  allocatedVehicleType: '',
  allocatedVehicleSeating: '',
  allocatedDriverId: '',
  allocatedDriverName: '',
  allocatedDriverPhone: '',
  totalAmount: '',
  amountReceived: '',
  amountPending: '',
  notes: '',
  customerRequests: '',
  trainFlightNumber: '',
})

const emptyBookingForm = () => ({
  customerName: '',
  customerId: '',
  pickupDateTime: '',
  pickupLocation: '',
  dropLocation: '',
  trainFlightNumber: '',
  customerRequests: '',
  notes: '',
  enquiryQuote: '',
  bookingQuote: '',
  totalAmount: '',
  amountReceived: '',
  amountPending: '',
  agentId: '',
  guestName: '',
  guestPhone: '',
  alternateContactName: '',
  alternateContactPhone: '',
})

const emptyPaymentForm = () => ({
  amount: '', mode: '', receivedBy: '', paymentDate: '', notes: '', tripId: '', bookingId: '',
})

// ─── Customer match banner ────────────────────────────────────────────────────

function CustomerMatchDropdown({ phone, customers, onSelect }) {
  const matches = useMemo(() => {
    if (!phone || phone.length < 5) return []
    const q = phone.trim()
    return customers.filter(
      (c) => c.phone?.includes(q) || c.alternatePhone1?.includes(q) || c.alternatePhone2?.includes(q)
    ).slice(0, 5)
  }, [phone, customers])

  if (matches.length === 0) return null

  return (
    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-blue-200 rounded-lg shadow-lg overflow-hidden">
      <p className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 font-medium">Existing customers matched</p>
      {matches.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c)}
          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
        >
          <p className="text-sm font-medium text-gray-900">{c.name}</p>
          <p className="text-xs text-gray-400">{c.phone}{c.customerStatus === 'repeating' ? ' · Repeating Customer ⭐' : ''}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Inline trip editor (used inside enquiry form) ────────────────────────────

function InlineTripEditor({ trips, onAdd, onRemove, vehicles, drivers }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyTripForm())

  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} - ${v.seater}` }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))

  const handleVehicleSelect = (vehicleId) => {
    const v = vehicles.find((v) => v.id === vehicleId)
    if (v) {
      setForm((f) => ({
        ...f,
        allocatedVehicleId: v.id,
        allocatedVehicleNumber: v.registrationNumber,
        allocatedVehicleType: v.seater,
        allocatedVehicleSeating: v.seater,
      }))
    } else {
      setForm((f) => ({ ...f, allocatedVehicleId: '', allocatedVehicleNumber: '', allocatedVehicleType: '', allocatedVehicleSeating: '' }))
    }
  }

  const handleDriverSelect = (driverId) => {
    const d = drivers.find((d) => d.id === driverId)
    if (d) {
      setForm((f) => ({ ...f, allocatedDriverId: d.id, allocatedDriverName: d.name, allocatedDriverPhone: d.phone }))
    } else {
      setForm((f) => ({ ...f, allocatedDriverId: '', allocatedDriverName: '', allocatedDriverPhone: '' }))
    }
  }

  const handleAdd = () => {
    if (!form.tripType || !form.vehicleType) return
    onAdd({ ...form, _tempId: generateId() })
    setForm(emptyTripForm())
    setOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Trips ({trips.length})</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : '+ Add Trip'}
        </Button>
      </div>

      {/* Existing trips */}
      {trips.length > 0 && (
        <div className="space-y-2 mb-3">
          {trips.map((trip, i) => (
            <div key={trip._tempId || i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-gray-900">{trip.vehicleType}</span>
                <span className="text-gray-400 mx-2">·</span>
                <span className="text-gray-600">{trip.tripType}</span>
                {trip.startDate && <span className="text-gray-400 ml-2">{trip.startDate}</span>}
                {trip.allocatedDriverName && <span className="text-gray-400 ml-2">· {trip.allocatedDriverName}</span>}
              </div>
              <button type="button" onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Trip add form */}
      {open && (
        <div className="border border-blue-100 rounded-xl bg-blue-50/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Trip Type *"
              options={TRIP_TYPE_OPTIONS}
              value={form.tripType}
              onChange={(e) => setForm(f => ({ ...f, tripType: e.target.value }))}
              placeholder="Select..."
            />
            {form.tripType === 'Delhi/NCR Local' && (
              <Select
                label="Local Sub-type"
                options={LOCAL_SUB_TYPE_OPTIONS}
                value={form.localSubType}
                onChange={(e) => setForm(f => ({ ...f, localSubType: e.target.value }))}
                placeholder="Select..."
              />
            )}
            <Select
              label="Vehicle Type *"
              options={VEHICLE_TYPE_OPTIONS}
              value={form.vehicleType}
              onChange={(e) => setForm(f => ({ ...f, vehicleType: e.target.value }))}
              placeholder="Select..."
            />
            <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} />
            <Input label="Pickup Date & Time" type="datetime-local" value={form.pickupDateTime} onChange={(e) => setForm(f => ({ ...f, pickupDateTime: e.target.value }))} />
            <Input label="Pickup Location" value={form.pickupLocation} onChange={(e) => setForm(f => ({ ...f, pickupLocation: e.target.value }))} />
            <Input label="Drop Location" value={form.dropLocation} onChange={(e) => setForm(f => ({ ...f, dropLocation: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select label="Allocate Vehicle (Fleet)" options={vehicleOptions} value={form.allocatedVehicleId} onChange={(e) => handleVehicleSelect(e.target.value)} placeholder="From fleet..." />
            <Input label="Or Manual Vehicle No." value={form.allocatedVehicleNumber} onChange={(e) => setForm(f => ({ ...f, allocatedVehicleNumber: e.target.value }))} />
            <Select label="Allocate Driver" options={driverOptions} value={form.allocatedDriverId} onChange={(e) => handleDriverSelect(e.target.value)} placeholder="From drivers..." />
            <Input label="Or Manual Driver Name" value={form.allocatedDriverName} onChange={(e) => setForm(f => ({ ...f, allocatedDriverName: e.target.value }))} />
          </div>

          <Checkbox
            label="Vendor Trip"
            checked={form.isVendorTrip === true}
            onChange={(e) => setForm(f => ({ ...f, isVendorTrip: e.target.checked }))}
          />
          {form.isVendorTrip && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Vendor Name" value={form.vendorName} onChange={(e) => setForm(f => ({ ...f, vendorName: e.target.value }))} />
              <Input label="Vendor Phone" value={form.vendorPhone} onChange={(e) => setForm(f => ({ ...f, vendorPhone: e.target.value }))} />
              <Input label="Our Commission" value={form.vendorCommission} onChange={(e) => setForm(f => ({ ...f, vendorCommission: e.target.value }))} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={!form.tripType || !form.vehicleType}
            >
              Add Trip
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EnquiriesPage() {
  const { user, isAdmin } = useAuth()

  const { data: enquiries = [], loading: eLoading, refetch: refetchEnquiries } = useAsync(getEnquiries)
  const { data: trips = [], loading: tLoading, refetch: refetchTrips } = useAsync(getTrips)
  const { data: agents = [] } = useAsync(getAgents)
  const { data: customers = [], refetch: refetchCustomers } = useAsync(getCustomers)
  const { data: vehicles = [] } = useAsync(getVehicles)
  const { data: drivers = [] } = useAsync(getDrivers)
  const { data: allPayments = [], refetch: refetchPayments } = useAsync(getPayments)

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')

  // Modal states
  const [enquiryModal, setEnquiryModal] = useState(false)
  const [editEnquiry, setEditEnquiry] = useState(null)
  const [detailEnquiry, setDetailEnquiry] = useState(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [tripModal, setTripModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [statusModal, setStatusModal] = useState(null)

  // Form states
  const [eForm, setEForm] = useState(emptyEnquiryForm())
  const [inlineTrips, setInlineTrips] = useState([]) // trips added in enquiry form before save
  const [bForm, setBForm] = useState(emptyBookingForm())
  const [tripForm, setTripForm] = useState(emptyTripForm())
  const [payForm, setPayForm] = useState(emptyPaymentForm())
  const [eErrors, setEErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // ─── Derived data ────────────────────────────────────────────────────────────

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }))
  const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` }))
  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} - ${v.seater}` }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))

  // Determine selected agent type
  const selectedAgent = agents.find((a) => a.id === eForm.agentId)
  const isDirectAgent = selectedAgent ? DIRECT_AGENT_TYPES.includes(selectedAgent.agentType) : false
  const isAgentBooking = selectedAgent?.agentType === 'other_business'

  // Same for booking form
  const selectedAgentForBooking = agents.find((a) => a.id === (bForm.agentId || detailEnquiry?.agentId))
  const isDirectAgentBooking = selectedAgentForBooking ? DIRECT_AGENT_TYPES.includes(selectedAgentForBooking.agentType) : false

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enquiries
      .filter((e) => tab === 'all' || e.status === tab)
      .filter(
        (e) =>
          e.enquiryId?.toLowerCase().includes(q) ||
          e.customerName?.toLowerCase().includes(q) ||
          e.customerPhone?.toLowerCase().includes(q) ||
          e.bookingId?.toLowerCase().includes(q) ||
          e.guestName?.toLowerCase().includes(q)
      )
  }, [enquiries, tab, search])

  const tabsWithCounts = STATUS_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? enquiries.length : enquiries.filter((e) => e.status === t.key).length,
  }))

  // ─── Phone auto-detect: when phone changes, check existing customers ─────────

  const handlePhoneChange = (phone) => {
    setEForm(f => ({ ...f, customerPhone: phone, customerId: '', customerName: f.customerName }))
  }

  const handleCustomerSelect = (customer) => {
    setEForm(f => ({
      ...f,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
    }))
  }

  // ─── Save Enquiry (with optional inline trips) ────────────────────────────────

  const [saveEnquiry, { loading: savingEnquiry }] = useAsyncCallback(
    useCallback(async (f, tripsToCreate) => {
      let enquiryRecord
      if (editEnquiry) {
        await updateEnquiry(editEnquiry.enquiryId, f, user.username)
        enquiryRecord = { enquiryId: editEnquiry.enquiryId }
      } else {
        enquiryRecord = await createEnquiry(f, user.username)
      }

      // Handle customer creation/update for direct agents
      if (!f.customerId && f.customerPhone && (isDirectAgent || !isAgentBooking)) {
        const existing = customers.find((c) => c.phone === f.customerPhone)
        if (!existing) {
          await createCustomer({ name: f.customerName || '', phone: f.customerPhone }, user.username)
          await refetchCustomers()
        }
      }

      // Save any inline trips
      if (tripsToCreate && tripsToCreate.length > 0 && !editEnquiry) {
        const enquiryId = enquiryRecord?.data?.enquiryId || enquiryRecord?.enquiryId
        if (enquiryId) {
          for (const trip of tripsToCreate) {
            const { _tempId, ...tripData } = trip
            await createTrip({ ...tripData, enquiryId, bookingId: '' }, user.username)
          }
          await refetchTrips()
        }
      }

      await refetchEnquiries()
      setEnquiryModal(false)
      setInlineTrips([])
      setSuccessMsg(editEnquiry ? 'Enquiry updated.' : 'Enquiry created.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editEnquiry, user.username, refetchEnquiries, refetchTrips, refetchCustomers, customers, isDirectAgent, isAgentBooking])
  )

  // ─── Confirm Booking ─────────────────────────────────────────────────────────

  const [doConfirm, { loading: confirming }] = useAsyncCallback(
    useCallback(async (f) => {
      let customerId = f.customerId

      // For direct agent bookings, always ensure customer exists
      if (isDirectAgentBooking && !customerId && f.customerName && f.customerPhone) {
        const existing = customers.find((c) => c.phone === f.customerPhone)
        if (existing) {
          customerId = existing.id
          // If returning, mark as repeating
          if (existing.customerStatus !== 'repeating') {
            const prevBookings = enquiries.filter(e => e.customerId === existing.id && e.bookingId)
            if (prevBookings.length > 0) {
              await updateCustomer(existing.id, { customerStatus: 'repeating' }, user.username)
            }
          }
        } else {
          const res = await createCustomer(
            { name: f.customerName, phone: f.customerPhone, customerStatus: 'active' },
            user.username
          )
          customerId = res?.data?.id
          await refetchCustomers()
        }
      }

      await confirmBooking(detailEnquiry.enquiryId, { ...f, customerId }, user.username)
      await refetchEnquiries()
      setConfirmModal(false)
      setDetailEnquiry(null)
      setSuccessMsg('Booking confirmed!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [detailEnquiry, customers, enquiries, user.username, refetchEnquiries, refetchCustomers, isDirectAgentBooking])
  )

  // ─── Save Trip ────────────────────────────────────────────────────────────────

  const [saveTrip, { loading: savingTrip }] = useAsyncCallback(
    useCallback(async (f, enquiryId, bookingId, editTrip) => {
      if (editTrip) {
        await updateTrip(editTrip.id, f, user.username)
      } else {
        await createTrip({ ...f, enquiryId, bookingId }, user.username)
      }
      await refetchTrips()
      setTripModal(null)
      setSuccessMsg('Trip saved.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [user.username, refetchTrips])
  )

  // ─── Save Payment ─────────────────────────────────────────────────────────────

  const [savePayment, { loading: savingPayment }] = useAsyncCallback(
    useCallback(async (f) => {
      await createPayment({ ...f, bookingId: paymentModal.bookingId, tripId: paymentModal.tripId }, user.username)
      await refetchPayments()
      setPaymentModal(null)
      setSuccessMsg('Payment recorded.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [paymentModal, user.username, refetchPayments])
  )

  // ─── Status update ────────────────────────────────────────────────────────────

  const [doStatusUpdate, { loading: updatingStatus }] = useAsyncCallback(
    useCallback(async (newStatus) => {
      await updateEnquiry(statusModal.enquiryId, { status: newStatus }, user.username)
      await refetchEnquiries()
      setStatusModal(null)
      setSuccessMsg('Status updated.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [statusModal, user.username, refetchEnquiries])
  )

  // ─── Soft delete ──────────────────────────────────────────────────────────────

  const [doDelete] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteEnquiry(deleteTarget.enquiryId, user.username)
      await refetchEnquiries()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetchEnquiries])
  )

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const getEnquiryTrips = useCallback(
    (enquiryId) => trips.filter((t) => t.enquiryId === enquiryId || t.bookingId === enquiryId),
    [trips]
  )
  const getEnquiryPayments = useCallback(
    (bookingId) => allPayments.filter((p) => p.bookingId === bookingId),
    [allPayments]
  )

  const handleVehicleSelect = (vehicleId) => {
    const v = vehicles.find((v) => v.id === vehicleId)
    if (v) {
      setTripForm((f) => ({
        ...f,
        allocatedVehicleId: v.id,
        allocatedVehicleNumber: v.registrationNumber,
        allocatedVehicleType: v.seater,
        allocatedVehicleSeating: v.seater,
      }))
    } else {
      setTripForm((f) => ({ ...f, allocatedVehicleId: '', allocatedVehicleNumber: '', allocatedVehicleType: '', allocatedVehicleSeating: '' }))
    }
  }

  const handleDriverSelect = (driverId) => {
    const d = drivers.find((d) => d.id === driverId)
    if (d) {
      setTripForm((f) => ({ ...f, allocatedDriverId: d.id, allocatedDriverName: d.name, allocatedDriverPhone: d.phone }))
    } else {
      setTripForm((f) => ({ ...f, allocatedDriverId: '', allocatedDriverName: '', allocatedDriverPhone: '' }))
    }
  }

  const openNewEnquiry = () => {
    setEditEnquiry(null)
    setEForm(emptyEnquiryForm())
    setInlineTrips([])
    setEErrors({})
    setFormError('')
    setEnquiryModal(true)
  }

  const openEditEnquiry = (e) => {
    setEditEnquiry(e)
    setEForm({
      customerPhone: e.customerPhone || '',
      customerName: e.customerName || '',
      customerId: e.customerId || '',
      agentId: e.agentId || '',
      guestName: e.guestName || '',
      guestPhone: e.guestPhone || '',
      alternateContactName: e.alternateContactName || '',
      alternateContactPhone: e.alternateContactPhone || '',
      pickupDateTime: e.pickupDateTime || '',
      pickupLocation: e.pickupLocation || '',
      dropLocation: e.dropLocation || '',
      trainFlightNumber: e.trainFlightNumber || '',
      customerRequests: e.customerRequests || '',
      notes: e.notes || '',
      enquiryQuote: e.enquiryQuote || '',
    })
    setInlineTrips([])
    setEErrors({})
    setFormError('')
    setEnquiryModal(true)
  }

  // Validate enquiry form
  const validateEnquiry = () => {
    const e = {}
    if (!eForm.agentId) e.agentId = 'Required'
    // Customer phone required only for direct agents
    if (isDirectAgent && !eForm.customerPhone.trim()) e.customerPhone = 'Required for this agent type'
    return e
  }

  const handleEnquirySubmit = async (ev) => {
    ev.preventDefault()
    const errs = validateEnquiry()
    if (Object.keys(errs).length) { setEErrors(errs); return }
    setFormError('')
    try {
      await saveEnquiry(
        { ...eForm, isAgentBooking: isAgentBooking ? 'true' : 'false' },
        inlineTrips
      )
    } catch (err) {
      setFormError(err.message)
    }
  }

  // ─── Table columns ────────────────────────────────────────────────────────────

  const columns = [
    { key: 'enquiryId', label: 'Enquiry ID' },
    { key: 'bookingId', label: 'Booking ID', render: (e) => e.bookingId || '—' },
    {
      key: 'customer', label: 'Customer / Guest',
      render: (e) => (
        <div>
          <p className="font-medium">{e.customerName || e.guestName || '—'}</p>
          <p className="text-xs text-gray-400">{e.customerPhone || e.guestPhone || ''}</p>
        </div>
      ),
    },
    {
      key: 'agent', label: 'Agent',
      render: (e) => {
        const agent = agents.find((a) => a.id === e.agentId)
        return agent ? (
          <span className="text-sm text-gray-600">{agent.name}</span>
        ) : '—'
      },
    },
    {
      key: 'status', label: 'Status',
      render: (e) => <Badge className={BOOKING_STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-700'}>{e.status}</Badge>,
    },
    { key: 'createdAt', label: 'Created', render: (e) => formatDate(e.createdAt) },
    {
      key: 'actions', label: '',
      render: (e) => (
        <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => openEditEnquiry(e)}>Edit</Button>
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(e)} className="text-red-500">Del</Button>}
        </div>
      ),
    },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="Enquiries & Bookings"
        subtitle={`${enquiries.length} total records`}
        actions={<Button onClick={openNewEnquiry}>+ New Enquiry</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      <Card className="mt-4">
        <CardHeader>
          <Tabs tabs={tabsWithCounts} active={tab} onChange={setTab} />
          <SearchInput value={search} onChange={setSearch} placeholder="Search by ID, name, phone..." className="max-w-sm" />
        </CardHeader>
        <Table
          columns={columns}
          data={filtered}
          loading={eLoading || tLoading}
          onRowClick={(e) => setDetailEnquiry(e)}
        />
      </Card>

      {/* ── New / Edit Enquiry Modal ──────────────────────────────────────────── */}
      <Modal
        open={enquiryModal}
        onClose={() => setEnquiryModal(false)}
        title={editEnquiry ? `Edit Enquiry — ${editEnquiry.enquiryId}` : 'New Enquiry'}
        size="xl"
      >
        <form onSubmit={handleEnquirySubmit} className="space-y-5">
          {formError && <Alert type="error" message={formError} />}

          {/* ── Agent ── */}
          <SectionTitle>Agent / Source</SectionTitle>
          <Select
            label="Agent / Source"
            required
            options={agentOptions}
            value={eForm.agentId}
            onChange={(e) => setEForm(f => ({ ...f, agentId: e.target.value }))}
            error={eErrors.agentId}
            placeholder="Select agent..."
          />

          {selectedAgent && (
            <p className="text-xs text-gray-500 -mt-2">
              Type: <span className="font-medium">
                {selectedAgent.agentType === 'other_business'
                  ? 'Business / Individual Agent — customer details optional, guest details recommended'
                  : 'Direct — customer phone required'}
              </span>
            </p>
          )}

          {/* ── Customer ── */}
          <SectionTitle>
            Customer Details
            {isAgentBooking && <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(optional for agent bookings)</span>}
          </SectionTitle>

          <div className="grid grid-cols-2 gap-4">
            {/* Phone with auto-detect */}
            <div className="relative">
              <Input
                label={`Customer Phone${isDirectAgent ? ' *' : ''}`}
                type="tel"
                value={eForm.customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                error={eErrors.customerPhone}
                placeholder="Start typing to search..."
                autoComplete="off"
              />
              <CustomerMatchDropdown
                phone={eForm.customerPhone}
                customers={customers}
                onSelect={handleCustomerSelect}
              />
              {eForm.customerId && (
                <p className="text-xs text-green-600 mt-1">✓ Linked to existing customer</p>
              )}
            </div>
            <Input
              label="Customer Name"
              value={eForm.customerName}
              onChange={(e) => setEForm(f => ({ ...f, customerName: e.target.value }))}
            />
          </div>

          {/* ── Travelling Guest ── */}
          <SectionTitle>Travelling Guest <span className="text-xs font-normal text-gray-400 normal-case">(person actually travelling, if different from customer)</span></SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Guest Name"
              value={eForm.guestName}
              onChange={(e) => setEForm(f => ({ ...f, guestName: e.target.value }))}
              placeholder="e.g. Mr. Sharma"
            />
            <Input
              label="Guest Phone"
              type="tel"
              value={eForm.guestPhone}
              onChange={(e) => setEForm(f => ({ ...f, guestPhone: e.target.value }))}
            />
          </div>

          {/* ── Alternate Contact ── */}
          <SectionTitle>Alternate Contact <span className="text-xs font-normal text-gray-400 normal-case">(optional second contact)</span></SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Alternate Contact Name"
              value={eForm.alternateContactName}
              onChange={(e) => setEForm(f => ({ ...f, alternateContactName: e.target.value }))}
            />
            <Input
              label="Alternate Contact Phone"
              type="tel"
              value={eForm.alternateContactPhone}
              onChange={(e) => setEForm(f => ({ ...f, alternateContactPhone: e.target.value }))}
            />
          </div>

          {/* ── Trip Details ── */}
          <SectionTitle>Trip Details <span className="text-xs font-normal text-gray-400 normal-case">(optional at enquiry stage)</span></SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Pickup Date & Time"
              type="datetime-local"
              value={eForm.pickupDateTime}
              onChange={(e) => setEForm(f => ({ ...f, pickupDateTime: e.target.value }))}
            />
            <Input
              label="Pickup Location"
              value={eForm.pickupLocation}
              onChange={(e) => setEForm(f => ({ ...f, pickupLocation: e.target.value }))}
            />
            <Input
              label="Drop Location"
              value={eForm.dropLocation}
              onChange={(e) => setEForm(f => ({ ...f, dropLocation: e.target.value }))}
            />
            <Input
              label="Train / Flight No."
              value={eForm.trainFlightNumber}
              onChange={(e) => setEForm(f => ({ ...f, trainFlightNumber: e.target.value }))}
            />
          </div>

          {/* ── Inline Trips ── */}
          {!editEnquiry && (
            <div className="pt-1">
              <InlineTripEditor
                trips={inlineTrips}
                onAdd={(trip) => setInlineTrips(t => [...t, trip])}
                onRemove={(i) => setInlineTrips(t => t.filter((_, idx) => idx !== i))}
                vehicles={vehicles}
                drivers={drivers}
              />
            </div>
          )}

          {/* ── Notes & Quote ── */}
          <SectionTitle>Notes & Quote</SectionTitle>
          <div className="grid grid-cols-1 gap-4">
            <Textarea
              label="Customer Requests"
              rows={2}
              value={eForm.customerRequests}
              onChange={(e) => setEForm(f => ({ ...f, customerRequests: e.target.value }))}
            />
            <Textarea
              label="Enquiry Quote / Message"
              rows={3}
              value={eForm.enquiryQuote}
              onChange={(e) => setEForm(f => ({ ...f, enquiryQuote: e.target.value }))}
            />
            <Textarea
              label="Internal Notes"
              rows={2}
              value={eForm.notes}
              onChange={(e) => setEForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEnquiryModal(false)}>Cancel</Button>
            <Button type="submit" loading={savingEnquiry}>
              {editEnquiry ? 'Update Enquiry' : `Create Enquiry${inlineTrips.length > 0 ? ` + ${inlineTrips.length} Trip${inlineTrips.length > 1 ? 's' : ''}` : ''}`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Detail / Booking Modal ────────────────────────────────────────────── */}
      <Modal
        open={!!detailEnquiry}
        onClose={() => setDetailEnquiry(null)}
        title={detailEnquiry?.bookingId || detailEnquiry?.enquiryId || 'Details'}
        size="2xl"
      >
        {detailEnquiry && (() => {
          const enquiryTrips = getEnquiryTrips(detailEnquiry.enquiryId)
          const payments = getEnquiryPayments(detailEnquiry.bookingId)
          const isConfirmed = !!detailEnquiry.bookingId

          return (
            <div>
              {/* Status + Quick Actions */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge className={BOOKING_STATUS_COLORS[detailEnquiry.status] || ''}>{detailEnquiry.status}</Badge>
                <Button size="sm" variant="secondary" onClick={() => {
                  setStatusModal({ enquiryId: detailEnquiry.enquiryId, currentStatus: detailEnquiry.status })
                }}>Change Status</Button>
                {!isConfirmed && (
                  <Button size="sm" variant="primary" onClick={() => {
                    setBForm({
                      ...emptyBookingForm(),
                      customerName: detailEnquiry.customerName || '',
                      customerPhone: detailEnquiry.customerPhone || '',
                      customerId: detailEnquiry.customerId || '',
                      agentId: detailEnquiry.agentId || '',
                      guestName: detailEnquiry.guestName || '',
                      guestPhone: detailEnquiry.guestPhone || '',
                      alternateContactName: detailEnquiry.alternateContactName || '',
                      alternateContactPhone: detailEnquiry.alternateContactPhone || '',
                      pickupDateTime: detailEnquiry.pickupDateTime || '',
                      pickupLocation: detailEnquiry.pickupLocation || '',
                      dropLocation: detailEnquiry.dropLocation || '',
                      trainFlightNumber: detailEnquiry.trainFlightNumber || '',
                      customerRequests: detailEnquiry.customerRequests || '',
                      notes: detailEnquiry.notes || '',
                      enquiryQuote: detailEnquiry.enquiryQuote || '',
                    })
                    setConfirmModal(true)
                  }}>Confirm as Booking</Button>
                )}
              </div>

              {/* Booking Info */}
              <SectionTitle>Booking Info</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Enquiry ID" value={detailEnquiry.enquiryId} />
                <InfoRow label="Booking ID" value={detailEnquiry.bookingId || '—'} />
                <InfoRow label="Customer" value={detailEnquiry.customerName} />
                <InfoRow label="Customer Phone" value={detailEnquiry.customerPhone} />
                {detailEnquiry.guestName && <InfoRow label="Travelling Guest" value={`${detailEnquiry.guestName}${detailEnquiry.guestPhone ? ` · ${detailEnquiry.guestPhone}` : ''}`} />}
                {detailEnquiry.alternateContactName && <InfoRow label="Alternate Contact" value={`${detailEnquiry.alternateContactName}${detailEnquiry.alternateContactPhone ? ` · ${detailEnquiry.alternateContactPhone}` : ''}`} />}
                <InfoRow label="Pickup" value={formatDateTime(detailEnquiry.pickupDateTime)} />
                <InfoRow label="Pickup Location" value={detailEnquiry.pickupLocation} />
                <InfoRow label="Drop Location" value={detailEnquiry.dropLocation} />
                <InfoRow label="Train/Flight" value={detailEnquiry.trainFlightNumber} />
              </div>
              {detailEnquiry.notes && <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3">{detailEnquiry.notes}</div>}

              {/* Financial Summary */}
              {isConfirmed && (
                <>
                  <SectionTitle>Financials</SectionTitle>
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600">Total</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(detailEnquiry.totalAmount)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600">Received</p>
                      <p className="text-lg font-bold text-green-900">{formatCurrency(detailEnquiry.amountReceived)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-yellow-600">Pending</p>
                      <p className="text-lg font-bold text-yellow-900">{formatCurrency(detailEnquiry.amountPending)}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Trips */}
              <div className="flex items-center justify-between mt-4 mb-2">
                <SectionTitle>Trips ({enquiryTrips.length})</SectionTitle>
                <Button size="sm" variant="secondary" onClick={() => {
                  setTripForm(emptyTripForm())
                  setTripModal({ enquiryId: detailEnquiry.enquiryId, bookingId: detailEnquiry.bookingId, editTrip: null })
                }}>+ Add Trip</Button>
              </div>
              {enquiryTrips.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No trips added yet.</p>
              ) : (
                <div className="space-y-2">
                  {enquiryTrips.map((trip) => (
                    <div key={trip.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{trip.vehicleType}</span>
                          <span className="text-gray-400 mx-2">·</span>
                          <span className="text-gray-600">{trip.tripType}</span>
                          {trip.localSubType && <span className="text-gray-400 ml-1">({trip.localSubType})</span>}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => {
                            setTripForm({ ...emptyTripForm(), ...trip })
                            setTripModal({ enquiryId: detailEnquiry.enquiryId, bookingId: detailEnquiry.bookingId, editTrip: trip })
                          }}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            await softDeleteTrip(trip.id, user.username)
                            await refetchTrips()
                          }} className="text-red-500">Del</Button>
                        </div>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                        {trip.allocatedDriverName && <span> · Driver: {trip.allocatedDriverName}</span>}
                        {trip.isVendorTrip === 'true' && <span className="ml-2 text-orange-600">(Vendor: {trip.vendorName})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payments */}
              {isConfirmed && (
                <>
                  <div className="flex items-center justify-between mt-4 mb-2">
                    <SectionTitle>Payments ({payments.length})</SectionTitle>
                    <Button size="sm" variant="secondary" onClick={() => {
                      setPayForm(emptyPaymentForm())
                      setPaymentModal({ bookingId: detailEnquiry.bookingId, tripId: '' })
                    }}>+ Add Payment</Button>
                  </div>
                  {payments.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">No payments recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 text-sm">
                          <div>
                            <span className="font-medium">{formatCurrency(p.amount)}</span>
                            <span className="text-gray-400 mx-2">·</span>
                            <span className="text-gray-600">{p.mode}</span>
                            <span className="text-gray-400 ml-2">{formatDate(p.paymentDate)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.isVerified === 'true' ? (
                              <Badge className="bg-green-100 text-green-700">Verified</Badge>
                            ) : (
                              isAdmin && <Button size="sm" variant="ghost" onClick={async () => {
                                await verifyPayment(p.id, user.username)
                                await refetchPayments()
                              }} className="text-green-600">Verify</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* ── Confirm Booking Modal ─────────────────────────────────────────────── */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Booking" size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          try { await doConfirm(bForm) } catch (err) { setFormError(err.message) }
        }} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}

          <SectionTitle>Customer Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label={isDirectAgentBooking ? 'Customer Phone *' : 'Customer Phone'}
                type="tel"
                value={bForm.customerPhone || ''}
                onChange={(e) => setBForm(f => ({ ...f, customerPhone: e.target.value, customerId: '' }))}
                autoComplete="off"
              />
              <CustomerMatchDropdown
                phone={bForm.customerPhone || ''}
                customers={customers}
                onSelect={(c) => setBForm(f => ({ ...f, customerId: c.id, customerName: c.name, customerPhone: c.phone }))}
              />
            </div>
            <Input
              label={isDirectAgentBooking ? 'Customer Name *' : 'Customer Name'}
              required={isDirectAgentBooking}
              value={bForm.customerName}
              onChange={(e) => setBForm(f => ({ ...f, customerName: e.target.value }))}
            />
          </div>

          <SectionTitle>Travelling Guest <span className="text-xs font-normal text-gray-400 normal-case">(person actually travelling)</span></SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guest Name" value={bForm.guestName} onChange={(e) => setBForm(f => ({ ...f, guestName: e.target.value }))} />
            <Input label="Guest Phone" type="tel" value={bForm.guestPhone} onChange={(e) => setBForm(f => ({ ...f, guestPhone: e.target.value }))} />
            <Input label="Alternate Contact Name" value={bForm.alternateContactName} onChange={(e) => setBForm(f => ({ ...f, alternateContactName: e.target.value }))} />
            <Input label="Alternate Contact Phone" type="tel" value={bForm.alternateContactPhone} onChange={(e) => setBForm(f => ({ ...f, alternateContactPhone: e.target.value }))} />
          </div>

          <SectionTitle>Trip Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Pickup Date & Time" type="datetime-local" value={bForm.pickupDateTime} onChange={(e) => setBForm(f => ({ ...f, pickupDateTime: e.target.value }))} />
            <Input label="Pickup Location" value={bForm.pickupLocation} onChange={(e) => setBForm(f => ({ ...f, pickupLocation: e.target.value }))} />
            <Input label="Drop Location" value={bForm.dropLocation} onChange={(e) => setBForm(f => ({ ...f, dropLocation: e.target.value }))} />
            <Input label="Train / Flight No." value={bForm.trainFlightNumber} onChange={(e) => setBForm(f => ({ ...f, trainFlightNumber: e.target.value }))} />
          </div>

          <SectionTitle>Financials</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Total Amount (₹)" type="number" value={bForm.totalAmount} onChange={(e) => setBForm(f => ({ ...f, totalAmount: e.target.value }))} />
            <Input label="Amount Received (₹)" type="number" value={bForm.amountReceived} onChange={(e) => setBForm(f => ({ ...f, amountReceived: e.target.value }))} />
            <Input label="Amount Pending (₹)" type="number" value={bForm.amountPending} onChange={(e) => setBForm(f => ({ ...f, amountPending: e.target.value }))} />
          </div>

          <SectionTitle>Notes</SectionTitle>
          <Textarea label="Customer Requests" value={bForm.customerRequests} onChange={(e) => setBForm(f => ({ ...f, customerRequests: e.target.value }))} />
          <Textarea label="Booking Quote" rows={4} value={bForm.bookingQuote} onChange={(e) => setBForm(f => ({ ...f, bookingQuote: e.target.value }))} />
          <Textarea label="Internal Notes" value={bForm.notes} onChange={(e) => setBForm(f => ({ ...f, notes: e.target.value }))} />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setConfirmModal(false)}>Cancel</Button>
            <Button type="submit" loading={confirming} variant="success">Confirm Booking</Button>
          </div>
        </form>
      </Modal>

      {/* ── Trip Modal ────────────────────────────────────────────────────────── */}
      <Modal open={!!tripModal} onClose={() => setTripModal(null)} title={tripModal?.editTrip ? 'Edit Trip' : 'Add Trip'} size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          try { await saveTrip(tripForm, tripModal.enquiryId, tripModal.bookingId, tripModal.editTrip) }
          catch (err) { setFormError(err.message) }
        }} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Trip Type" required options={TRIP_TYPE_OPTIONS} value={tripForm.tripType}
              onChange={(e) => setTripForm(f => ({ ...f, tripType: e.target.value }))} />
            {tripForm.tripType === 'Delhi/NCR Local' && (
              <Select label="Local Sub-type" options={LOCAL_SUB_TYPE_OPTIONS} value={tripForm.localSubType}
                onChange={(e) => setTripForm(f => ({ ...f, localSubType: e.target.value }))} />
            )}
            <Select label="Vehicle Type" required options={VEHICLE_TYPE_OPTIONS} value={tripForm.vehicleType}
              onChange={(e) => setTripForm(f => ({ ...f, vehicleType: e.target.value }))} />
            <Input label="Start Date" type="date" value={tripForm.startDate} onChange={(e) => setTripForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={tripForm.endDate} onChange={(e) => setTripForm(f => ({ ...f, endDate: e.target.value }))} />
            <Input label="Travel Plan" value={tripForm.travelPlan} onChange={(e) => setTripForm(f => ({ ...f, travelPlan: e.target.value }))} />
            <Input label="Pickup Date & Time" type="datetime-local" value={tripForm.pickupDateTime} onChange={(e) => setTripForm(f => ({ ...f, pickupDateTime: e.target.value }))} />
            <Input label="Pickup Location" value={tripForm.pickupLocation} onChange={(e) => setTripForm(f => ({ ...f, pickupLocation: e.target.value }))} />
            <Input label="Drop Location" value={tripForm.dropLocation} onChange={(e) => setTripForm(f => ({ ...f, dropLocation: e.target.value }))} />
            <Input label="Train / Flight No." value={tripForm.trainFlightNumber} onChange={(e) => setTripForm(f => ({ ...f, trainFlightNumber: e.target.value }))} />
          </div>

          <SectionTitle>Vendor (if applicable)</SectionTitle>
          <Checkbox label="Vendor Trip" checked={tripForm.isVendorTrip === true || tripForm.isVendorTrip === 'true'}
            onChange={(e) => setTripForm(f => ({ ...f, isVendorTrip: e.target.checked }))} />
          {(tripForm.isVendorTrip === true || tripForm.isVendorTrip === 'true') && (
            <div className="grid grid-cols-3 gap-4">
              <Input label="Vendor Name" value={tripForm.vendorName} onChange={(e) => setTripForm(f => ({ ...f, vendorName: e.target.value }))} />
              <Input label="Vendor Phone" value={tripForm.vendorPhone} onChange={(e) => setTripForm(f => ({ ...f, vendorPhone: e.target.value }))} />
              <Input label="Our Commission" value={tripForm.vendorCommission} onChange={(e) => setTripForm(f => ({ ...f, vendorCommission: e.target.value }))} />
            </div>
          )}

          <SectionTitle>Vehicle Allocation</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Select label="From Fleet" options={vehicleOptions} value={tripForm.allocatedVehicleId} onChange={(e) => handleVehicleSelect(e.target.value)} placeholder="Select fleet vehicle..." />
            <Input label="Or Manual: Vehicle No." value={tripForm.allocatedVehicleNumber} onChange={(e) => setTripForm(f => ({ ...f, allocatedVehicleNumber: e.target.value }))} />
          </div>

          <SectionTitle>Driver Allocation</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Select label="From Driver List" options={driverOptions} value={tripForm.allocatedDriverId} onChange={(e) => handleDriverSelect(e.target.value)} placeholder="Select driver..." />
            <Input label="Or Manual: Driver Name" value={tripForm.allocatedDriverName} onChange={(e) => setTripForm(f => ({ ...f, allocatedDriverName: e.target.value }))} />
            <Input label="Driver Phone" value={tripForm.allocatedDriverPhone} onChange={(e) => setTripForm(f => ({ ...f, allocatedDriverPhone: e.target.value }))} />
          </div>

          <SectionTitle>Trip Financials</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Total Amount (₹)" type="number" value={tripForm.totalAmount} onChange={(e) => setTripForm(f => ({ ...f, totalAmount: e.target.value }))} />
            <Input label="Amount Received (₹)" type="number" value={tripForm.amountReceived} onChange={(e) => setTripForm(f => ({ ...f, amountReceived: e.target.value }))} />
            <Input label="Amount Pending (₹)" type="number" value={tripForm.amountPending} onChange={(e) => setTripForm(f => ({ ...f, amountPending: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTripModal(null)}>Cancel</Button>
            <Button type="submit" loading={savingTrip}>{tripModal?.editTrip ? 'Update Trip' : 'Add Trip'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Payment Modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment" size="md">
        <form onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          try { await savePayment(payForm) } catch (err) { setFormError(err.message) }
        }} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹)" type="number" required value={payForm.amount} onChange={(e) => setPayForm(f => ({ ...f, amount: e.target.value }))} />
            <Select label="Mode" required options={PAYMENT_MODE_OPTIONS} value={payForm.mode} onChange={(e) => setPayForm(f => ({ ...f, mode: e.target.value }))} />
            <Input label="Received By" required value={payForm.receivedBy} onChange={(e) => setPayForm(f => ({ ...f, receivedBy: e.target.value }))} />
            <Input label="Payment Date" type="date" required value={payForm.paymentDate} onChange={(e) => setPayForm(f => ({ ...f, paymentDate: e.target.value }))} />
          </div>
          <Input label="Notes" value={payForm.notes} onChange={(e) => setPayForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button type="submit" loading={savingPayment}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* ── Status Modal ───────────────────────────────────────────────────────── */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Change Status" size="sm">
        <div className="space-y-2">
          {BOOKING_STATUS_OPTIONS.map((s) => (
            <button key={s} onClick={() => doStatusUpdate(s)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors
                ${statusModal?.currentStatus === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
              <Badge className={BOOKING_STATUS_COLORS[s] || ''}>{s}</Badge>
            </button>
          ))}
        </div>
      </Modal>

      {/* ── Delete Confirm ─────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Enquiry"
        message={`Delete enquiry "${deleteTarget?.enquiryId}"? This action uses soft delete.`}
      />
    </div>
  )
}
