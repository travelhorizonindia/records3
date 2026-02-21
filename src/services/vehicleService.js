import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta, objectToRow } from '../utils/index.js'

const SHEET = 'Vehicles'

export const getVehicles = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const createVehicle = async (vehicleData, username) => {
  const record = {
    id: generateId(),
    ...vehicleData,
    ...getCreateMeta(username),
  }
  return api.create(SHEET, record)
}

export const updateVehicle = async (id, updates, username) => {
  return api.update(SHEET, { id, ...updates, ...getUpdateMeta(username) })
}

export const softDeleteVehicle = async (id, username) => {
  return api.update(SHEET, { id, isDeleted: 'true', ...getUpdateMeta(username) })
}
