import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

const SHEET = 'Agents'

export const getAgents = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const createAgent = async (agentData, username) => {
  const record = { id: generateId(), ...agentData, ...getCreateMeta(username) }
  return api.create(SHEET, record)
}

export const updateAgent = async (id, updates, username) => {
  return api.update(SHEET, { id, ...updates, ...getUpdateMeta(username) })
}

export const softDeleteAgent = async (id, username) => {
  return api.update(SHEET, { id, isDeleted: 'true', ...getUpdateMeta(username) })
}
