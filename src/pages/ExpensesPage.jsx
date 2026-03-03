import { useState, useMemo, useCallback, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useAsync, useAsyncCallback } from '../hooks/useAsync.js'
import {
  driverAllowanceService, tollExpenseService, parkingExpenseService,
  stateTaxExpenseService, fuelExpenseService, vehicleMaintenanceService,
  driverSalaryService, businessExpenseService, otherExpenseService,
} from '../services/expenseService.js'
import { getVehicles } from '../services/vehicleService.js'
import { getDrivers } from '../services/driverService.js'
import { getEnquiries } from '../services/enquiryService.js'
import { getTrips } from '../services/tripService.js'
import {
  Button, Input, Select, Modal, Table, Card, CardHeader,
  PageHeader, Badge, Alert, Tabs, SectionTitle, Checkbox,
} from '../components/ui/index.jsx'
import { PAYMENT_MODE_OPTIONS, BUSINESS_EXPENSE_CATEGORY_OPTIONS } from '../constants/index.js'
import { formatDate, formatCurrency, generateId } from '../utils/index.js'

// ─── Indian States ────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
].map((s) => ({ value: s, label: s }))

// ─── Salary month options (rolling 24 months back + 3 ahead) ─────────────────
const SALARY_MONTH_OPTIONS = (() => {
  const opts = []
  const now = new Date()
  for (let i = -24; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    opts.push({ value, label })
  }
  return opts.reverse()
})()

// ─── Current month default ────────────────────────────────────────────────────
const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const today = () => new Date().toISOString().split('T')[0]

// ─── Tab config ───────────────────────────────────────────────────────────────
const EXPENSE_TABS = [
  { key: 'fuel', label: 'Fuel' },
  { key: 'toll', label: 'Toll' },
  { key: 'parking', label: 'Parking' },
  { key: 'allowance', label: 'Driver Allowance' },
  { key: 'stateTax', label: 'State Tax' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'salary', label: 'Driver Salary' },
  { key: 'business', label: 'Business' },
  { key: 'other', label: 'Other' },
]

// Tabs that stay open after saving (multi-add)
const MULTI_ADD_TABS = new Set(['fuel', 'parking', 'stateTax'])

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get all active trips for a booking — trips link via bookingId OR enquiryId. */
function getTripsForBooking(bookingId, enquiries, trips) {
  if (!bookingId) return []
  const enquiry = enquiries.find((e) => e.bookingId === bookingId)
  const enquiryId = enquiry?.enquiryId
  return trips.filter(
    (t) => t.isDeleted !== 'true' && (
      t.bookingId === bookingId ||
      t.enquiryId === enquiryId ||
      t.enquiryId === bookingId
    )
  )
}

/** Get trips for a raw enquiry/booking context (either id). */
function getTripsForContext(bookingId, enquiryId, allTrips) {
  return allTrips.filter(
    (t) => t.isDeleted !== 'true' && (
      t.bookingId === bookingId ||
      t.enquiryId === enquiryId ||
      t.enquiryId === bookingId
    )
  )
}

/** Human-readable label for a trip dropdown option. */
function tripLabel(trip) {
  const parts = [trip.vehicleType, trip.tripType]
  if (trip.startDate) parts.push(trip.startDate)
  if (trip.allocatedVehicleNumber) parts.push(trip.allocatedVehicleNumber)
  if (trip.allocatedDriverName) parts.push(trip.allocatedDriverName)
  return parts.filter(Boolean).join(' · ')
}

// ─── IsPaid / PaidDate helper row ────────────────────────────────────────────
function IsPaidRow({ form, setForm }) {
  return (
    <div className="col-span-2 border-t border-gray-100 pt-3 mt-1">
      <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 font-medium mb-2">
        <input
          type="checkbox"
          className="rounded border-gray-300 text-green-600 w-4 h-4"
          checked={!!form.isPaid}
          onChange={(e) => setForm((f) => ({
            ...f,
            isPaid: e.target.checked,
            paidDate: e.target.checked ? (f.paidDate || today()) : '',
          }))}
        />
        Mark as Paid
      </label>
      {form.isPaid && (
        <Input
          label="Payment Date"
          type="date"
          required
          value={form.paidDate || ''}
          onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
          className="max-w-xs"
        />
      )}
    </div>
  )
}

// ─── Parking entries inline list ─────────────────────────────────────────────
function ParkingEntriesList({ entries, onChange }) {
  const [entryForm, setEntryForm] = useState({ amount: '', notes: '', date: today() })

  const add = () => {
    if (!entryForm.amount) return
    const updated = [...entries, { ...entryForm, id: generateId() }]
    onChange(updated)
    setEntryForm({ amount: '', notes: '', date: today() })
  }

  const remove = (id) => onChange(entries.filter((e) => e.id !== id))

  const total = entries.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

  return (
    <div className="col-span-2">
      <SectionTitle>Individual Parking Entries</SectionTitle>
      {entries.length > 0 && (
        <div className="space-y-1 mb-3">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500">{e.date}</span>
              <span className="font-medium">{formatCurrency(e.amount)}</span>
              <span className="text-gray-400 truncate max-w-[120px]">{e.notes || '—'}</span>
              <button type="button" onClick={() => remove(e.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Remove</button>
            </div>
          ))}
          <div className="flex justify-end pr-2 text-sm font-semibold text-gray-700">
            Total: {formatCurrency(total)}
          </div>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <Input label="Date" type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} className="w-36" />
        <Input label="Amount (₹)" type="number" value={entryForm.amount} onChange={(e) => setEntryForm((f) => ({ ...f, amount: e.target.value }))} className="w-28" />
        <Input label="Notes" value={entryForm.notes} onChange={(e) => setEntryForm((f) => ({ ...f, notes: e.target.value }))} className="flex-1" />
        <Button type="button" size="sm" variant="secondary" onClick={add} disabled={!entryForm.amount} className="mb-0.5">+ Add</Button>
      </div>
      <p className="text-xs text-gray-400 mt-1">Adding individual entries auto-calculates Total Amount above. Or you can just enter a Total Amount directly without individual entries.</p>
    </div>
  )
}

// ─── Expense Form (used both in ExpensesPage modal AND in EnquiriesPage popup) ─
/**
 * Props:
 *   tab          : expense type key
 *   form, setForm: controlled form state
 *   vehicles, drivers, enquiries, trips: master data
 *   context      : 'page' | 'booking'
 *     - 'booking': trip selector is shown first; vehicle+driver auto-fill from trip
 *     - 'page'   : booking selector shown; selecting booking loads its trips for tripId
 *   bookingContext: { bookingId, enquiryId } — provided when context='booking'
 */
export function ExpenseForm({ tab, form, setForm, vehicles, drivers, enquiries = [], trips = [], context = 'page', bookingContext = null }) {
  const vehicleOptions = vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} – ${v.seater}` }))
  const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.phone})` }))
  const bookingOptions = enquiries.filter((e) => e.bookingId)
    .map((e) => ({ value: e.bookingId, label: `${e.bookingId} – ${e.customerName || e.customerPhone || ''}` }))

  const [parkingEntries, setParkingEntries] = useState(form._parkingEntries || [])

  // Trips available for the current booking context
  const contextTrips = useMemo(() => {
    if (context === 'booking' && bookingContext) {
      return getTripsForContext(bookingContext.bookingId, bookingContext.enquiryId, trips)
    }
    if (context === 'page' && form.bookingId) {
      return getTripsForBooking(form.bookingId, enquiries, trips)
    }
    return []
  }, [context, bookingContext, form.bookingId, trips, enquiries])

  const tripOptions = contextTrips.map((t) => ({ value: t.id, label: tripLabel(t) }))

  // When a trip is selected, auto-fill vehicle + driver from that trip
  const handleTripSelect = useCallback((tripId) => {
    const trip = trips.find((t) => t.id === tripId)
    setForm((f) => ({
      ...f,
      tripId,
      vehicleId: trip?.allocatedVehicleId || f.vehicleId,
      driverId: trip?.allocatedDriverId || f.driverId,
    }))
  }, [trips, setForm])

  // When booking is selected on page context, load trips and auto-select if only 1
  const handleBookingSelect = useCallback((bookingId) => {
    setForm((f) => ({ ...f, bookingId, tripId: '', vehicleId: '', driverId: '' }))
    // auto-select will be triggered by contextTrips effect below
  }, [setForm])

  // Auto-select trip if only one available (both contexts)
  useEffect(() => {
    if (contextTrips.length === 1 && !form.tripId) {
      handleTripSelect(contextTrips[0].id)
    }
  }, [contextTrips]) // intentionally only on contextTrips change

  // Sync parking entries total → form.totalAmount
  useEffect(() => {
    if (tab !== 'parking') return
    if (parkingEntries.length > 0) {
      const total = parkingEntries.reduce((s, e) => s + parseFloat(e.amount || 0), 0)
      setForm((f) => ({ ...f, totalAmount: String(total), _parkingEntries: parkingEntries }))
    } else {
      setForm((f) => ({ ...f, _parkingEntries: [] }))
    }
  }, [parkingEntries, tab, setForm])

  // Auto-calc allowance total
  useEffect(() => {
    if (tab !== 'allowance') return
    const perDay = parseFloat(form.amountPerDay || 0)
    const days = parseFloat(form.numberOfDays || 0)
    if (perDay && days) {
      setForm((f) => ({ ...f, totalAmount: String(perDay * days) }))
    }
  }, [form.amountPerDay, form.numberOfDays, tab, setForm])

  const f = (key, type = 'text') => ({
    value: form[key] ?? '',
    onChange: (e) => setForm((prev) => ({ ...prev, [key]: e.target.value })),
    type,
  })

  // Trip selector — shown for all trip-linked expense types
  // Required when trips are available; vehicle+driver auto-fill on selection
  const TRIP_LINKED_TABS = ['fuel', 'toll', 'parking', 'allowance', 'stateTax']
  const TripSelect = () => {
    if (!TRIP_LINKED_TABS.includes(tab)) return null
    if (context === 'page' && !form.bookingId) return null // no booking selected yet on page
    if (contextTrips.length === 0) return (
      <div className="col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-700">
        No trips found for this booking. Add a trip first before recording expenses.
      </div>
    )
    return (
      <div className="col-span-2">
        <Select
          label="Trip *"
          required
          options={tripOptions}
          value={form.tripId || ''}
          onChange={(e) => handleTripSelect(e.target.value)}
          placeholder={contextTrips.length === 1 ? tripLabel(contextTrips[0]) : 'Select trip...'}
        />
        {contextTrips.length === 1 && (
          <p className="text-xs text-green-600 mt-1">✓ Only one trip — auto-selected</p>
        )}
      </div>
    )
  }

  // Vehicle + driver block — values come from trip auto-fill, still editable
  const VehicleDriverBlock = ({ driverRequired = true }) => (
    <>
      <Select
        label={`Vehicle${driverRequired ? ' *' : ''}`}
        required={driverRequired}
        options={vehicleOptions}
        value={form.vehicleId || ''}
        onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
        placeholder="Select vehicle..."
      />
      {driverRequired && (
        <Select
          label="Driver *"
          required
          options={driverOptions}
          value={form.driverId || ''}
          onChange={(e) => setForm((prev) => ({ ...prev, driverId: e.target.value }))}
          placeholder="Select driver..."
        />
      )}
    </>
  )

  // Booking selector (page context only)
  const BookingSelect = ({ required = false }) => {
    if (context === 'booking') return null
    return (
      <Select
        label={`Booking${required ? ' *' : ' (optional)'}`}
        required={required}
        options={bookingOptions}
        value={form.bookingId || ''}
        onChange={(e) => handleBookingSelect(e.target.value)}
        placeholder={required ? 'Select booking...' : 'Link to booking...'}
      />
    )
  }

  switch (tab) {
    case 'fuel':
      return (
        <div className="grid grid-cols-2 gap-4">
          <BookingSelect />
          <TripSelect />
          <Input label="Date *" required {...f('date', 'date')} />
          <div /> {/* spacer */}
          <VehicleDriverBlock />
          <Input label="Amount (₹) *" required {...f('amount', 'number')} />
          <Input label="Odometer Reading (km)" {...f('odometer', 'number')} />
          <Input label="Notes" {...f('notes')} />
        </div>
      )

    case 'toll':
      return (
        <div className="grid grid-cols-2 gap-4">
          <BookingSelect />
          <TripSelect />
          <VehicleDriverBlock />
          <Input label="Total Amount (₹) *" required {...f('totalAmount', 'number')} />
          <Input label="Notes" {...f('notes')} />
        </div>
      )

    case 'parking':
      return (
        <div className="grid grid-cols-2 gap-4">
          <BookingSelect />
          <TripSelect />
          <VehicleDriverBlock />
          <Input label="Total Amount (₹)" {...f('totalAmount', 'number')} />
          <Input label="Notes" {...f('notes')} />
          <ParkingEntriesList entries={parkingEntries} onChange={setParkingEntries} />
        </div>
      )

    case 'allowance':
      return (
        <div className="grid grid-cols-2 gap-4">
          <BookingSelect />
          <TripSelect />
          <VehicleDriverBlock />
          <Input label="Amount Per Day (₹) *" required {...f('amountPerDay', 'number')} />
          <Input label="Number of Days *" required {...f('numberOfDays', 'number')} />
          <Input
            label="Total Amount (₹)"
            type="number"
            value={form.totalAmount || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
            helpText="Auto-calculated but editable"
          />
          <Input label="Notes" {...f('notes')} />
          <div className="col-span-2 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-orange-500 w-4 h-4"
                checked={!!form.isNightCharge}
                onChange={(e) => setForm((prev) => ({ ...prev, isNightCharge: e.target.checked }))}
              />
              <span>
                Night Charge
                <span className="text-gray-400 font-normal ml-1 text-xs">(allowance for night local usage, not travel)</span>
              </span>
            </label>
          </div>
          <IsPaidRow form={form} setForm={setForm} />
        </div>
      )

    case 'stateTax': {
      const aitpValue = form.isAitpEvaluation  // 'paid' | 'aitp' | undefined
      return (
        <div className="grid grid-cols-2 gap-4">
          <BookingSelect />
          <TripSelect />
          <Select
            label="Vehicle *"
            required
            options={vehicleOptions}
            value={form.vehicleId || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
            placeholder="Select vehicle..."
          />
          <Select
            label="State *"
            required
            options={INDIAN_STATES}
            value={form.stateName || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, stateName: e.target.value }))}
            placeholder="Select state..."
          />
          <Input label="Date *" required {...f('date', 'date')} />
          <Input label="Amount (₹) *" required {...f('amount', 'number')} />
          <Input label="Notes" {...f('notes')} />
          {/* AITP — radio, no default, required */}
          <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-amber-800 mb-2">
              Payment Status <span className="text-red-500">*</span>
            </p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  name={`aitp-${context}`}
                  value="paid"
                  checked={aitpValue === 'paid'}
                  onChange={() => setForm((prev) => ({ ...prev, isAitpEvaluation: 'paid' }))}
                  required
                  className="text-green-600 w-4 h-4"
                />
                <span className="font-medium text-green-700">Actually Paid</span>
                <span className="text-gray-400 text-xs">— real tax payment made</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio"
                  name={`aitp-${context}`}
                  value="aitp"
                  checked={aitpValue === 'aitp'}
                  onChange={() => setForm((prev) => ({ ...prev, isAitpEvaluation: 'aitp' }))}
                  className="text-purple-600 w-4 h-4"
                />
                <span className="font-medium text-purple-700">AITP Evaluation Only</span>
                <span className="text-gray-400 text-xs">— not actually paid</span>
              </label>
            </div>
            {!aitpValue && (
              <p className="text-xs text-red-500 mt-1">You must select one before saving.</p>
            )}
          </div>
        </div>
      )
    }

    case 'maintenance':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date *" required {...f('date', 'date')} />
          <Select
            label="Vehicle *"
            required
            options={vehicleOptions}
            value={form.vehicleId || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, vehicleId: e.target.value }))}
            placeholder="Select vehicle..."
          />
          <Input label="Amount (₹) *" required {...f('amount', 'number')} />
          <Input label="Description *" required {...f('description')} />
          <Input label="Notes" {...f('notes')} className="col-span-2" />
        </div>
      )

    case 'salary':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Driver *"
            required
            options={driverOptions}
            value={form.driverId || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, driverId: e.target.value }))}
            placeholder="Select driver..."
          />
          <Select
            label="Salary Month *"
            required
            options={SALARY_MONTH_OPTIONS}
            value={form.salaryMonth || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, salaryMonth: e.target.value }))}
            placeholder="Select month..."
          />
          <Input label="Amount (₹) *" required {...f('amount', 'number')} />
          <Select
            label="Payment Mode *"
            required
            options={PAYMENT_MODE_OPTIONS}
            value={form.mode || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value }))}
            placeholder="Select mode..."
          />
          <Input label="Notes" {...f('notes')} />
          <IsPaidRow form={form} setForm={setForm} />
          <p className="col-span-2 text-xs text-blue-600 bg-blue-50 rounded p-2">
            Salary Month is used for Profit &amp; Loss reporting. Payment Date can differ — e.g. January salary paid in February.
          </p>
        </div>
      )

    case 'business':
      return (
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Expense Month *"
            required
            options={SALARY_MONTH_OPTIONS}
            value={form.expenseMonth || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, expenseMonth: e.target.value }))}
            placeholder="Month for P&L..."
          />
          <Input label="Date *" required {...f('date', 'date')} />
          <Select
            label="Category *"
            required
            options={BUSINESS_EXPENSE_CATEGORY_OPTIONS}
            value={form.category || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            placeholder="Select category..."
          />
          <Input label="Amount (₹) *" required {...f('amount', 'number')} />
          <Input label="Description *" required {...f('description')} />
          <Input label="Notes" {...f('notes')} />
          <IsPaidRow form={form} setForm={setForm} />
          <p className="col-span-2 text-xs text-blue-600 bg-blue-50 rounded p-2">
            Expense Month is for P&L — e.g. January office rent attributed to January even if paid in February.
          </p>
        </div>
      )

    case 'other':
      return (
        <div className="grid grid-cols-2 gap-4">
          {context === 'page' && <BookingSelect />}
          <Input label="Date *" required {...f('date', 'date')} />
          <Input label="Category *" required {...f('category')} placeholder="e.g. Printing, Refreshments..." />
          <Input label="Amount (₹) *" required {...f('amount', 'number')} />
          <Input label="Notes" {...f('notes')} className="col-span-2" />
          <IsPaidRow form={form} setForm={setForm} />
        </div>
      )

    default:
      return null
  }
}

// ─── Expense service map ──────────────────────────────────────────────────────
const TAB_SERVICE = {
  fuel: fuelExpenseService,
  toll: tollExpenseService,
  parking: parkingExpenseService,
  allowance: driverAllowanceService,
  stateTax: stateTaxExpenseService,
  maintenance: vehicleMaintenanceService,
  salary: driverSalaryService,
  business: businessExpenseService,
  other: otherExpenseService,
}

// ─── Validation ───────────────────────────────────────────────────────────────
export function validateExpenseForm(tab, form) {
  // State tax: must pick AITP radio
  if (tab === 'stateTax' && !form.isAitpEvaluation) {
    return 'Please select whether this is Actually Paid or AITP Evaluation Only.'
  }
  // Parking: must have either totalAmount or at least one entry
  if (tab === 'parking' && !form.totalAmount && (!form._parkingEntries || form._parkingEntries.length === 0)) {
    return 'Please enter a Total Amount or add at least one parking entry.'
  }
  // Vehicle required for types that need it
  const needsVehicle = ['fuel', 'toll', 'parking', 'allowance', 'stateTax', 'maintenance']
  if (needsVehicle.includes(tab) && !form.vehicleId) return 'Vehicle is required.'
  // Driver required (except stateTax, maintenance)
  const needsDriver = ['fuel', 'toll', 'parking', 'allowance']
  if (needsDriver.includes(tab) && !form.driverId) return 'Driver is required.'
  return null
}

// ─── Clean form before save (strip internal keys) ────────────────────────────
export function cleanForm(tab, form) {
  const { _parkingEntries, ...rest } = form
  if (tab === 'parking' && _parkingEntries?.length > 0) {
    rest.parkingEntries = JSON.stringify(_parkingEntries)
  }
  return rest
}

// ─── Default form per tab ────────────────────────────────────────────────────
function defaultForm(tab) {
  const base = { date: today() }
  if (tab === 'salary') return { ...base, salaryMonth: currentMonth() }
  if (tab === 'business') return { ...base, expenseMonth: currentMonth() }
  return base
}

// ─── ExpensesPage ─────────────────────────────────────────────────────────────
export default function ExpensesPage() {
  const { user, isAdmin } = useAuth()
  const [tab, setTab] = useState('fuel')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [savedCount, setSavedCount] = useState(0)    // tracks how many saved in multi-add session

  const { data: vehicles = [] } = useAsync(getVehicles)
  const { data: drivers = [] } = useAsync(getDrivers)
  const { data: enquiries = [] } = useAsync(getEnquiries)
  const { data: trips = [] } = useAsync(getTrips)

  const { data: fuelData = [], loading: fLoading, refetch: refetchFuel } = useAsync(fuelExpenseService.getAll)
  const { data: tollData = [], loading: tlLoading, refetch: refetchToll } = useAsync(tollExpenseService.getAll)
  const { data: parkingData = [], loading: pkLoading, refetch: refetchParking } = useAsync(parkingExpenseService.getAll)
  const { data: allowanceData = [], loading: alLoading, refetch: refetchAllowance } = useAsync(driverAllowanceService.getAll)
  const { data: stateTaxData = [], loading: stLoading, refetch: refetchStateTax } = useAsync(stateTaxExpenseService.getAll)
  const { data: maintenanceData = [], loading: mLoading, refetch: refetchMaintenance } = useAsync(vehicleMaintenanceService.getAll)
  const { data: salaryData = [], loading: slLoading, refetch: refetchSalary } = useAsync(driverSalaryService.getAll)
  const { data: businessData = [], loading: bLoading, refetch: refetchBusiness } = useAsync(businessExpenseService.getAll)
  const { data: otherData = [], loading: otLoading, refetch: refetchOther } = useAsync(otherExpenseService.getAll)

  const TAB_DATA = {
    fuel: { data: fuelData, loading: fLoading, refetch: refetchFuel },
    toll: { data: tollData, loading: tlLoading, refetch: refetchToll },
    parking: { data: parkingData, loading: pkLoading, refetch: refetchParking },
    allowance: { data: allowanceData, loading: alLoading, refetch: refetchAllowance },
    stateTax: { data: stateTaxData, loading: stLoading, refetch: refetchStateTax },
    maintenance: { data: maintenanceData, loading: mLoading, refetch: refetchMaintenance },
    salary: { data: salaryData, loading: slLoading, refetch: refetchSalary },
    business: { data: businessData, loading: bLoading, refetch: refetchBusiness },
    other: { data: otherData, loading: otLoading, refetch: refetchOther },
  }

  const current = TAB_DATA[tab]

  // ── Save ──────────────────────────────────────────────────────────────────
  const [save, { loading: saving }] = useAsyncCallback(
    useCallback(async (f) => {
      const err = validateExpenseForm(tab, f)
      if (err) { setFormError(err); return }
      setFormError('')
      const cleaned = cleanForm(tab, f)
      await TAB_SERVICE[tab].create(cleaned, user.username)
      await current.refetch()
      setSavedCount((n) => n + 1)

      if (MULTI_ADD_TABS.has(tab)) {
        // Stay open: reset form but keep booking/vehicle/driver context
        setForm((prev) => ({
          ...defaultForm(tab),
          bookingId: prev.bookingId,
          vehicleId: prev.vehicleId,
          driverId: prev.driverId,
        }))
        setSuccessMsg(`Saved! (${savedCount + 1} entries this session)`)
        setTimeout(() => setSuccessMsg(''), 2000)
      } else {
        setModalOpen(false)
        setSuccessMsg('Expense recorded.')
        setTimeout(() => setSuccessMsg(''), 3000)
      }
    }, [tab, current, user.username, savedCount])
  )

  const handleVerify = useCallback(async (id) => {
    await TAB_SERVICE[tab].verify(id, user.username)
    await current.refetch()
  }, [tab, current, user.username])

  const handleDelete = useCallback(async (id) => {
    await TAB_SERVICE[tab].softDelete(id, user.username)
    await current.refetch()
  }, [tab, current, user.username])

  const openAdd = () => {
    setForm(defaultForm(tab))
    setFormError('')
    setSavedCount(0)
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await save(form)
  }

  // ── Column definitions ────────────────────────────────────────────────────
  const vehicleName = (id) => vehicles.find((v) => v.id === id)?.registrationNumber || id || '—'
  const driverName = (id) => drivers.find((d) => d.id === id)?.name || id || '—'

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

  const isPaidCol = {
    key: 'isPaid', label: 'Paid',
    render: (row) => row.isPaid === 'true'
      ? <Badge className="bg-green-100 text-green-700">{formatDate(row.paidDate) || 'Paid'}</Badge>
      : <Badge className="bg-yellow-100 text-yellow-700">Unpaid</Badge>,
  }

  const delCol = {
    key: 'del', label: '',
    render: (row) => isAdmin && (
      <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(row.id) }}>Del</Button>
    ),
  }

  const getColumns = () => {
    switch (tab) {
      case 'fuel': return [
        { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
        { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicleName(r.vehicleId) },
        { key: 'driverId', label: 'Driver', render: (r) => driverName(r.driverId) },
        { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
        { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
        { key: 'odometer', label: 'Odometer', render: (r) => r.odometer ? `${r.odometer} km` : '—' },
        { key: 'notes', label: 'Notes' },
        verifyCol,
      ]
      case 'toll': return [
        { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicleName(r.vehicleId) },
        { key: 'driverId', label: 'Driver', render: (r) => driverName(r.driverId) },
        { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
        { key: 'totalAmount', label: 'Amount', render: (r) => formatCurrency(r.totalAmount) },
        { key: 'notes', label: 'Notes' },
        verifyCol,
      ]
      case 'parking': return [
        { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicleName(r.vehicleId) },
        { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
        { key: 'totalAmount', label: 'Total', render: (r) => formatCurrency(r.totalAmount) },
        {
          key: 'entries', label: 'Entries', render: (r) => {
            try { const e = JSON.parse(r.parkingEntries || '[]'); return e.length > 0 ? `${e.length} entries` : '—' } catch { return '—' }
          }
        },
        { key: 'notes', label: 'Notes' },
        verifyCol,
      ]
      case 'allowance': return [
        { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicleName(r.vehicleId) },
        { key: 'driverId', label: 'Driver', render: (r) => driverName(r.driverId) },
        { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
        { key: 'amountPerDay', label: '₹/Day', render: (r) => formatCurrency(r.amountPerDay) },
        { key: 'numberOfDays', label: 'Days' },
        { key: 'totalAmount', label: 'Total', render: (r) => formatCurrency(r.totalAmount) },
        { key: 'isNightCharge', label: 'Night', render: (r) => r.isNightCharge === 'true' ? <Badge className="bg-indigo-100 text-indigo-700">🌙 Night</Badge> : '—' },
        isPaidCol,
        verifyCol,
      ]
      case 'stateTax': return [
        { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
        { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicleName(r.vehicleId) },
        { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
        { key: 'stateName', label: 'State' },
        { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
        {
          key: 'isAitpEvaluation', label: 'Type', render: (r) => r.isAitpEvaluation === 'aitp'
            ? <Badge className="bg-purple-100 text-purple-700">AITP Eval</Badge>
            : <Badge className="bg-green-100 text-green-700">Paid</Badge>
        },
        verifyCol,
      ]
      case 'maintenance': return [
        { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
        { key: 'vehicleId', label: 'Vehicle', render: (r) => vehicleName(r.vehicleId) },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
        { key: 'notes', label: 'Notes' },
        verifyCol,
      ]
      case 'salary': return [
        {
          key: 'salaryMonth', label: 'Salary Month', render: (r) => {
            if (!r.salaryMonth) return formatDate(r.date)
            const [y, m] = r.salaryMonth.split('-')
            return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
          }
        },
        { key: 'driverId', label: 'Driver', render: (r) => driverName(r.driverId) },
        { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
        { key: 'mode', label: 'Mode' },
        { key: 'paidDate', label: 'Paid On', render: (r) => r.isPaid === 'true' ? formatDate(r.paidDate) : '—' },
        isPaidCol,
        { key: 'notes', label: 'Notes' },
        delCol,
      ]
      case 'business': return [
        {
          key: 'expenseMonth', label: 'Month', render: (r) => {
            if (!r.expenseMonth) return formatDate(r.date)
            const [y, m] = r.expenseMonth.split('-')
            return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
          }
        },
        { key: 'date', label: 'Paid On', render: (r) => formatDate(r.date) },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
        { key: 'description', label: 'Description' },
        isPaidCol,
        delCol,
      ]
      case 'other': return [
        { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
        { key: 'bookingId', label: 'Booking', render: (r) => r.bookingId || '—' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
        { key: 'notes', label: 'Notes' },
        isPaidCol,
        delCol,
      ]
      default: return []
    }
  }

  const tabLabel = EXPENSE_TABS.find((t) => t.key === tab)?.label || tab

  return (
    <div>
      <PageHeader
        title="Expenses"
        actions={<Button onClick={openAdd}>+ Record {tabLabel} Expense</Button>}
      />
      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

      <Card className="mt-4">
        <CardHeader>
          <Tabs tabs={EXPENSE_TABS} active={tab} onChange={(t) => { setTab(t); setSavedCount(0) }} />
        </CardHeader>
        <Table
          columns={getColumns()}
          data={current.data.filter((r) => r.isDeleted !== 'true')}
          loading={current.loading}
          emptyText={`No ${tabLabel} expenses recorded.`}
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Record ${tabLabel} Expense`}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert type="error" message={formError} />}
          {savedCount > 0 && MULTI_ADD_TABS.has(tab) && (
            <Alert type="success" message={`${savedCount} ${tabLabel} expense${savedCount > 1 ? 's' : ''} saved this session. Add another or close.`} />
          )}
          <ExpenseForm
            tab={tab}
            form={form}
            setForm={setForm}
            vehicles={vehicles}
            drivers={drivers}
            enquiries={enquiries}
            trips={trips}
            context="page"
          />
          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {savedCount > 0 ? 'Done' : 'Cancel'}
            </Button>
            <Button type="submit" loading={saving}>
              {MULTI_ADD_TABS.has(tab) ? 'Save & Add Another' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}