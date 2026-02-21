import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

const SHEET = 'Drivers'

export const getDrivers = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const createDriver = async (driverData, username) => {
  const record = { id: generateId(), ...driverData, ...getCreateMeta(username) }
  return api.create(SHEET, record)
}

export const updateDriver = async (id, updates, username) => {
  return api.update(SHEET, { id, ...updates, ...getUpdateMeta(username) })
}

export const softDeleteDriver = async (id, username) => {
  return api.update(SHEET, { id, isDeleted: 'true', ...getUpdateMeta(username) })
}
