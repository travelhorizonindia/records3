import { useState, useCallback, useMemo } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useAsync } from '../../hooks/useAsync.js'
import {
    quoteConfigService, TEMPLATE_KEYS, TEMPLATE_LABELS, DEFAULT_RATES,
} from '../../services/quoteConfigService.js'
import {
    Button, Card, CardHeader, PageHeader, Alert, SectionTitle, Input, Modal, ConfirmDialog,
} from '../../components/ui/index.jsx'

const LOCAL_TEMPLATES = [TEMPLATE_KEYS.LOCAL_40, TEMPLATE_KEYS.LOCAL_80, TEMPLATE_KEYS.LOCAL_120]
const OUTSTATION_TEMPLATES = [TEMPLATE_KEYS.OUTSTATION_PER_DAY, TEMPLATE_KEYS.OUTSTATION_PER_KM]
const ALL_TEMPLATES = [...LOCAL_TEMPLATES, ...OUTSTATION_TEMPLATES]

// Field definitions per template
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
// The key prop passed by the parent includes updatedAt, so this component fully
// remounts whenever the DB record changes — fixing the stale initial-state bug.
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
                        placeholder={String(defaults[f.key] ?? '')}
                    />
                ))}
            </div>
            <div className="flex justify-end mt-3 gap-2">
                {existing && !dirty && (
                    <Button size="sm" variant="ghost" className="text-gray-400 text-xs"
                        onClick={() => {
                            const base = {}
                            for (const f of fields) base[f.key] = defaults[f.key] ?? ''
                            setVals(base)
                            setDirty(true)
                        }}>
                        Reset to defaults
                    </Button>
                )}
                {dirty && (
                    <Button
                        size="sm"
                        loading={saving}
                        onClick={() => { onSave(vehicleType, templateKey, vals, existing?.id); setDirty(false) }}
                    >
                        Save Rates
                    </Button>
                )}
            </div>
        </div>
    )
}

// ─── Vehicle tab bar ──────────────────────────────────────────────────────────
function VehicleTabs({ vehicles, active, onChange, onAdd, onDelete, isAdmin }) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {vehicles.map((v) => (
                <div key={v} className="relative group">
                    <button
                        type="button"
                        onClick={() => onChange(v)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
              ${active === v
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {v}
                    </button>
                    {isAdmin && vehicles.length > 1 && active === v && (
                        <button
                            type="button"
                            onClick={() => onDelete(v)}
                            title={`Remove ${v}`}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 hover:bg-red-200 text-red-600 rounded-full text-xs leading-none items-center justify-center hidden group-hover:flex transition-all"
                        >
                            ✕
                        </button>
                    )}
                </div>
            ))}
            {isAdmin && (
                <button
                    type="button"
                    onClick={onAdd}
                    className="px-3 py-1.5 rounded-lg text-sm text-blue-600 border border-dashed border-blue-300 hover:bg-blue-50 transition-colors whitespace-nowrap"
                >
                    + Add Vehicle Type
                </button>
            )}
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function QuoteConfigPage() {
    const { user, isAdmin } = useAuth()
    const { data: configRows = [], refetch } = useAsync(quoteConfigService.getAll)

    const [saving, setSaving] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    const [addVehicleModal, setAddVehicleModal] = useState(false)
    const [newVehicleName, setNewVehicleName] = useState('')
    const [addingVehicle, setAddingVehicle] = useState(false)
    const [deleteVehicleTarget, setDeleteVehicleTarget] = useState(null)

    // Default vehicle seeds — shown even if no DB rows exist yet
    const DEFAULT_VEHICLE_SEED = ['Maruti Dzire', 'Innova Crysta', 'Force Traveller 12+1', 'Force Urbania 16+1']

    // Derive vehicle list: seeds first, then any extra types found in DB
    const vehicles = useMemo(() => {
        const fromDb = [...new Set(configRows.map((r) => r.vehicleType).filter(Boolean))]
        const merged = [...DEFAULT_VEHICLE_SEED]
        for (const v of fromDb) {
            if (!merged.includes(v)) merged.push(v)
        }
        return merged
    }, [configRows])

    const [activeVehicle, setActiveVehicle] = useState(() => DEFAULT_VEHICLE_SEED[0])

    // ── Save a rate row ─────────────────────────────────────────────────────────
    const handleSave = useCallback(async (vehicleType, templateKey, vals, existingId) => {
        setSaving(true)
        setErrorMsg('')
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
        } catch (e) {
            setErrorMsg(e.message)
        } finally {
            setSaving(false)
        }
    }, [user.username, refetch])

    // ── Add new vehicle type ────────────────────────────────────────────────────
    const handleAddVehicle = useCallback(async () => {
        const name = newVehicleName.trim()
        if (!name) return
        if (vehicles.includes(name)) {
            setErrorMsg(`"${name}" already exists.`)
            return
        }
        setAddingVehicle(true)
        setErrorMsg('')
        try {
            // Create one config row per template to register the vehicle
            for (const tk of ALL_TEMPLATES) {
                await quoteConfigService.create({ vehicleType: name, templateKey: tk }, user.username)
            }
            await refetch()
            setActiveVehicle(name)
            setAddVehicleModal(false)
            setNewVehicleName('')
            setSuccessMsg(`"${name}" added. Set its rates below.`)
            setTimeout(() => setSuccessMsg(''), 4000)
        } catch (e) {
            setErrorMsg(e.message)
        } finally {
            setAddingVehicle(false)
        }
    }, [newVehicleName, vehicles, user.username, refetch])

    // ── Delete vehicle type — soft-deletes all its config rows ──────────────────
    const handleDeleteVehicle = useCallback(async () => {
        const name = deleteVehicleTarget
        const rows = configRows.filter((r) => r.vehicleType === name)
        try {
            for (const r of rows) {
                await quoteConfigService.softDelete(r.id, user.username)
            }
            await refetch()
            const fallback = vehicles.find((v) => v !== name) || ''
            setActiveVehicle(fallback)
            setDeleteVehicleTarget(null)
            setSuccessMsg(`"${name}" removed.`)
            setTimeout(() => setSuccessMsg(''), 3000)
        } catch (e) {
            setErrorMsg(e.message)
            setDeleteVehicleTarget(null)
        }
    }, [deleteVehicleTarget, configRows, vehicles, user.username, refetch])

    // Build a cache-busting key for the rate section: encodes active vehicle's
    // current DB state so RateRow components remount when data changes.
    const rateKey = useMemo(() => {
        const relevant = configRows
            .filter((r) => r.vehicleType === activeVehicle)
            .map((r) => `${r.templateKey}:${r.id}:${r.updatedAt}`)
            .join('|')
        return `${activeVehicle}::${relevant}`
    }, [activeVehicle, configRows])

    return (
        <div>
            <PageHeader
                title="Quote Configuration"
                subtitle="Vehicle types here are the master list used in trips and quotes. Add a vehicle type to include it everywhere."
            />

            {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg('')} />}
            {errorMsg && <Alert type="error" message={errorMsg} onClose={() => setErrorMsg('')} />}

            <Card className="mt-4">
                <CardHeader>
                    <VehicleTabs
                        vehicles={vehicles}
                        active={activeVehicle}
                        onChange={setActiveVehicle}
                        onAdd={() => { setNewVehicleName(''); setAddVehicleModal(true) }}
                        onDelete={(v) => setDeleteVehicleTarget(v)}
                        isAdmin={isAdmin}
                    />
                </CardHeader>

                <div className="p-4 space-y-3" key={rateKey}>
                    <SectionTitle>Local Packages</SectionTitle>
                    {LOCAL_TEMPLATES.map((tk) => {
                        const row = configRows.find((r) => r.vehicleType === activeVehicle && r.templateKey === tk)
                        return (
                            <RateRow
                                key={`${activeVehicle}-${tk}-${row?.id ?? 'new'}-${row?.updatedAt ?? ''}`}
                                vehicleType={activeVehicle}
                                templateKey={tk}
                                configRows={configRows}
                                onSave={handleSave}
                                saving={saving}
                            />
                        )
                    })}

                    <SectionTitle className="mt-6">Outstation Packages</SectionTitle>
                    {OUTSTATION_TEMPLATES.map((tk) => {
                        const row = configRows.find((r) => r.vehicleType === activeVehicle && r.templateKey === tk)
                        return (
                            <RateRow
                                key={`${activeVehicle}-${tk}-${row?.id ?? 'new'}-${row?.updatedAt ?? ''}`}
                                vehicleType={activeVehicle}
                                templateKey={tk}
                                configRows={configRows}
                                onSave={handleSave}
                                saving={saving}
                            />
                        )
                    })}

                    <p className="text-xs text-gray-400 pt-2">
                        * "Outstation - Custom Total" and "Local + Outstation Mixed" templates use no rates — they generate a blank template for manual filling.
                    </p>
                </div>
            </Card>

            {/* ── Add Vehicle Type Modal ──────────────────────────────────────────── */}
            <Modal open={addVehicleModal} onClose={() => setAddVehicleModal(false)} title="Add Vehicle Type" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">
                        This vehicle type will appear in the trip form and quote generator. You can enter its rates after adding.
                    </p>
                    <Input
                        label="Vehicle Type Name *"
                        placeholder='e.g. Toyota Innova Hycross'
                        value={newVehicleName}
                        onChange={(e) => setNewVehicleName(e.target.value)}
                    />
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={() => setAddVehicleModal(false)}>Cancel</Button>
                        <Button loading={addingVehicle} onClick={handleAddVehicle}>Add Vehicle Type</Button>
                    </div>
                </div>
            </Modal>

            {/* ── Delete Vehicle Type Confirmation ───────────────────────────────── */}
            <ConfirmDialog
                open={!!deleteVehicleTarget}
                onConfirm={handleDeleteVehicle}
                onCancel={() => setDeleteVehicleTarget(null)}
                title="Remove Vehicle Type"
                message={`Remove "${deleteVehicleTarget}" from vehicle types? Its saved rates will be deleted. Existing trips that used this type are not affected.`}
            />
        </div>
    )
}