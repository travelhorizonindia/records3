import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import { getEnquiries, createEnquiry, updateEnquiry, confirmBooking, softDeleteEnquiry } from '../services/enquiryService.js'
import { getTrips, createTrip, updateTrip, softDeleteTrip } from '../services/tripService.js'
import { getAgents } from '../services/agentService.js'
import { getCustomers, createCustomer } from '../services/customerService.js'
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

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Enquiry', label: 'Enquiry' },
  { key: 'Upcoming', label: 'Upcoming' },
  { key: 'Ongoing', label: 'Ongoing' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
]

const emptyEnquiryForm = () => ({
  customerPhone: '', customerName: '', agentId: '', status: 'Enquiry',
})

const emptyTripForm = () => ({
  tripType: '', localSubType: '', vehicleType: '',
  startDate: '', endDate: '', travelPlan: '',
  isVendorTrip: false, vendorName: '', vendorPhone: '', vendorCommission: '',
  pickupDateTime: '', pickupLocation: '', dropLocation: '',
  allocatedVehicleId: '', allocatedVehicleNumber: '', allocatedVehicleType: '', allocatedVehicleSeating: '',
  allocatedDriverId: '', allocatedDriverName: '', allocatedDriverPhone: '',
  totalAmount: '', amountReceived: '', amountPending: '',
  notes: '', customerRequests: '', trainFlightNumber: '',
})

const emptyBookingForm = () => ({
  customerName: '', customerId: '',
  pickupDateTime: '', pickupLocation: '', dropLocation: '',
  trainFlightNumber: '', customerRequests: '', notes: '',
  enquiryQuote: '', bookingQuote: '',
  totalAmount: '', amountReceived: '', amountPending: '',
  agentId: '',
})

const emptyPaymentForm = () => ({
  amount: '', mode: '', receivedBy: '', paymentDate: '', notes: '', tripId: '', bookingId: '',
})

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
  const [enquiryModal, setEnquiryModal] = useState(false)
  const [editEnquiry, setEditEnquiry] = useState(null)
  const [detailEnquiry, setDetailEnquiry] = useState(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [tripModal, setTripModal] = useState(null) // { enquiryId, bookingId, editTrip }
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null) // { enquiryId, bookingId }
  const [statusModal, setStatusModal] = useState(null)

  const [eForm, setEForm] = useState(emptyEnquiryForm())
  const [bForm, setBForm] = useState(emptyBookingForm())
  const [tripForm, setTripForm] = useState(emptyTripForm())
  const [payForm, setPayForm] = useState(emptyPaymentForm())
  const [eErrors, setEErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const agentOptions = agents.map((a) => ({ value: a.id, label: a.name }))
  const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.name} (${c.phone})` }))
  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} - ${v.seater}` }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return enquiries
      .filter((e) => tab === 'all' || e.status === tab)
      .filter(
        (e) =>
          e.enquiryId?.toLowerCase().includes(q) ||
          e.customerName?.toLowerCase().includes(q) ||
          e.customerPhone?.toLowerCase().includes(q) ||
          e.bookingId?.toLowerCase().includes(q)
      )
  }, [enquiries, tab, search])

  const tabsWithCounts = STATUS_TABS.map((t) => ({
    ...t,
    count: t.key === 'all' ? enquiries.length : enquiries.filter((e) => e.status === t.key).length,
  }))

  // ─── Save Enquiry ────────────────────────────────────────────────────────────
  const [saveEnquiry, { loading: savingEnquiry }] = useAsyncCallback(
    useCallback(async (f) => {
      if (editEnquiry) {
        await updateEnquiry(editEnquiry.enquiryId, f, user.username)
      } else {
        await createEnquiry(f, user.username)
      }
      await refetchEnquiries()
      setEnquiryModal(false)
      setSuccessMsg(editEnquiry ? 'Enquiry updated.' : 'Enquiry created.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [editEnquiry, user.username, refetchEnquiries])
  )

  // ─── Confirm Booking ─────────────────────────────────────────────────────────
  const [doConfirm, { loading: confirming }] = useAsyncCallback(
    useCallback(async (f) => {
      // Optionally create a new customer record if not selected
      let customerId = f.customerId
      if (!customerId && f.customerName && f.customerPhone) {
        const existing = customers.find((c) => c.phone === f.customerPhone)
        if (existing) {
          customerId = existing.id
        } else {
          const res = await createCustomer({ name: f.customerName, phone: f.customerPhone }, user.username)
          customerId = res.data?.id
          await refetchCustomers()
        }
      }

      await confirmBooking(detailEnquiry.enquiryId, { ...f, customerId }, user.username)
      await refetchEnquiries()
      setConfirmModal(false)
      setDetailEnquiry(null)
      setSuccessMsg('Booking confirmed!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }, [detailEnquiry, customers, user.username, refetchEnquiries, refetchCustomers])
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
  const getEnquiryTrips = useCallback((enquiryId) => trips.filter((t) => t.enquiryId === enquiryId || t.bookingId === enquiryId), [trips])
  const getEnquiryPayments = useCallback((bookingId) => allPayments.filter((p) => p.bookingId === bookingId), [allPayments])

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

  const columns = [
    { key: 'enquiryId', label: 'Enquiry ID' },
    { key: 'bookingId', label: 'Booking ID', render: (e) => e.bookingId || '—' },
    {
      key: 'customer', label: 'Customer',
      render: (e) => (
        <div>
          <p className="font-medium">{e.customerName || '—'}</p>
          <p className="text-xs text-gray-400">{e.customerPhone}</p>
        </div>
      ),
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
          <Button size="sm" variant="ghost" onClick={() => {
            setEditEnquiry(e)
            setEForm({ customerPhone: e.customerPhone, customerName: e.customerName, agentId: e.agentId, status: e.status })
            setEErrors({})
            setFormError('')
            setEnquiryModal(true)
          }}>Edit</Button>
          {isAdmin && <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(e)} className="text-red-500">Del</Button>}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Enquiries & Bookings"
        subtitle={`${enquiries.length} total records`}
        actions={
          <Button onClick={() => { setEditEnquiry(null); setEForm(emptyEnquiryForm()); setEErrors({}); setFormError(''); setEnquiryModal(true) }}>
            + New Enquiry
          </Button>
        }
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

      {/* ── Enquiry Create/Edit Modal ── */}
      <Modal open={enquiryModal} onClose={() => setEnquiryModal(false)} title={editEnquiry ? 'Edit Enquiry' : 'New Enquiry'} size="md">
        <form onSubmit={async (e) => {
          e.preventDefault()
          const err = {}
          if (!eForm.customerPhone.trim()) err.customerPhone = 'Required'
          if (!eForm.agentId) err.agentId = 'Required'
          if (Object.keys(err).length) { setEErrors(err); return }
          setFormError('')
          try { await saveEnquiry(eForm) } catch (err) { setFormError(err.message) }
        }} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <Input label="Customer Phone" required value={eForm.customerPhone} onChange={(e) => setEForm(f => ({ ...f, customerPhone: e.target.value }))} error={eErrors.customerPhone} />
          <Input label="Customer Name" value={eForm.customerName} onChange={(e) => setEForm(f => ({ ...f, customerName: e.target.value }))} />
          <Select label="Agent / Source" required options={agentOptions} value={eForm.agentId} onChange={(e) => setEForm(f => ({ ...f, agentId: e.target.value }))} error={eErrors.agentId} />
          {editEnquiry && (
            <Select label="Status" options={BOOKING_STATUS_OPTIONS} value={eForm.status} onChange={(e) => setEForm(f => ({ ...f, status: e.target.value }))} />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEnquiryModal(false)}>Cancel</Button>
            <Button type="submit" loading={savingEnquiry}>{editEnquiry ? 'Update' : 'Create Enquiry'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Detail / Booking Modal ── */}
      <Modal open={!!detailEnquiry} onClose={() => setDetailEnquiry(null)} title={detailEnquiry?.bookingId || detailEnquiry?.enquiryId || 'Details'} size="2xl">
        {detailEnquiry && (() => {
          const enquiryTrips = getEnquiryTrips(detailEnquiry.enquiryId)
          const payments = getEnquiryPayments(detailEnquiry.bookingId)
          const isConfirmed = !!detailEnquiry.bookingId

          return (
            <div>
              {/* Status + Quick Actions */}
              <div className="flex items-center gap-3 mb-4">
                <Badge className={BOOKING_STATUS_COLORS[detailEnquiry.status] || ''}>{detailEnquiry.status}</Badge>
                <Button size="sm" variant="secondary" onClick={() => {
                  setStatusModal({ enquiryId: detailEnquiry.enquiryId, currentStatus: detailEnquiry.status })
                }}>Change Status</Button>
                {!isConfirmed && (
                  <Button size="sm" variant="primary" onClick={() => {
                    setBForm({
                      ...emptyBookingForm(),
                      customerName: detailEnquiry.customerName,
                      customerPhone: detailEnquiry.customerPhone,
                      agentId: detailEnquiry.agentId,
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
                <InfoRow label="Phone" value={detailEnquiry.customerPhone} />
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

      {/* ── Confirm Booking Modal ── */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Booking" size="xl">
        <form onSubmit={async (e) => {
          e.preventDefault()
          setFormError('')
          try { await doConfirm(bForm) } catch (err) { setFormError(err.message) }
        }} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          <SectionTitle>Customer Details</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Name" required value={bForm.customerName} onChange={(e) => setBForm(f => ({ ...f, customerName: e.target.value }))} />
            <Select label="Existing Customer" options={customerOptions} value={bForm.customerId} onChange={(e) => {
              const c = customers.find(c => c.id === e.target.value)
              setBForm(f => ({ ...f, customerId: e.target.value, customerName: c?.name || f.customerName }))
            }} placeholder="Search existing..." />
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

      {/* ── Trip Modal ── */}
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

      {/* ── Payment Modal ── */}
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

      {/* ── Status Modal ── */}
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
