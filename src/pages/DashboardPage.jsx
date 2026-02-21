import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../hooks/useAsync.js'
import { getVehicles } from '../services/vehicleService.js'
import { getTrips } from '../services/tripService.js'
import { getEnquiries } from '../services/enquiryService.js'
import { getPayments } from '../services/paymentService.js'
import { StatCard, Card, CardHeader, CardBody, Badge } from '../components/ui/index.jsx'
import { BOOKING_STATUS_COLORS } from '../constants/index.js'
import { formatDate, formatDateTime, formatCurrency, daysUntil, isToday, isWithinNextDays } from '../utils/index.js'

const DOC_FIELDS = [
  { label: 'Insurance', toField: 'insuranceToDate' },
  { label: 'Pollution', toField: 'pollutionToDate' },
  { label: 'Fitness', toField: 'fitnessToDate' },
  { label: 'Authorization', toField: 'authorizationToDate' },
  { label: 'State Tax', toField: 'stateTaxToDate' },
  { label: 'AITP', toField: 'aitpToDate' },
]

export default function DashboardPage() {
  const { data: vehicles = [], loading: vLoading } = useAsync(getVehicles)
  const { data: trips = [], loading: tLoading } = useAsync(getTrips)
  const { data: enquiries = [], loading: eLoading } = useAsync(getEnquiries)
  const { data: payments = [], loading: pLoading } = useAsync(getPayments)

  const loading = vLoading || tLoading || eLoading || pLoading

  const todaysTrips = useMemo(
    () => trips.filter((t) => t.pickupDateTime && isToday(t.pickupDateTime)),
    [trips]
  )

  const upcomingTrips = useMemo(
    () =>
      trips.filter((t) => {
        if (!t.pickupDateTime || isToday(t.pickupDateTime)) return false
        return isWithinNextDays(t.pickupDateTime, 7)
      }),
    [trips]
  )

  const ongoingTrips = useMemo(
    () => trips.filter((t) => {
      const booking = enquiries.find((e) => e.bookingId === t.bookingId || e.enquiryId === t.enquiryId)
      return booking?.status === 'Ongoing'
    }),
    [trips, enquiries]
  )

  const recentEnquiries = useMemo(
    () => [...enquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10),
    [enquiries]
  )

  const pendingPaymentsTotal = useMemo(
    () =>
      enquiries
        .filter((e) => !['Cancelled'].includes(e.status))
        .reduce((sum, e) => sum + (parseFloat(e.amountPending) || 0), 0),
    [enquiries]
  )

  const docWarnings = useMemo(() => {
    const warnings = []
    vehicles.forEach((v) => {
      DOC_FIELDS.forEach(({ label, toField }) => {
        const days = daysUntil(v[toField])
        if (days !== null && days <= 30) {
          warnings.push({
            reg: v.registrationNumber,
            doc: label,
            date: v[toField],
            days,
          })
        }
      })
    })
    return warnings.sort((a, b) => a.days - b.days)
  }, [vehicles])

  // Current month revenue
  const currentMonthRevenue = useMemo(() => {
    const now = new Date()
    return payments
      .filter((p) => {
        if (!p.paymentDate) return false
        const d = new Date(p.paymentDate)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  }, [payments])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="animate-spin h-8 w-8 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Loading dashboard...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Trips" value={todaysTrips.length} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard label="Upcoming (7 days)" value={upcomingTrips.length} color="purple"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Pending Payments" value={formatCurrency(pendingPaymentsTotal)} color="yellow"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Revenue This Month" value={formatCurrency(currentMonthRevenue)} color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Trips */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Today's Trips</h2></CardHeader>
          <CardBody className="p-0">
            {todaysTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No trips scheduled today</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {todaysTrips.map((trip) => {
                  const booking = enquiries.find((e) => e.bookingId === trip.bookingId)
                  return (
                    <div key={trip.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{booking?.customerName || booking?.customerPhone || '—'}</p>
                          <p className="text-xs text-gray-500">{trip.vehicleType} · {trip.pickupLocation || '—'}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(trip.pickupDateTime)}</p>
                        </div>
                        <p className="text-xs text-gray-500">{trip.allocatedDriverName || 'No driver'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Upcoming Trips */}
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-900">Upcoming Trips (Next 7 Days)</h2></CardHeader>
          <CardBody className="p-0">
            {upcomingTrips.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No upcoming trips</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingTrips.slice(0, 8).map((trip) => {
                  const booking = enquiries.find((e) => e.bookingId === trip.bookingId)
                  return (
                    <div key={trip.id} className="px-5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{booking?.customerName || booking?.customerPhone || '—'}</p>
                          <p className="text-xs text-gray-500">{trip.vehicleType} · {trip.tripType}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(trip.pickupDateTime)}</p>
                        </div>
                        <Badge className={BOOKING_STATUS_COLORS[booking?.status] || 'bg-gray-100 text-gray-700'}>
                          {booking?.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Enquiries */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Enquiries</h2>
            <Link to="/enquiries" className="text-xs text-blue-600 hover:underline">View all</Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentEnquiries.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">No enquiries yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentEnquiries.map((e) => (
                  <div key={e.enquiryId} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.enquiryId}</p>
                      <p className="text-xs text-gray-500">{e.customerName || e.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={BOOKING_STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-700'}>{e.status}</Badge>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(e.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Document Expiry Warnings */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">
              Document Expiry Warnings
              {docWarnings.length > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{docWarnings.length}</span>
              )}
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {docWarnings.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">✅ All documents are valid</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {docWarnings.map((w, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{w.reg}</p>
                      <p className="text-xs text-gray-500">{w.doc} · Expires {formatDate(w.date)}</p>
                    </div>
                    <Badge className={w.days < 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                      {w.days < 0 ? `Expired ${Math.abs(w.days)}d ago` : `${w.days}d left`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
