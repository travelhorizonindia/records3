import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

export const quoteConfigService = {
    getAll: async () => {
        const { data } = await api.getAll('QuoteConfig')
        return data.filter((r) => r.isDeleted !== 'true')
    },
    create: async (data, username) => {
        const record = { id: generateId(), ...data, ...getCreateMeta(username) }
        return api.create('QuoteConfig', record)
    },
    update: async (id, updates, username) => {
        return api.update('QuoteConfig', { id, ...updates, ...getUpdateMeta(username) })
    },
    softDelete: async (id, username) => {
        return api.update('QuoteConfig', { id, isDeleted: 'true', ...getUpdateMeta(username) })
    },
}

// ─── Template keys ────────────────────────────────────────────────────────────
export const TEMPLATE_KEYS = {
    LOCAL_40: 'local_40km_4hr',
    LOCAL_80: 'local_80km_8hr',
    LOCAL_120: 'local_120km_12hr',
    OUTSTATION_PER_DAY: 'outstation_per_day',
    OUTSTATION_CUSTOM: 'outstation_custom',
    OUTSTATION_PER_KM: 'outstation_per_km',
    LOCAL_OUTSTATION_MIXED: 'local_outstation_mixed',
}

export const TEMPLATE_LABELS = {
    [TEMPLATE_KEYS.LOCAL_40]: 'Local – 40km & 4 Hours',
    [TEMPLATE_KEYS.LOCAL_80]: 'Local – 80km & 8 Hours',
    [TEMPLATE_KEYS.LOCAL_120]: 'Local – 120km & 12 Hours',
    [TEMPLATE_KEYS.OUTSTATION_PER_DAY]: 'Outstation – Per Day Package',
    [TEMPLATE_KEYS.OUTSTATION_CUSTOM]: 'Outstation – Custom Total',
    [TEMPLATE_KEYS.OUTSTATION_PER_KM]: 'Outstation – Per KM',
    [TEMPLATE_KEYS.LOCAL_OUTSTATION_MIXED]: 'Local + Outstation Mixed',
}

// Maps localSubType string → template key
export const LOCAL_SUBTYPE_TO_TEMPLATE = {
    '40km & 4 Hours': TEMPLATE_KEYS.LOCAL_40,
    '80km & 8 Hours': TEMPLATE_KEYS.LOCAL_80,
    '120km & 12 Hours': TEMPLATE_KEYS.LOCAL_120,
}

// ─── Default rates (fallback if not in sheet) ─────────────────────────────────
export const DEFAULT_RATES = {
    // vehicleType → templateKey → rate fields
    'Maruti Dzire': {
        [TEMPLATE_KEYS.LOCAL_40]: { baseKm: 40, baseHours: 4, basePrice: 1800, extraKmRate: 14, extraHourRate: 150, driverNightCharge: 300 },
        [TEMPLATE_KEYS.LOCAL_80]: { baseKm: 80, baseHours: 8, basePrice: 2500, extraKmRate: 14, extraHourRate: 150, driverNightCharge: 300 },
        [TEMPLATE_KEYS.LOCAL_120]: { baseKm: 120, baseHours: 12, basePrice: 3500, extraKmRate: 14, extraHourRate: 150, driverNightCharge: 300 },
        [TEMPLATE_KEYS.OUTSTATION_PER_DAY]: { perDayRate: 4500, kmPerDay: 250, extraKmRate2: 14 },
        [TEMPLATE_KEYS.OUTSTATION_PER_KM]: { perKmRate: 14, driverAllowancePerDay: 300 },
    },
    'Innova Crysta': {
        [TEMPLATE_KEYS.LOCAL_40]: { baseKm: 40, baseHours: 4, basePrice: 2500, extraKmRate: 20, extraHourRate: 300, driverNightCharge: 300 },
        [TEMPLATE_KEYS.LOCAL_80]: { baseKm: 80, baseHours: 8, basePrice: 3500, extraKmRate: 20, extraHourRate: 300, driverNightCharge: 300 },
        [TEMPLATE_KEYS.LOCAL_120]: { baseKm: 120, baseHours: 12, basePrice: 5000, extraKmRate: 20, extraHourRate: 300, driverNightCharge: 300 },
        [TEMPLATE_KEYS.OUTSTATION_PER_DAY]: { perDayRate: 6000, kmPerDay: 250, extraKmRate2: 20 },
        [TEMPLATE_KEYS.OUTSTATION_PER_KM]: { perKmRate: 20, driverAllowancePerDay: 300 },
    },
    'Force Traveller 12+1': {
        [TEMPLATE_KEYS.LOCAL_40]: { baseKm: 40, baseHours: 4, basePrice: 4000, extraKmRate: 28, extraHourRate: 500, driverNightCharge: 500 },
        [TEMPLATE_KEYS.LOCAL_80]: { baseKm: 80, baseHours: 8, basePrice: 6500, extraKmRate: 28, extraHourRate: 500, driverNightCharge: 500 },
        [TEMPLATE_KEYS.LOCAL_120]: { baseKm: 120, baseHours: 12, basePrice: 9000, extraKmRate: 28, extraHourRate: 500, driverNightCharge: 500 },
        [TEMPLATE_KEYS.OUTSTATION_PER_DAY]: { perDayRate: 9000, kmPerDay: 250, extraKmRate2: 28 },
        [TEMPLATE_KEYS.OUTSTATION_PER_KM]: { perKmRate: 28, driverAllowancePerDay: 500 },
    },
    'Force Urbania 16+1': {
        [TEMPLATE_KEYS.LOCAL_40]: { baseKm: 40, baseHours: 4, basePrice: 5000, extraKmRate: 35, extraHourRate: 500, driverNightCharge: 500 },
        [TEMPLATE_KEYS.LOCAL_80]: { baseKm: 80, baseHours: 8, basePrice: 7500, extraKmRate: 35, extraHourRate: 500, driverNightCharge: 500 },
        [TEMPLATE_KEYS.LOCAL_120]: { baseKm: 120, baseHours: 12, basePrice: 10500, extraKmRate: 35, extraHourRate: 500, driverNightCharge: 500 },
        [TEMPLATE_KEYS.OUTSTATION_PER_DAY]: { perDayRate: 10000, kmPerDay: 250, extraKmRate2: 35 },
        [TEMPLATE_KEYS.OUTSTATION_PER_KM]: { perKmRate: 35, driverAllowancePerDay: 500 },
    },
}

/**
 * Resolve rates for a given vehicle + template, merging sheet config over defaults.
 * configRows = array from quoteConfigService.getAll()
 */
export function resolveRates(vehicleType, templateKey, configRows = []) {
    const defaults = DEFAULT_RATES[vehicleType]?.[templateKey] || {}
    const row = configRows.find((r) => r.vehicleType === vehicleType && r.templateKey === templateKey)
    if (!row) return defaults
    // Sheet values override defaults (skip empty strings)
    const overrides = {}
    for (const [k, v] of Object.entries(row)) {
        if (v !== '' && v !== null && v !== undefined && !['id', 'vehicleType', 'templateKey', 'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'tollParkingNote', 'notes'].includes(k)) {
            overrides[k] = parseFloat(v) || v
        }
    }
    return { ...defaults, ...overrides }
}