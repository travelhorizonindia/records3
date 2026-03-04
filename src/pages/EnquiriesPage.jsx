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
  driverAllowanceService, tollExpenseService, parkingExpenseService,
  stateTaxExpenseService, fuelExpenseService, otherExpenseService,
} from '../services/expenseService.js'
import { ExpenseForm, validateExpenseForm, cleanForm as cleanExpenseForm } from '../pages/ExpensesPage.jsx'
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
  { key: 'deleted', label: 'Deleted' },
]

const DIRECT_AGENT_TYPES = ['self', 'google_ads']

// ─── Empty form factories ─────────────────────────────────────────────────────

const emptyEnquiryForm = () => ({
  customerPhone: '', customerName: '', customerId: '',
  agentId: '',
  guestName: '', guestPhone: '',
  alternateContactName: '', alternateContactPhone: '',
  customerRequests: '', notes: '', enquiryQuote: '',
})

const emptyTripForm = () => ({
  tripType: '', localSubType: '', vehicleType: '',
  startDate: '', endDate: '', travelPlan: '',
  isVendorTrip: false, vendorName: '', vendorPhone: '', vendorCommission: '',
  pickupTime: '', pickupLocation: '', dropLocation: '',
  allocatedVehicleId: '', allocatedVehicleNumber: '', allocatedVehicleType: '', allocatedVehicleSeating: '',
  allocatedDriverId: '', allocatedDriverName: '', allocatedDriverPhone: '',
  notes: '', customerRequests: '', trainFlightNumber: '',
})

const emptyBookingFields = () => ({
  bookingQuote: '', totalAmount: '', amountReceived: '', amountPending: '',
  pickupDateTime: '', pickupLocation: '', dropLocation: '', trainFlightNumber: '',
})

const emptyPaymentForm = () => ({
  amount: '', mode: '', receivedBy: '', paymentDate: '', notes: '', tripId: '',
})

// ─── Customer phone dropdown ──────────────────────────────────────────────────

function CustomerMatchDropdown({ phone, customers, onSelect, visible }) {
  const matches = useMemo(() => {
    if (!phone || phone.length < 5) return []
    const q = phone.trim()
    return customers.filter(
      (c) => c.phone?.includes(q) || c.alternatePhone1?.includes(q) || c.alternatePhone2?.includes(q)
    ).slice(0, 5)
  }, [phone, customers])

  if (!visible || matches.length === 0) return null

  return (
    <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-blue-200 rounded-lg shadow-lg overflow-hidden">
      <p className="px-3 py-1.5 text-xs text-blue-600 bg-blue-50 font-medium">Existing customers matched</p>
      {matches.map((c) => (
        <button key={c.id} type="button" onMouseDown={() => onSelect(c)}
          className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0">
          <p className="text-sm font-medium text-gray-900">{c.name}</p>
          <p className="text-xs text-gray-400">{c.phone}{c.customerStatus === 'repeating' ? ' · ⭐ Repeating' : ''}</p>
        </button>
      ))}
    </div>
  )
}

// ─── Inline trip editor ───────────────────────────────────────────────────────

function InlineTripEditor({ trips, onAdd, onRemove, vehicles, drivers, openByDefault = false }) {
  const [open, setOpen] = useState(openByDefault)
  const [form, setForm] = useState(emptyTripForm())

  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} - ${v.seater}` }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))

  const handleVehicleSelect = (vehicleId) => {
    const v = vehicles.find((v) => v.id === vehicleId)
    if (v) setForm((f) => ({ ...f, allocatedVehicleId: v.id, allocatedVehicleNumber: v.registrationNumber, allocatedVehicleType: v.seater, allocatedVehicleSeating: v.seater }))
    else setForm((f) => ({ ...f, allocatedVehicleId: '', allocatedVehicleNumber: '', allocatedVehicleType: '', allocatedVehicleSeating: '' }))
  }

  const handleDriverSelect = (driverId) => {
    const d = drivers.find((d) => d.id === driverId)
    if (d) setForm((f) => ({ ...f, allocatedDriverId: d.id, allocatedDriverName: d.name, allocatedDriverPhone: d.phone }))
    else setForm((f) => ({ ...f, allocatedDriverId: '', allocatedDriverName: '', allocatedDriverPhone: '' }))
  }

  const hasPartialData = form.tripType || form.vehicleType || form.startDate || form.pickupLocation

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Trips ({trips.length})</span>
        <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : '+ Add Trip'}
        </Button>
      </div>

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

      {open && (
        <div className="border border-blue-100 rounded-xl bg-blue-50/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Trip Type *" options={TRIP_TYPE_OPTIONS} value={form.tripType} onChange={(e) => setForm(f => ({ ...f, tripType: e.target.value }))} placeholder="Select..." />
            {form.tripType === 'Delhi/NCR Local' && (
              <Select label="Local Sub-type" options={LOCAL_SUB_TYPE_OPTIONS} value={form.localSubType} onChange={(e) => setForm(f => ({ ...f, localSubType: e.target.value }))} placeholder="Select..." />
            )}
            <Select label="Vehicle Type *" options={VEHICLE_TYPE_OPTIONS} value={form.vehicleType} onChange={(e) => setForm(f => ({ ...f, vehicleType: e.target.value }))} placeholder="Select..." />
            <Input label="Start / Pickup Date" type="date" value={form.startDate} onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={form.endDate} onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))} />
            <Input label="Pickup Time" type="time" value={form.pickupTime} onChange={(e) => setForm(f => ({ ...f, pickupTime: e.target.value }))} />
            <Input label="Pickup Location" value={form.pickupLocation} onChange={(e) => setForm(f => ({ ...f, pickupLocation: e.target.value }))} />
            <Input label="Drop Location" value={form.dropLocation} onChange={(e) => setForm(f => ({ ...f, dropLocation: e.target.value }))} />
            <Input label="Train / Flight No." value={form.trainFlightNumber} onChange={(e) => setForm(f => ({ ...f, trainFlightNumber: e.target.value }))} />
            <Input label="Travel Plan" value={form.travelPlan} onChange={(e) => setForm(f => ({ ...f, travelPlan: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Allocate Vehicle (Fleet)" options={vehicleOptions} value={form.allocatedVehicleId} onChange={(e) => handleVehicleSelect(e.target.value)} placeholder="From fleet..." />
            <Input label="Or Manual Vehicle No." value={form.allocatedVehicleNumber} onChange={(e) => setForm(f => ({ ...f, allocatedVehicleNumber: e.target.value }))} />
            <Select label="Allocate Driver" options={driverOptions} value={form.allocatedDriverId} onChange={(e) => handleDriverSelect(e.target.value)} placeholder="From drivers..." />
            <Input label="Or Manual Driver Name" value={form.allocatedDriverName} onChange={(e) => setForm(f => ({ ...f, allocatedDriverName: e.target.value }))} />
          </div>
          <Checkbox label="Vendor Trip" checked={form.isVendorTrip === true} onChange={(e) => setForm(f => ({ ...f, isVendorTrip: e.target.checked }))} />
          {form.isVendorTrip && (
            <div className="grid grid-cols-3 gap-3">
              <Input label="Vendor Name" value={form.vendorName} onChange={(e) => setForm(f => ({ ...f, vendorName: e.target.value }))} />
              <Input label="Vendor Phone" value={form.vendorPhone} onChange={(e) => setForm(f => ({ ...f, vendorPhone: e.target.value }))} />
              <Input label="Our Commission" value={form.vendorCommission} onChange={(e) => setForm(f => ({ ...f, vendorCommission: e.target.value }))} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => { setOpen(false); setForm(emptyTripForm()) }}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => {
              if (!form.tripType || !form.vehicleType) return
              const pickupDateTime = form.startDate && form.pickupTime ? `${form.startDate}T${form.pickupTime}` : form.startDate || ''
              onAdd({ ...form, pickupDateTime, _tempId: generateId() })
              setForm(emptyTripForm())
              setOpen(false)
            }} disabled={!form.tripType || !form.vehicleType}>
              Add Trip
            </Button>
          </div>
        </div>
      )}

      {/* expose whether the form has partial unsaved data */}
      <input type="hidden" data-partial={hasPartialData ? 'true' : 'false'} data-open={open ? 'true' : 'false'} id="trip-editor-state" />
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

  // ── Tab / filter state ────────────────────────────────────────────────────
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterPendingOnly, setFilterPendingOnly] = useState(false)
  const [filterBookingsOnly, setFilterBookingsOnly] = useState(false)
  const [filterEnquiriesOnly, setFilterEnquiriesOnly] = useState(false)

  // ── Modal states ──────────────────────────────────────────────────────────
  const [enquiryModal, setEnquiryModal] = useState(false)
  const [editEnquiry, setEditEnquiry] = useState(null)
  const [detailEnquiry, setDetailEnquiry] = useState(null)
  const [tripModal, setTripModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)
  const [expenseModal, setExpenseModal] = useState(null)
  const [noTripConfirm, setNoTripConfirm] = useState(false)
  const [unsavedTripConfirm, setUnsavedTripConfirm] = useState(false)
  const [pendingSubmitData, setPendingSubmitData] = useState(null)

  // ── Form states ───────────────────────────────────────────────────────────
  const [eForm, setEForm] = useState(emptyEnquiryForm())
  const [convertToBooking, setConvertToBooking] = useState(false)
  const [bookingFields, setBookingFields] = useState(emptyBookingFields())
  const [inlineTrips, setInlineTrips] = useState([])
  const [tripForm, setTripForm] = useState(emptyTripForm())
  const [payForm, setPayForm] = useState(emptyPaymentForm())
  const [expForm, setExpForm] = useState({ date: new Date().toISOString().split('T')[0] })
  const [expenseTab, setExpenseTab] = useState('fuel')
  const [expSavedCount, setExpSavedCount] = useState(0)
  const [eErrors, setEErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [phoneFieldFocused, setPhoneFieldFocused] = useState(false)
  const [bPhoneFieldFocused, setBPhoneFieldFocused] = useState(false)

  // ── Derived ───────────────────────────────────────────────────────────────
  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }))
  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} - ${v.seater}` }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))

  const selectedAgent = agents.find((a) => a.id === eForm.agentId)
  const isDirectAgent = DIRECT_AGENT_TYPES.includes(selectedAgent?.agentType)
  const isAgentBooking = selectedAgent?.agentType === 'other_business'

  // Keep detailEnquiry in sync with latest enquiries data
  const liveDetailEnquiry = useMemo(() => {
    if (!detailEnquiry) return null
    return enquiries.find((e) => e.enquiryId === detailEnquiry.enquiryId) || detailEnquiry
  }, [detailEnquiry, enquiries])

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enquiries.filter((e) => {
      // Deleted tab
      if (tab === 'deleted') return e.isDeleted === 'true'
      if (e.isDeleted === 'true') return false

      // Status tab
      if (tab !== 'all' && e.status !== tab) return false

      // Search
      if (q && !(
        e.enquiryId?.toLowerCase().includes(q) ||
        e.customerName?.toLowerCase().includes(q) ||
        e.customerPhone?.toLowerCase().includes(q) ||
        e.bookingId?.toLowerCase().includes(q) ||
        e.guestName?.toLowerCase().includes(q)
      )) return false

      // Agent filter
      if (filterAgent && e.agentId !== filterAgent) return false

      // Date filter (by createdAt)
      if (filterDateFrom && e.createdAt && e.createdAt < filterDateFrom) return false
      if (filterDateTo && e.createdAt && e.createdAt.split('T')[0] > filterDateTo) return false

      // Pending payments only
      if (filterPendingOnly && !(parseFloat(e.amountPending) > 0)) return false

      // Bookings only
      if (filterBookingsOnly && !e.bookingId) return false

      // Enquiries only (no booking ID)
      if (filterEnquiriesOnly && e.bookingId) return false

      return true
    })
  }, [enquiries, tab, search, filterAgent, filterDateFrom, filterDateTo, filterPendingOnly, filterBookingsOnly, filterEnquiriesOnly])

  const tabsWithCounts = STATUS_TABS.map((t) => ({
    ...t,
    count: t.key === 'deleted'
      ? enquiries.filter((e) => e.isDeleted === 'true').length
      : t.key === 'all'
        ? enquiries.filter((e) => e.isDeleted !== 'true').length
        : enquiries.filter((e) => e.status === t.key && e.isDeleted !== 'true').length,
  }))

  const hasActiveFilters = filterAgent || filterDateFrom || filterDateTo || filterPendingOnly || filterBookingsOnly || filterEnquiriesOnly

  // ── Save Enquiry ──────────────────────────────────────────────────────────
  const [saveEnquiry, { loading: savingEnquiry }] = useAsyncCallback(
    useCallback(async (f, tripsToCreate, isBooking, bFields) => {
      let savedEnquiryId = editEnquiry?.enquiryId

      if (editEnquiry) {
        await updateEnquiry(editEnquiry.enquiryId, f, user.username)
      } else {
        const res = await createEnquiry(
          { ...f, isAgentBooking: isAgentBooking ? 'true' : 'false' },
          user.username
        )
        savedEnquiryId = res?.data?.enquiryId
      }

      // Auto-create customer for direct agents
      if (!f.customerId && f.customerPhone && isDirectAgent) {
        const existing = customers.find((c) => c.phone === f.customerPhone)
        if (!existing) {
          await createCustomer({ name: f.customerName || '', phone: f.customerPhone }, user.username)
          await refetchCustomers()
        }
      }

      // If converting to booking, call confirmBooking
      if (isBooking && savedEnquiryId) {
        await confirmBooking(savedEnquiryId, { ...f, ...bFields }, user.username)
      }

      // Save inline trips
      if (tripsToCreate?.length > 0 && savedEnquiryId) {
        for (const trip of tripsToCreate) {
          const { _tempId, ...tripData } = trip
          await createTrip({ ...tripData, enquiryId: savedEnquiryId, bookingId: '' }, user.username)
        }
        await refetchTrips()
      }

      await refetchEnquiries()
      setEnquiryModal(false)
      setInlineTrips([])
      setConvertToBooking(false)
      setBookingFields(emptyBookingFields())
      setSuccessMsg(editEnquiry ? 'Enquiry updated.' : isBooking ? 'Booking created!' : 'Enquiry created.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editEnquiry, user.username, refetchEnquiries, refetchTrips, refetchCustomers, customers, isDirectAgent, isAgentBooking])
  )

  // ── Status update — updates live detail immediately ───────────────────────
  const [doStatusUpdate, { loading: updatingStatus }] = useAsyncCallback(
    useCallback(async (newStatus) => {
      const enquiryId = detailEnquiry?.enquiryId
      await updateEnquiry(enquiryId, { status: newStatus }, user.username)
      await refetchEnquiries()
      // Update detailEnquiry in-place so the popup reflects the change immediately
      setDetailEnquiry((prev) => prev ? { ...prev, status: newStatus } : prev)
    }, [detailEnquiry, user.username, refetchEnquiries])
  )

  // ── Save Trip ─────────────────────────────────────────────────────────────
  const [saveTrip, { loading: savingTrip }] = useAsyncCallback(
    useCallback(async (f, enquiryId, bookingId, editTrip) => {
      const pickupDateTime = f.startDate && f.pickupTime ? `${f.startDate}T${f.pickupTime}` : f.pickupDateTime || f.startDate || ''
      const tripData = { ...f, pickupDateTime }
      if (editTrip) await updateTrip(editTrip.id, tripData, user.username)
      else await createTrip({ ...tripData, enquiryId, bookingId }, user.username)
      await refetchTrips()
      setTripModal(null)
      setSuccessMsg('Trip saved.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [user.username, refetchTrips])
  )

  // ── Save Payment ──────────────────────────────────────────────────────────
  const [savePayment, { loading: savingPayment }] = useAsyncCallback(
    useCallback(async (f) => {
      await createPayment({ ...f, bookingId: paymentModal.bookingId }, user.username)
      await refetchPayments()
      setPaymentModal(null)
      setSuccessMsg('Payment recorded.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [paymentModal, user.username, refetchPayments])
  )

  // ── Expense data for listing inside booking popup ─────────────────────────
  const { data: allExpensesFuel = [], refetch: refetchExpFuel } = useAsync(fuelExpenseService.getAll)
  const { data: allExpensesToll = [], refetch: refetchExpToll } = useAsync(tollExpenseService.getAll)
  const { data: allExpensesParking = [], refetch: refetchExpParking } = useAsync(parkingExpenseService.getAll)
  const { data: allExpensesAllowance = [], refetch: refetchExpAllowance } = useAsync(driverAllowanceService.getAll)
  const { data: allExpensesStateTax = [], refetch: refetchExpStateTax } = useAsync(stateTaxExpenseService.getAll)
  const { data: allExpensesOther = [], refetch: refetchExpOther } = useAsync(otherExpenseService.getAll)

  const TAB_EXP_SERVICE = {
    fuel: { service: fuelExpenseService, refetch: refetchExpFuel, data: allExpensesFuel },
    toll: { service: tollExpenseService, refetch: refetchExpToll, data: allExpensesToll },
    parking: { service: parkingExpenseService, refetch: refetchExpParking, data: allExpensesParking },
    allowance: { service: driverAllowanceService, refetch: refetchExpAllowance, data: allExpensesAllowance },
    stateTax: { service: stateTaxExpenseService, refetch: refetchExpStateTax, data: allExpensesStateTax },
    other: { service: otherExpenseService, refetch: refetchExpOther, data: allExpensesOther },
  }

  const MULTI_ADD_EXP = new Set(['fuel', 'parking', 'stateTax'])

  // All expenses for the current detail booking (flattened)
  const bookingExpenses = useMemo(() => {
    const bookingId = liveDetailEnquiry?.bookingId || liveDetailEnquiry?.enquiryId
    if (!bookingId) return []
    const all = [
      ...allExpensesFuel.map((e) => ({ ...e, _type: 'Fuel' })),
      ...allExpensesToll.map((e) => ({ ...e, _type: 'Toll' })),
      ...allExpensesParking.map((e) => ({ ...e, _type: 'Parking' })),
      ...allExpensesAllowance.map((e) => ({ ...e, _type: 'Allowance' })),
      ...allExpensesStateTax.map((e) => ({ ...e, _type: 'State Tax' })),
      ...allExpensesOther.map((e) => ({ ...e, _type: 'Other' })),
    ]
    return all.filter((e) => (e.bookingId === bookingId || e.enquiryId === bookingId) && e.isDeleted !== 'true')
  }, [liveDetailEnquiry, allExpensesFuel, allExpensesToll, allExpensesParking, allExpensesAllowance, allExpensesStateTax, allExpensesOther])

  // ── Save Expense ──────────────────────────────────────────────────────────
  const [saveExpense, { loading: savingExpense }] = useAsyncCallback(
    useCallback(async (f) => {
      const err = validateExpenseForm(expenseTab, f)
      if (err) { setFormError(err); return }
      const bookingId = expenseModal?.bookingId
      const enquiryId = expenseModal?.enquiryId
      const cleaned = cleanExpenseForm(expenseTab, { ...f, bookingId, enquiryId })
      const cfg = TAB_EXP_SERVICE[expenseTab]
      await cfg.service.create(cleaned, user.username)
      await cfg.refetch()
      setExpSavedCount((n) => n + 1)

      if (MULTI_ADD_EXP.has(expenseTab)) {
        // Stay open — preserve tripId so vehicle+driver stay auto-filled
        setExpForm((prev) => ({
          date: new Date().toISOString().split('T')[0],
          tripId: prev.tripId,
          vehicleId: prev.vehicleId,
          driverId: prev.driverId,
        }))
        setSuccessMsg('Expense saved!')
        setTimeout(() => setSuccessMsg(''), 2000)
      } else {
        setExpenseModal(null)
        setExpForm({ date: new Date().toISOString().split('T')[0] })
        setSuccessMsg('Expense recorded.')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    }, [expenseTab, expenseModal, user.username, TAB_EXP_SERVICE, MULTI_ADD_EXP])
  )

  // ── Soft delete ───────────────────────────────────────────────────────────
  const [doDelete] = useAsyncCallback(
    useCallback(async () => {
      await softDeleteEnquiry(deleteTarget.enquiryId, user.username)
      await refetchEnquiries()
      setDeleteTarget(null)
    }, [deleteTarget, user.username, refetchEnquiries])
  )

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEnquiryTrips = useCallback(
    (enquiryId) => trips.filter((t) => t.enquiryId === enquiryId || t.bookingId === enquiryId),
    [trips]
  )
  const getEnquiryPayments = useCallback(
    (bookingId) => allPayments.filter((p) => p.bookingId === bookingId),
    [allPayments]
  )

  const handleVehicleSelect = (vehicleId, setter) => {
    const v = vehicles.find((v) => v.id === vehicleId)
    if (v) setter((f) => ({ ...f, allocatedVehicleId: v.id, allocatedVehicleNumber: v.registrationNumber, allocatedVehicleType: v.seater, allocatedVehicleSeating: v.seater }))
    else setter((f) => ({ ...f, allocatedVehicleId: '', allocatedVehicleNumber: '', allocatedVehicleType: '', allocatedVehicleSeating: '' }))
  }

  const handleDriverSelect = (driverId, setter) => {
    const d = drivers.find((d) => d.id === driverId)
    if (d) setter((f) => ({ ...f, allocatedDriverId: d.id, allocatedDriverName: d.name, allocatedDriverPhone: d.phone }))
    else setter((f) => ({ ...f, allocatedDriverId: '', allocatedDriverName: '', allocatedDriverPhone: '' }))
  }

  const openNewEnquiry = () => {
    setEditEnquiry(null)
    setEForm(emptyEnquiryForm())
    setInlineTrips([])
    setConvertToBooking(false)
    setBookingFields(emptyBookingFields())
    setEErrors({})
    setFormError('')
    setEnquiryModal(true)
  }

  const openEditEnquiry = (e) => {
    setEditEnquiry(e)
    setEForm({
      customerPhone: e.customerPhone || '', customerName: e.customerName || '',
      customerId: e.customerId || '', agentId: e.agentId || '',
      guestName: e.guestName || '', guestPhone: e.guestPhone || '',
      alternateContactName: e.alternateContactName || '', alternateContactPhone: e.alternateContactPhone || '',
      customerRequests: e.customerRequests || '', notes: e.notes || '', enquiryQuote: e.enquiryQuote || '',
    })
    setInlineTrips([])
    setConvertToBooking(false)
    setBookingFields(emptyBookingFields())
    setEErrors({})
    setFormError('')
    setEnquiryModal(true)
  }

  // Check for unsaved trip editor state via hidden input
  const getTripEditorState = () => {
    const el = document.getElementById('trip-editor-state')
    if (!el) return { partial: false, open: false }
    return {
      partial: el.dataset.partial === 'true',
      open: el.dataset.open === 'true',
    }
  }

  const validateAndSubmitEnquiry = (ev) => {
    ev.preventDefault()
    const errs = {}
    if (!eForm.agentId) errs.agentId = 'Required'
    if (isDirectAgent && !eForm.customerPhone.trim()) errs.customerPhone = 'Required for this agent type'
    if (Object.keys(errs).length) { setEErrors(errs); return }
    setFormError('')

    const tripState = getTripEditorState()
    const data = { form: eForm, trips: inlineTrips, isBooking: convertToBooking, bFields: bookingFields }

    // Check for unsaved trip data in the editor
    if (tripState.open && tripState.partial) {
      setPendingSubmitData(data)
      setUnsavedTripConfirm(true)
      return
    }

    // Check for no trips added
    if (inlineTrips.length === 0 && !editEnquiry) {
      setPendingSubmitData(data)
      setNoTripConfirm(true)
      return
    }

    doSaveEnquiry(data)
  }

  const doSaveEnquiry = ({ form, trips, isBooking, bFields }) => {
    setNoTripConfirm(false)
    setUnsavedTripConfirm(false)
    setPendingSubmitData(null)
    saveEnquiry(form, trips, isBooking, bFields).catch((err) => setFormError(err.message))
  }

  // ── Table columns ─────────────────────────────────────────────────────────
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
      render: (e) => agents.find((a) => a.id === e.agentId)?.name || '—',
    },
    {
      key: 'status', label: 'Status',
      render: (e) => <Badge className={BOOKING_STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-700'}>{e.status}</Badge>,
    },
    { key: 'amountPending', label: 'Pending', render: (e) => e.amountPending ? formatCurrency(e.amountPending) : '—' },
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Enquiries & Bookings"
        subtitle={`${enquiries.filter(e => e.isDeleted !== 'true').length} total records`}
        actions={<Button onClick={openNewEnquiry}>+ New Enquiry</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      <Card className="mt-4">
        <CardHeader>
          <Tabs tabs={tabsWithCounts} active={tab} onChange={setTab} />

          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 mt-3 items-end">
            <SearchInput value={search} onChange={setSearch} placeholder="Search ID, name, phone..." className="w-56" />

            <Select
              options={agentOptions}
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
              placeholder="All agents"
              className="w-44"
            />

            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">From</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">To</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" checked={filterBookingsOnly} onChange={(e) => { setFilterBookingsOnly(e.target.checked); if (e.target.checked) setFilterEnquiriesOnly(false) }} />
                Bookings only
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600" checked={filterEnquiriesOnly} onChange={(e) => { setFilterEnquiriesOnly(e.target.checked); if (e.target.checked) setFilterBookingsOnly(false) }} />
                Enquiries only
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-gray-600">
                <input type="checkbox" className="rounded border-gray-300 text-orange-500" checked={filterPendingOnly} onChange={(e) => setFilterPendingOnly(e.target.checked)} />
                Pending payments
              </label>
            </div>

            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={() => {
                setFilterAgent(''); setFilterDateFrom(''); setFilterDateTo('')
                setFilterPendingOnly(false); setFilterBookingsOnly(false); setFilterEnquiriesOnly(false)
              }}>Clear filters</Button>
            )}
          </div>
        </CardHeader>

        <Table columns={columns} data={filtered} loading={eLoading || tLoading} onRowClick={(e) => setDetailEnquiry(e)} />
      </Card>

      {/* ── New / Edit Enquiry Modal ────────────────────────────────────────── */}
      <Modal open={enquiryModal} onClose={() => setEnquiryModal(false)}
        title={editEnquiry ? `Edit — ${editEnquiry.enquiryId}` : 'New Enquiry'}
        size="xl">
        <form onSubmit={validateAndSubmitEnquiry} className="space-y-5">
          {formError && <Alert type="error" message={formError} />}

          {/* Agent */}
          <SectionTitle>Agent / Source</SectionTitle>
          <Select label="Agent / Source" required options={agentOptions} value={eForm.agentId}
            onChange={(e) => setEForm(f => ({ ...f, agentId: e.target.value }))}
            error={eErrors.agentId} placeholder="Select agent..." />
          {selectedAgent && (
            <p className="text-xs text-gray-500 -mt-2">
              Type: <span className="font-medium">
                {selectedAgent.agentType === 'other_business'
                  ? 'Business / Individual Agent — customer details optional'
                  : 'Direct — customer phone required'}
              </span>
            </p>
          )}

          {/* Customer */}
          <SectionTitle>
            Customer Details
            {isAgentBooking && <span className="ml-2 text-xs font-normal text-gray-400 normal-case">(optional for agent bookings)</span>}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label={`Customer Phone${isDirectAgent ? ' *' : ''}`}
                type="tel"
                value={eForm.customerPhone}
                onChange={(e) => setEForm(f => ({ ...f, customerPhone: e.target.value, customerId: '' }))}
                onFocus={() => setPhoneFieldFocused(true)}
                onBlur={() => setTimeout(() => setPhoneFieldFocused(false), 150)}
                error={eErrors.customerPhone}
                placeholder="Start typing to match..."
                autoComplete="off"
              />
              <CustomerMatchDropdown
                phone={eForm.customerPhone}
                customers={customers}
                visible={phoneFieldFocused}
                onSelect={(c) => setEForm(f => ({ ...f, customerId: c.id, customerName: c.name, customerPhone: c.phone }))}
              />
              {eForm.customerId && <p className="text-xs text-green-600 mt-1">✓ Linked to existing customer</p>}
            </div>
            <Input label="Customer Name" value={eForm.customerName}
              onChange={(e) => setEForm(f => ({ ...f, customerName: e.target.value }))} />
          </div>

          {/* Guest */}
          <SectionTitle>Travelling Guest <span className="text-xs font-normal text-gray-400 normal-case">(person actually travelling, if different from customer)</span></SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guest Name" value={eForm.guestName} onChange={(e) => setEForm(f => ({ ...f, guestName: e.target.value }))} />
            <Input label="Guest Phone" type="tel" value={eForm.guestPhone} onChange={(e) => setEForm(f => ({ ...f, guestPhone: e.target.value }))} />
            <Input label="Alternate Contact Name" value={eForm.alternateContactName} onChange={(e) => setEForm(f => ({ ...f, alternateContactName: e.target.value }))} />
            <Input label="Alternate Contact Phone" type="tel" value={eForm.alternateContactPhone} onChange={(e) => setEForm(f => ({ ...f, alternateContactPhone: e.target.value }))} />
          </div>

          {/* Trips */}
          <div className="pt-1">
            <InlineTripEditor
              trips={inlineTrips}
              onAdd={(trip) => setInlineTrips(t => [...t, trip])}
              onRemove={(i) => setInlineTrips(t => t.filter((_, idx) => idx !== i))}
              vehicles={vehicles}
              drivers={drivers}
            />
          </div>

          {/* Notes */}
          <SectionTitle>Notes & Quote</SectionTitle>
          <div className="grid grid-cols-1 gap-4">
            <Textarea label="Customer Requests" rows={2} value={eForm.customerRequests}
              onChange={(e) => setEForm(f => ({ ...f, customerRequests: e.target.value }))} />
            <Textarea label="Enquiry Quote / Message" rows={3} value={eForm.enquiryQuote}
              onChange={(e) => setEForm(f => ({ ...f, enquiryQuote: e.target.value }))} />
            <Textarea label="Internal Notes" rows={2} value={eForm.notes}
              onChange={(e) => setEForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {/* Convert to booking checkbox */}
          <div className="border border-blue-100 rounded-xl bg-blue-50/40 p-4">
            <Checkbox
              label="Convert to Booking"
              checked={convertToBooking}
              onChange={(e) => setConvertToBooking(e.target.checked)}
            />
            {convertToBooking && (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-blue-600">Fill booking details now (optional — can be done later via Edit)</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Pickup Date & Time" type="datetime-local" value={bookingFields.pickupDateTime}
                    onChange={(e) => setBookingFields(f => ({ ...f, pickupDateTime: e.target.value }))} />
                  <Input label="Pickup Location" value={bookingFields.pickupLocation}
                    onChange={(e) => setBookingFields(f => ({ ...f, pickupLocation: e.target.value }))} />
                  <Input label="Drop Location" value={bookingFields.dropLocation}
                    onChange={(e) => setBookingFields(f => ({ ...f, dropLocation: e.target.value }))} />
                  <Input label="Train / Flight No." value={bookingFields.trainFlightNumber}
                    onChange={(e) => setBookingFields(f => ({ ...f, trainFlightNumber: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Input label="Total Amount (₹)" type="number" value={bookingFields.totalAmount}
                    onChange={(e) => setBookingFields(f => ({ ...f, totalAmount: e.target.value }))} />
                  <Input label="Amount Received (₹)" type="number" value={bookingFields.amountReceived}
                    onChange={(e) => setBookingFields(f => ({ ...f, amountReceived: e.target.value }))} />
                  <Input label="Amount Pending (₹)" type="number" value={bookingFields.amountPending}
                    onChange={(e) => setBookingFields(f => ({ ...f, amountPending: e.target.value }))} />
                </div>
                <Textarea label="Booking Quote" rows={3} value={bookingFields.bookingQuote}
                  onChange={(e) => setBookingFields(f => ({ ...f, bookingQuote: e.target.value }))} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEnquiryModal(false)}>Cancel</Button>
            <Button type="submit" loading={savingEnquiry} variant={convertToBooking ? 'success' : 'primary'}>
              {editEnquiry
                ? 'Update Enquiry'
                : convertToBooking
                  ? `Confirm Booking${inlineTrips.length > 0 ? ` + ${inlineTrips.length} Trip${inlineTrips.length > 1 ? 's' : ''}` : ''}`
                  : `Create Enquiry${inlineTrips.length > 0 ? ` + ${inlineTrips.length} Trip${inlineTrips.length > 1 ? 's' : ''}` : ''}`
              }
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── No trip confirmation ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={noTripConfirm}
        onConfirm={() => doSaveEnquiry(pendingSubmitData)}
        onCancel={() => { setNoTripConfirm(false); setPendingSubmitData(null) }}
        title="No trips added"
        message="You haven't added any trips to this enquiry. Proceed without trips?"
        confirmLabel="Yes, proceed"
        variant="primary"
      />

      {/* ── Unsaved trip confirmation ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={unsavedTripConfirm}
        onConfirm={() => doSaveEnquiry(pendingSubmitData)}
        onCancel={() => { setUnsavedTripConfirm(false); setPendingSubmitData(null) }}
        title="Unsaved trip data"
        message="You have trip details entered but not added as a trip. Proceed without saving those trip details?"
        confirmLabel="Yes, discard trip data"
        variant="danger"
      />

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!detailEnquiry} onClose={() => setDetailEnquiry(null)}
        title={liveDetailEnquiry?.bookingId || liveDetailEnquiry?.enquiryId || 'Details'}
        size="2xl">
        {liveDetailEnquiry && (() => {
          const enquiryTrips = getEnquiryTrips(liveDetailEnquiry.enquiryId)
          const payments = getEnquiryPayments(liveDetailEnquiry.bookingId)
          const isConfirmed = !!liveDetailEnquiry.bookingId

          return (
            <div>
              {/* Status + Actions */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge className={BOOKING_STATUS_COLORS[liveDetailEnquiry.status] || 'bg-gray-100 text-gray-700'}>
                  {liveDetailEnquiry.status}
                </Badge>
                {/* Status picker inline */}
                <div className="flex gap-1 flex-wrap">
                  {BOOKING_STATUS_OPTIONS.map((s) => (
                    <button key={s} type="button"
                      onClick={() => doStatusUpdate(s)}
                      disabled={updatingStatus || liveDetailEnquiry.status === s}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-40
                        ${liveDetailEnquiry.status === s
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setDetailEnquiry(null); openEditEnquiry(liveDetailEnquiry) }}>
                  Edit
                </Button>
              </div>

              {/* Info */}
              <SectionTitle>Details</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4">
                <InfoRow label="Enquiry ID" value={liveDetailEnquiry.enquiryId} />
                <InfoRow label="Booking ID" value={liveDetailEnquiry.bookingId || '—'} />
                <InfoRow label="Customer" value={liveDetailEnquiry.customerName} />
                <InfoRow label="Customer Phone" value={liveDetailEnquiry.customerPhone} />
                {liveDetailEnquiry.guestName && <InfoRow label="Guest" value={`${liveDetailEnquiry.guestName}${liveDetailEnquiry.guestPhone ? ` · ${liveDetailEnquiry.guestPhone}` : ''}`} />}
                {liveDetailEnquiry.alternateContactName && <InfoRow label="Alt. Contact" value={`${liveDetailEnquiry.alternateContactName}${liveDetailEnquiry.alternateContactPhone ? ` · ${liveDetailEnquiry.alternateContactPhone}` : ''}`} />}
                <InfoRow label="Agent" value={agents.find(a => a.id === liveDetailEnquiry.agentId)?.name || '—'} />
                <InfoRow label="Pickup" value={formatDateTime(liveDetailEnquiry.pickupDateTime)} />
                <InfoRow label="Pickup Location" value={liveDetailEnquiry.pickupLocation} />
                <InfoRow label="Drop Location" value={liveDetailEnquiry.dropLocation} />
                <InfoRow label="Train/Flight" value={liveDetailEnquiry.trainFlightNumber} />
              </div>
              {liveDetailEnquiry.notes && <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3">{liveDetailEnquiry.notes}</div>}
              {liveDetailEnquiry.customerRequests && <div className="mt-2 text-sm text-gray-600 bg-yellow-50 rounded p-3">Requests: {liveDetailEnquiry.customerRequests}</div>}

              {/* Financials — always show if any value present */}
              {(liveDetailEnquiry.totalAmount || liveDetailEnquiry.amountReceived || liveDetailEnquiry.amountPending) && (
                <>
                  <SectionTitle>Financials</SectionTitle>
                  <div className="grid grid-cols-3 gap-4 mb-2">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600">Total</p>
                      <p className="text-lg font-bold text-blue-900">{formatCurrency(liveDetailEnquiry.totalAmount)}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600">Received</p>
                      <p className="text-lg font-bold text-green-900">{formatCurrency(liveDetailEnquiry.amountReceived)}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3">
                      <p className="text-xs text-yellow-600">Pending</p>
                      <p className="text-lg font-bold text-yellow-900">{formatCurrency(liveDetailEnquiry.amountPending)}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Trips */}
              <div className="flex items-center justify-between mt-4 mb-2">
                <SectionTitle>Trips ({enquiryTrips.length})</SectionTitle>
                <Button size="sm" variant="secondary" onClick={() => {
                  setTripForm(emptyTripForm())
                  setTripModal({ enquiryId: liveDetailEnquiry.enquiryId, bookingId: liveDetailEnquiry.bookingId, editTrip: null })
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
                            setTripModal({ enquiryId: liveDetailEnquiry.enquiryId, bookingId: liveDetailEnquiry.bookingId, editTrip: trip })
                          }}>Edit</Button>
                          <Button size="sm" variant="ghost" onClick={async () => { await softDeleteTrip(trip.id, user.username); await refetchTrips() }} className="text-red-500">Del</Button>
                        </div>
                      </div>
                      <div className="text-gray-500 mt-1">
                        {trip.pickupDateTime && <span>{formatDateTime(trip.pickupDateTime)} · </span>}
                        {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
                        {trip.allocatedDriverName && <span> · Driver: {trip.allocatedDriverName}</span>}
                        {trip.allocatedVehicleNumber && <span> · {trip.allocatedVehicleNumber}</span>}
                        {(trip.isVendorTrip === 'true' || trip.isVendorTrip === true) && <span className="ml-2 text-orange-600">(Vendor: {trip.vendorName})</span>}
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
                      setPaymentModal({ bookingId: liveDetailEnquiry.bookingId })
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
                            {p.tripId && <span className="text-xs text-blue-500 ml-2">· Trip tagged</span>}
                            {p.notes && <span className="text-gray-400 ml-2">· {p.notes}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {p.isVerified === 'true'
                              ? <Badge className="bg-green-100 text-green-700">Verified</Badge>
                              : isAdmin && <Button size="sm" variant="ghost" onClick={async () => { await verifyPayment(p.id, user.username); await refetchPayments() }} className="text-green-600">Verify</Button>
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Expenses */}
              <div className="flex items-center justify-between mt-4 mb-2">
                <SectionTitle>Expenses ({bookingExpenses.length})</SectionTitle>
                <Button size="sm" variant="secondary" onClick={() => {
                  // ExpenseForm handles trip selection + vehicle/driver auto-fill
                  setExpForm({ date: new Date().toISOString().split('T')[0] })
                  setExpenseTab('fuel')
                  setExpSavedCount(0)
                  setExpenseModal({
                    bookingId: liveDetailEnquiry.bookingId,
                    enquiryId: liveDetailEnquiry.enquiryId,
                  })
                }}>+ Add Expense</Button>
              </div>
              {bookingExpenses.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">No expenses recorded for this booking.</p>
              ) : (
                <div className="space-y-1">
                  {bookingExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-50 text-blue-700 text-xs">{exp._type}</Badge>
                        <span className="font-medium">{formatCurrency(exp.amount || exp.totalAmount)}</span>
                        {exp.stateName && <span className="text-gray-500">· {exp.stateName}</span>}
                        {exp.driverId && <span className="text-gray-400">· {drivers.find(d => d.id === exp.driverId)?.name || exp.driverId}</span>}
                        {exp.isNightCharge === 'true' && <Badge className="bg-indigo-50 text-indigo-600 text-xs">🌙</Badge>}
                        {exp.isAitpEvaluation === 'aitp' && <Badge className="bg-purple-50 text-purple-600 text-xs">AITP</Badge>}
                        <span className="text-gray-400">{formatDate(exp.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
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
            <Select label="Trip Type" required options={TRIP_TYPE_OPTIONS} value={tripForm.tripType} onChange={(e) => setTripForm(f => ({ ...f, tripType: e.target.value }))} />
            {tripForm.tripType === 'Delhi/NCR Local' && (
              <Select label="Local Sub-type" options={LOCAL_SUB_TYPE_OPTIONS} value={tripForm.localSubType} onChange={(e) => setTripForm(f => ({ ...f, localSubType: e.target.value }))} />
            )}
            <Select label="Vehicle Type" required options={VEHICLE_TYPE_OPTIONS} value={tripForm.vehicleType} onChange={(e) => setTripForm(f => ({ ...f, vehicleType: e.target.value }))} />
            <Input label="Start / Pickup Date" type="date" value={tripForm.startDate} onChange={(e) => setTripForm(f => ({ ...f, startDate: e.target.value }))} />
            <Input label="End Date" type="date" value={tripForm.endDate} onChange={(e) => setTripForm(f => ({ ...f, endDate: e.target.value }))} />
            <Input label="Travel Plan" value={tripForm.travelPlan} onChange={(e) => setTripForm(f => ({ ...f, travelPlan: e.target.value }))} />
            <Input label="Pickup Time" type="time" value={tripForm.pickupTime || (tripForm.pickupDateTime ? tripForm.pickupDateTime.split("T")[1]?.slice(0, 5) : "")} onChange={(e) => setTripForm(f => ({ ...f, pickupTime: e.target.value, pickupDateTime: f.startDate && e.target.value ? f.startDate + "T" + e.target.value : f.startDate || "" }))} />
            <Input label="Pickup Location" value={tripForm.pickupLocation} onChange={(e) => setTripForm(f => ({ ...f, pickupLocation: e.target.value }))} />
            <Input label="Drop Location" value={tripForm.dropLocation} onChange={(e) => setTripForm(f => ({ ...f, dropLocation: e.target.value }))} />
            <Input label="Train / Flight No." value={tripForm.trainFlightNumber} onChange={(e) => setTripForm(f => ({ ...f, trainFlightNumber: e.target.value }))} />
          </div>
          <SectionTitle>Vendor (if applicable)</SectionTitle>
          <Checkbox label="Vendor Trip" checked={tripForm.isVendorTrip === true || tripForm.isVendorTrip === 'true'} onChange={(e) => setTripForm(f => ({ ...f, isVendorTrip: e.target.checked }))} />
          {(tripForm.isVendorTrip === true || tripForm.isVendorTrip === 'true') && (
            <div className="grid grid-cols-3 gap-4">
              <Input label="Vendor Name" value={tripForm.vendorName} onChange={(e) => setTripForm(f => ({ ...f, vendorName: e.target.value }))} />
              <Input label="Vendor Phone" value={tripForm.vendorPhone} onChange={(e) => setTripForm(f => ({ ...f, vendorPhone: e.target.value }))} />
              <Input label="Our Commission" value={tripForm.vendorCommission} onChange={(e) => setTripForm(f => ({ ...f, vendorCommission: e.target.value }))} />
            </div>
          )}
          <SectionTitle>Vehicle Allocation</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Select label="From Fleet" options={vehicleOptions} value={tripForm.allocatedVehicleId} onChange={(e) => handleVehicleSelect(e.target.value, setTripForm)} placeholder="Select fleet vehicle..." />
            <Input label="Or Manual: Vehicle No." value={tripForm.allocatedVehicleNumber} onChange={(e) => setTripForm(f => ({ ...f, allocatedVehicleNumber: e.target.value }))} />
          </div>
          <SectionTitle>Driver Allocation</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Select label="From Driver List" options={driverOptions} value={tripForm.allocatedDriverId} onChange={(e) => handleDriverSelect(e.target.value, setTripForm)} placeholder="Select driver..." />
            <Input label="Or Manual: Driver Name" value={tripForm.allocatedDriverName} onChange={(e) => setTripForm(f => ({ ...f, allocatedDriverName: e.target.value }))} />
            <Input label="Driver Phone" value={tripForm.allocatedDriverPhone} onChange={(e) => setTripForm(f => ({ ...f, allocatedDriverPhone: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setTripModal(null)}>Cancel</Button>
            <Button type="submit" loading={savingTrip}>{tripModal?.editTrip ? 'Update Trip' : 'Add Trip'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Payment Modal ─────────────────────────────────────────────────────── */}
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
          {/* Tag to trip */}
          {paymentModal && (() => {
            const bookingTrips = trips.filter(t => t.bookingId === paymentModal.bookingId || t.enquiryId === paymentModal.bookingId)
            if (bookingTrips.length <= 1) return null
            return (
              <Select
                label="Tag to Trip (optional)"
                options={bookingTrips.map(t => ({ value: t.id, label: `${t.vehicleType} · ${t.tripType} · ${formatDate(t.startDate)}` }))}
                value={payForm.tripId}
                onChange={(e) => setPayForm(f => ({ ...f, tripId: e.target.value }))}
                placeholder="Not tagged to a specific trip"
              />
            )
          })()}
          <Input label="Notes" value={payForm.notes} onChange={(e) => setPayForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPaymentModal(null)}>Cancel</Button>
            <Button type="submit" loading={savingPayment}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* ── Expense Modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!expenseModal} onClose={() => { setExpenseModal(null); setExpSavedCount(0) }} title="Add Expense" size="xl">
        {expenseModal && (
          <form onSubmit={async (e) => {
            e.preventDefault()
            setFormError('')
            try { await saveExpense(expForm) } catch (err) { setFormError(err.message) }
          }} className="space-y-4">
            {formError && <Alert type="error" message={formError} />}
            {expSavedCount > 0 && (
              <Alert type="success" message={`${expSavedCount} expense${expSavedCount > 1 ? 's' : ''} saved. Add another or close.`} />
            )}

            {/* Expense type tabs */}
            <div className="flex flex-wrap gap-1 border-b border-gray-100 pb-3">
              {[
                { key: 'fuel', label: 'Fuel' },
                { key: 'toll', label: 'Toll' },
                { key: 'parking', label: 'Parking' },
                { key: 'allowance', label: 'Allowance' },
                { key: 'stateTax', label: 'State Tax' },
                { key: 'other', label: 'Other' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setExpenseTab(t.key)
                    // Keep vehicle+driver when switching tabs
                    setExpForm((prev) => ({
                      date: new Date().toISOString().split('T')[0],
                      vehicleId: prev.vehicleId,
                      driverId: prev.driverId,
                    }))
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${expenseTab === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <ExpenseForm
              tab={expenseTab}
              form={expForm}
              setForm={setExpForm}
              vehicles={vehicles}
              drivers={drivers}
              enquiries={enquiries}
              trips={trips}
              context="booking"
              bookingContext={expenseModal}
            />

            <div className="flex justify-between items-center pt-2">
              <Button type="button" variant="secondary" onClick={() => { setExpenseModal(null); setExpSavedCount(0) }}>
                {expSavedCount > 0 ? 'Done' : 'Cancel'}
              </Button>
              <Button type="submit" loading={savingExpense}>
                {['fuel', 'parking', 'stateTax'].includes(expenseTab) ? 'Save & Add Another' : 'Record Expense'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete confirm ────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Delete Enquiry"
        message={`Delete enquiry "${deleteTarget?.enquiryId}"? This uses soft delete — record will appear in the Deleted tab.`}
      />
    </div>
  )
}