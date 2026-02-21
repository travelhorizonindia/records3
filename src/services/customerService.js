import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

const SHEET = 'Customers'

export const getCustomers = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const createCustomer = async (customerData, username) => {
  const record = { id: generateId(), ...customerData, ...getCreateMeta(username) }
  return api.create(SHEET, record)
}

export const updateCustomer = async (id, updates, username) => {
  return api.update(SHEET, { id, ...updates, ...getUpdateMeta(username) })
}

export const softDeleteCustomer = async (id, username) => {
  return api.update(SHEET, { id, isDeleted: 'true', ...getUpdateMeta(username) })
}
