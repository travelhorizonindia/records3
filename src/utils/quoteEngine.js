/**
 * quoteEngine.js
 * Generates WhatsApp-formatted booking quote text from trip + enquiry data.
 * Uses *bold*, _italic_, ~strikethrough~ WhatsApp markdown.
 */

import { TEMPLATE_KEYS, LOCAL_SUBTYPE_TO_TEMPLATE, resolveRates } from '../services/quoteConfigService.js'

const FOOTER = `We aim to deliver a safe, smooth, and premium travel experience. 😊
Ankush Yadav
https://travelhorizonindia.com
contact@travelhorizonindia.com`

const GARAGE_NOTE = 'Kilometers will be calculated from Delhi Airport to Delhi Airport (Garage to Garage)'

/** Format date as "DD Mon YYYY" */
function fmtDate(dateStr) {
    if (!dateStr) return ''
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    const d = isDateOnly
        ? (() => { const [y, m, day] = dateStr.split('-').map(Number); return new Date(y, m - 1, day) })()
        : new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Count calendar days inclusive (startDate to endDate) */
function countDays(startDate, endDate) {
    if (!startDate) return 1
    const end = endDate || startDate
    const s = new Date(startDate)
    const e = new Date(end)
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff + 1) // inclusive
}

/** Format ₹ amount */
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`

// ─── Template generators ──────────────────────────────────────────────────────

function localPackageQuote({ trip, rates }) {
    const { baseKm, baseHours, basePrice, extraKmRate, extraHourRate, driverNightCharge } = rates
    const dateStr = trip.startDate ? fmtDate(trip.startDate) : ''

    return `*Travel Horizon India - Booking Quote*
*Vehicle:* ${trip.vehicleType}
*Trip Type:* Local (Delhi/NCR)${dateStr ? `\n*Date:* ${dateStr}` : ''}
*Fare Structure:*
- ${baseKm} Km & ${baseHours} Hours: ${inr(basePrice)} (Base)
- Extra Km: ${inr(extraKmRate)}/km
- Extra Hour: ${inr(extraHourRate)}/hour
- Toll Tax & Parking: As per actuals
- Driver Night Charges: ${inr(driverNightCharge)}
  _(Only if used after 10PM)_
*Note:*
${GARAGE_NOTE}

${FOOTER}`
}

function outstationPerDayQuote({ trip, rates }) {
    const { perDayRate, kmPerDay, extraKmRate2 } = rates
    const days = countDays(trip.startDate, trip.endDate)
    const totalPrice = perDayRate * days
    const totalKm = kmPerDay * days
    const travelPlan = trip.travelPlan || ''

    const dateRange = trip.startDate
        ? (trip.endDate && trip.endDate !== trip.startDate
            ? `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`
            : fmtDate(trip.startDate))
        : ''

    return `*Travel Horizon India - Booking Quote*
*Vehicle:* ${trip.vehicleType}
*Trip Type:* Outstation${dateRange ? `\n*Dates:* ${dateRange}` : ''}${travelPlan ? `\n${travelPlan}` : ''}
*Charges:* ${inr(perDayRate)} per day all-inclusive
_(For ${days} day${days > 1 ? 's' : ''}: ${inr(totalPrice)} total)_
Includes:
- Vehicle charges
- Fuel
- Driver allowance
- Toll tax, parking & state taxes
- Total ${totalKm} km for ${days} day${days > 1 ? 's' : ''}
*Note:*
- ${GARAGE_NOTE}
- Extra km beyond the total limit, or extension in trip days, will be charged as per actuals
- ${inr(extraKmRate2)}/extra km (Beyond ${totalKm} km)

${FOOTER}`
}

function outstationCustomTotalQuote({ trip }) {
    const travelPlan = trip.travelPlan || ''
    const dateRange = trip.startDate
        ? (trip.endDate && trip.endDate !== trip.startDate
            ? `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`
            : fmtDate(trip.startDate))
        : ''

    return `*Travel Horizon India - Booking Quote*
*Vehicle:* ${trip.vehicleType}
*Trip Type:* Outstation${dateRange ? `\n*Dates:* ${dateRange}` : ''}${travelPlan ? `\n${travelPlan}` : ''}
*Charges:* ₹_____ all-inclusive
Includes:
- Vehicle charges
- Fuel
- Driver allowance
- Toll tax, parking & state taxes
*Note:*
- ${GARAGE_NOTE}
- Extension in trip days will be charged as per actuals

${FOOTER}`
}

function outstationPerKmQuote({ trip, rates }) {
    const { perKmRate, driverAllowancePerDay } = rates
    const travelPlan = trip.travelPlan || ''
    const dateRange = trip.startDate
        ? (trip.endDate && trip.endDate !== trip.startDate
            ? `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`
            : fmtDate(trip.startDate))
        : ''

    return `*Travel Horizon India - Booking Quote*
*Vehicle:* ${trip.vehicleType}
*Trip Type:* Outstation${dateRange ? `\n*Dates:* ${dateRange}` : ''}${travelPlan ? `\n${travelPlan}` : ''}
*Charges:*
- ${inr(perKmRate)}/km
- Driver allowance: ${inr(driverAllowancePerDay)}/day
- State tax, Toll tax and parking as actuals
*Note:*
- ${GARAGE_NOTE}
- Minimum 250km chargeable per day

${FOOTER}`
}

function localOutstationMixedQuote({ trips }) {
    const localTrip = trips.find((t) => t.tripType === 'Delhi/NCR Local')
    const outstationTrip = trips.find((t) => t.tripType === 'Outstation')

    const dateRange = (() => {
        const all = trips.filter((t) => t.startDate).map((t) => t.startDate)
        if (!all.length) return ''
        const min = all.reduce((a, b) => a < b ? a : b)
        const maxEndDates = trips.filter((t) => t.endDate).map((t) => t.endDate)
        const max = maxEndDates.length ? maxEndDates.reduce((a, b) => a > b ? a : b) : min
        return min === max ? fmtDate(min) : `${fmtDate(min)} – ${fmtDate(max)}`
    })()

    return `*Travel Horizon India - Booking Quote*
*Vehicle:* ${trips[0]?.vehicleType || ''}
*Trip Type:* Outstation + Local (Delhi/NCR)${dateRange ? `\n*Dates:* ${dateRange}` : ''}

*Outstation Charges:* ₹_____ all-inclusive
Includes: Vehicle charges, Fuel, Driver allowance, Toll tax, parking & state taxes

*Local Usage Charges:*${localTrip?.localSubType ? ` (${localTrip.localSubType} package)` : ''}
- Base Fare: ₹_____
- Extra Km: ₹_____/km
- Extra Hour: ₹_____/hour
- Toll Tax & Parking: As per actuals
- Driver Night Charges: ₹_____
  _(Only if used after 10PM)_

*Note:*
- ${GARAGE_NOTE}
- Local and outstation usage is calculated separately
- Extension in trip days will be charged as per actuals

${FOOTER}`
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Detect best template key from trip(s).
 * Returns { templateKey, confidence: 'auto' | 'manual' }
 */
export function detectTemplate(trips) {
    if (!trips || trips.length === 0) return { templateKey: TEMPLATE_KEYS.OUTSTATION_CUSTOM, confidence: 'manual' }

    const hasLocal = trips.some((t) => t.tripType === 'Delhi/NCR Local')
    const hasOutstation = trips.some((t) => t.tripType === 'Outstation')

    if (hasLocal && hasOutstation) return { templateKey: TEMPLATE_KEYS.LOCAL_OUTSTATION_MIXED, confidence: 'auto' }

    if (hasLocal) {
        const subType = trips.find((t) => t.tripType === 'Delhi/NCR Local')?.localSubType
        const key = LOCAL_SUBTYPE_TO_TEMPLATE[subType]
        return key
            ? { templateKey: key, confidence: 'auto' }
            : { templateKey: TEMPLATE_KEYS.LOCAL_80, confidence: 'manual' }
    }

    // Outstation — default to per-day
    return { templateKey: TEMPLATE_KEYS.OUTSTATION_PER_DAY, confidence: 'auto' }
}

/**
 * Generate quote text.
 * @param {object} params
 * @param {object} params.enquiry  - enquiry/booking record
 * @param {Array}  params.trips    - trip records for this booking
 * @param {string} params.templateKey - which template to use
 * @param {Array}  params.configRows  - QuoteConfig sheet rows for rate overrides
 */
export function generateQuote({ enquiry, trips, templateKey, configRows = [] }) {
    const primaryTrip = trips[0] || {}
    const vehicleType = primaryTrip.vehicleType || ''
    const rates = resolveRates(vehicleType, templateKey, configRows)

    switch (templateKey) {
        case TEMPLATE_KEYS.LOCAL_40:
        case TEMPLATE_KEYS.LOCAL_80:
        case TEMPLATE_KEYS.LOCAL_120:
            return localPackageQuote({ trip: primaryTrip, rates })

        case TEMPLATE_KEYS.OUTSTATION_PER_DAY:
            return outstationPerDayQuote({ trip: primaryTrip, rates })

        case TEMPLATE_KEYS.OUTSTATION_CUSTOM:
            return outstationCustomTotalQuote({ trip: primaryTrip })

        case TEMPLATE_KEYS.OUTSTATION_PER_KM:
            return outstationPerKmQuote({ trip: primaryTrip, rates })

        case TEMPLATE_KEYS.LOCAL_OUTSTATION_MIXED:
            return localOutstationMixedQuote({ trips })

        default:
            return outstationCustomTotalQuote({ trip: primaryTrip })
    }
}