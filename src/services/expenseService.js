import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

// ─── Generic expense factory ──────────────────────────────────────────────────
const makeExpenseService = (sheet, options = {}) => ({
  getAll: async () => {
    const { data } = await api.getAll(sheet)
    return data
  },
  create: async (data, username) => {
    const record = {
      id: generateId(),
      ...(options.hasVerified !== false ? { isVerified: 'false' } : {}),
      ...data,
      ...getCreateMeta(username),
    }
    return api.create(sheet, record)
  },
  update: async (id, updates, username) => {
    return api.update(sheet, { id, ...updates, ...getUpdateMeta(username) })
  },
  verify: async (id, username) => {
    return api.update(sheet, { id, isVerified: 'true', ...getUpdateMeta(username) })
  },
  markPaid: async (id, paidDate, username) => {
    return api.update(sheet, { id, isPaid: 'true', paidDate, ...getUpdateMeta(username) })
  },
  softDelete: async (id, username) => {
    return api.update(sheet, { id, isDeleted: 'true', ...getUpdateMeta(username) })
  },
})

export const fuelExpenseService = makeExpenseService('FuelExpenses')
export const tollExpenseService = makeExpenseService('TollExpenses')
export const parkingExpenseService = makeExpenseService('ParkingExpenses')
export const stateTaxExpenseService = makeExpenseService('StateTaxExpenses')
export const driverAllowanceService = makeExpenseService('DriverAllowances')
export const vehicleMaintenanceService = makeExpenseService('VehicleMaintenance')
export const otherExpenseService = makeExpenseService('OtherExpenses', { hasVerified: false })

// Vehicle service history — no isVerified (it's a log not a financial record)
export const vehicleServiceHistoryService = makeExpenseService('VehicleServiceHistory', { hasVerified: false })

// Driver salary — no isVerified, has isPaid / salaryMonth
export const driverSalaryService = {
  ...makeExpenseService('DriverSalary', { hasVerified: false }),
}

// Business expenses — no isVerified, has isPaid / expenseMonth
export const businessExpenseService = {
  ...makeExpenseService('BusinessExpenses', { hasVerified: false }),
}