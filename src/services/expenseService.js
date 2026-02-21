import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

// ─── Generic expense factory ──────────────────────────────────────────────────
const makeExpenseService = (sheet) => ({
  getAll: async () => {
    const { data } = await api.getAll(sheet)
    return data
  },
  create: async (data, username) => {
    const record = { id: generateId(), isVerified: 'false', ...data, ...getCreateMeta(username) }
    return api.create(sheet, record)
  },
  update: async (id, updates, username) => {
    return api.update(sheet, { id, ...updates, ...getUpdateMeta(username) })
  },
  verify: async (id, username) => {
    return api.update(sheet, { id, isVerified: 'true', ...getUpdateMeta(username) })
  },
  softDelete: async (id, username) => {
    return api.update(sheet, { id, isDeleted: 'true', ...getUpdateMeta(username) })
  },
})

export const driverAllowanceService = makeExpenseService('DriverAllowances')
export const tollExpenseService = makeExpenseService('TollExpenses')
export const parkingExpenseService = makeExpenseService('ParkingExpenses')
export const stateTaxExpenseService = makeExpenseService('StateTaxExpenses')
export const fuelExpenseService = makeExpenseService('FuelExpenses')
export const vehicleMaintenanceService = makeExpenseService('VehicleMaintenance')

// Driver salary (no isVerified)
export const driverSalaryService = {
  getAll: async () => {
    const { data } = await api.getAll('DriverSalary')
    return data
  },
  create: async (data, username) => {
    const record = { id: generateId(), ...data, ...getCreateMeta(username) }
    return api.create('DriverSalary', record)
  },
  update: async (id, updates, username) => {
    return api.update('DriverSalary', { id, ...updates, ...getUpdateMeta(username) })
  },
  softDelete: async (id, username) => {
    return api.update('DriverSalary', { id, isDeleted: 'true', ...getUpdateMeta(username) })
  },
}

// Business expenses (no isVerified)
export const businessExpenseService = {
  getAll: async () => {
    const { data } = await api.getAll('BusinessExpenses')
    return data
  },
  create: async (data, username) => {
    const record = { id: generateId(), ...data, ...getCreateMeta(username) }
    return api.create('BusinessExpenses', record)
  },
  update: async (id, updates, username) => {
    return api.update('BusinessExpenses', { id, ...updates, ...getUpdateMeta(username) })
  },
  softDelete: async (id, username) => {
    return api.update('BusinessExpenses', { id, isDeleted: 'true', ...getUpdateMeta(username) })
  },
}
