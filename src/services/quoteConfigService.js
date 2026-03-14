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

// ─── Fallback vehicle list ────────────────────────────────────────────────────
// Shown in vehicle type dropdowns when the QuoteConfig sheet has no data yet.
// Once any vehicle type exists in the sheet, the sheet list takes over entirely.
export const DEFAULT_VEHICLE_SEED = [
    'Maruti Dzire',
    'Innova Crysta (6+1)',
    'Innova Crysta (7+1)',
    'Force Traveller (12+1)',
    'Force Urbania (16+1)',
]

/**
 * Resolve rates for a given vehicle + template from sheet data only.
 * Returns empty object if no sheet row exists — no hardcoded defaults.
 * configRows = array from quoteConfigService.getAll()
 */
export function resolveRates(vehicleType, templateKey, configRows = []) {
    const row = configRows.find((r) => r.vehicleType === vehicleType && r.templateKey === templateKey)
    if (!row) return {}
    // Extract only numeric rate fields (skip meta fields and empty values)
    const META_KEYS = new Set(['id', 'vehicleType', 'templateKey', 'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'tollParkingNote', 'notes'])
    const rates = {}
    for (const [k, v] of Object.entries(row)) {
        if (!META_KEYS.has(k) && v !== '' && v !== null && v !== undefined) {
            rates[k] = parseFloat(v) || v
        }
    }
    return rates
}