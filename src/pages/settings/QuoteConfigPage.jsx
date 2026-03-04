import { useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import {
    quoteConfigService, TEMPLATE_KEYS, TEMPLATE_LABELS, DEFAULT_RATES,
} from '../../services/quoteConfigService.js'
import {
    Button, Card, CardHeader, PageHeader, Alert, SectionTitle, Input, Tabs,
} from '../../components/ui/index.jsx'
import { VEHICLE_TYPE_OPTIONS } from '../../constants/index.js'
import { generateId } from '../../utils/index.js'

const LOCAL_TEMPLATES = [TEMPLATE_KEYS.LOCAL_40, TEMPLATE_KEYS.LOCAL_80, TEMPLATE_KEYS.LOCAL_120]
const OUTSTATION_TEMPLATES = [
    TEMPLATE_KEYS.OUTSTATION_PER_DAY,
    TEMPLATE_KEYS.OUTSTATION_PER_KM,
]

const VEHICLE_TABS = VEHICLE_TYPE_OPTIONS.map((v) => ({ key: v, label: v }))

// Field definitions per template type
const LOCAL_FIELDS = [
    { key: 'basePrice', label: 'Base Price (₹)', type: 'number' },
    { key: 'extraKmRate', label: 'Extra KM Rate (₹/km)', type: 'number' },
    { key: 'extraHourRate', label: 'Extra Hour Rate (₹/hr)', type: 'number' },
    { key: 'driverNightCharge', label: 'Night Charge (₹)', type: 'number' },
]
const OUTSTATION_PER_DAY_FIELDS = [
    { key: 'perDayRate', label: 'Per Day Rate (₹)', type: 'number' },
    { key: 'kmPerDay', label: 'KM Per Day', type: 'number' },
    { key: 'extraKmRate2', label: 'Extra KM Rate (₹/km)', type: 'number' },
]
const OUTSTATION_PER_KM_FIELDS = [
    { key: 'perKmRate', label: 'Per KM Rate (₹/km)', type: 'number' },
    { key: 'driverAllowancePerDay', label: 'Driver Allowance (₹/day)', type: 'number' },
]

function fieldsForTemplate(tk) {
    if (LOCAL_TEMPLATES.includes(tk)) return LOCAL_FIELDS
    if (tk === TEMPLATE_KEYS.OUTSTATION_PER_DAY) return OUTSTATION_PER_DAY_FIELDS
    if (tk === TEMPLATE_KEYS.OUTSTATION_PER_KM) return OUTSTATION_PER_KM_FIELDS
    return []
}

// ─── Single rate row ──────────────────────────────────────────────────────────
function RateRow({ vehicleType, templateKey, configRows, onSave, saving }) {
    const defaults = DEFAULT_RATES[vehicleType]?.[templateKey] || {}
    const existing = configRows.find((r) => r.vehicleType === vehicleType && r.templateKey === templateKey)
    const fields = fieldsForTemplate(templateKey)

    const [vals, setVals] = useState(() => {
        const base = {}
        for (const f of fields) {
            base[f.key] = existing?.[f.key] ?? defaults[f.key] ?? ''
        }
        return base
    })
    const [dirty, setDirty] = useState(false)

    const set = (key, val) => { setVals((v) => ({ ...v, [key]: val })); setDirty(true) }

    if (fields.length === 0) return null

    return (
        <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">{TEMPLATE_LABELS[templateKey]}</p>
                {existing
                    ? <span className="text-xs text-green-600 bg-green-50 rounded px-2 py-0.5">Custom rates saved</span>
                    : <span className="text-xs text-gray-400 bg-gray-50 rounded px-2 py-0.5">Using defaults</span>
                }
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {fields.map((f) => (
                    <Input
                        key={f.key}
                        label={f.label}
                        type={f.type}
                        value={vals[f.key]}
                        onChange={(e) => set(f.key, e.target.value)}
                        placeholder={String(defaults[f.key] || '')}
                    />
                ))}
            </div>
            <div className="flex justify-end mt-3 gap-2">
                {dirty && (
                    <Button
                        size="sm"
                        loading={saving}
                        onClick={() => { onSave(vehicleType, templateKey, vals, existing?.id); setDirty(false) }}
                    >
                        Save Rates
                    </Button>
                )}
                {existing && (
                    <Button size="sm" variant="ghost" className="text-gray-400 text-xs"
                        onClick={() => {
                            setVals(() => {
                                const base = {}
                                for (const f of fields) base[f.key] = defaults[f.key] ?? ''
                                return base
                            })
                            setDirty(true)
                        }}>
                        Reset to defaults
                    </Button>
                )}
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QuoteConfigPage() {
    const { user } = useAuth()
    const { data: configRows = [], refetch } = useAsync(quoteConfigService.getAll)
    const [activeVehicle, setActiveVehicle] = useState(VEHICLE_TYPE_OPTIONS[0])
    const [saving, setSaving] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')

    const handleSave = useCallback(async (vehicleType, templateKey, vals, existingId) => {
        setSaving(true)
        try {
            const payload = { vehicleType, templateKey, ...vals }
            if (existingId) {
                await quoteConfigService.update(existingId, payload, user.username)
            } else {
                await quoteConfigService.create(payload, user.username)
            }
            await refetch()
            setSuccessMsg('Rates saved.')
            setTimeout(() => setSuccessMsg(''), 3000)
        } finally {
            setSaving(false)
        }
    }, [user.username, refetch])

    const relevantTemplates = [
        ...LOCAL_TEMPLATES,
        TEMPLATE_KEYS.OUTSTATION_PER_DAY,
        TEMPLATE_KEYS.OUTSTATION_PER_KM,
    ]

    return (
        <div>
            <PageHeader
                title="Quote Configuration"
                subtitle="Set rates per vehicle type. Leave blank to use built-in defaults."
            />
            {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}

            <Card className="mt-4">
                <CardHeader>
                    <Tabs tabs={VEHICLE_TABS} active={activeVehicle} onChange={setActiveVehicle} />
                </CardHeader>
                <div className="p-4 space-y-3">
                    <SectionTitle>Local Packages</SectionTitle>
                    {LOCAL_TEMPLATES.map((tk) => (
                        <RateRow key={tk}
                            vehicleType={activeVehicle}
                            templateKey={tk}
                            configRows={configRows}
                            onSave={handleSave}
                            saving={saving}
                        />
                    ))}

                    <SectionTitle className="mt-6">Outstation Packages</SectionTitle>
                    {[TEMPLATE_KEYS.OUTSTATION_PER_DAY, TEMPLATE_KEYS.OUTSTATION_PER_KM].map((tk) => (
                        <RateRow key={tk}
                            vehicleType={activeVehicle}
                            templateKey={tk}
                            configRows={configRows}
                            onSave={handleSave}
                            saving={saving}
                        />
                    ))}

                    <p className="text-xs text-gray-400 pt-2">
                        * "Outstation - Custom Total" and "Local + Outstation Mixed" templates use no rates — they generate a blank template for manual filling.
                    </p>
                </div>
            </Card>
        </div>
    )
}