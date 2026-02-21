import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

const SHEET = 'Payments'

export const getPayments = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const createPayment = async (paymentData, username) => {
  const record = { id: generateId(), isVerified: 'false', ...paymentData, ...getCreateMeta(username) }
  return api.create(SHEET, record)
}

export const updatePayment = async (id, updates, username) => {
  return api.update(SHEET, { id, ...updates, ...getUpdateMeta(username) })
}

export const verifyPayment = async (id, username) => {
  return api.update(SHEET, { id, isVerified: 'true', ...getUpdateMeta(username) })
}

export const softDeletePayment = async (id, username) => {
  return api.update(SHEET, { id, isDeleted: 'true', ...getUpdateMeta(username) })
}
