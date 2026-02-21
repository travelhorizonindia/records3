import api from './apiClient.js'
import { generateId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

const SHEET = 'Trips'

export const getTrips = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const getTripsByBooking = async (bookingId) => {
  const trips = await getTrips()
  return trips.filter((t) => t.bookingId === bookingId || t.enquiryId === bookingId)
}

export const createTrip = async (tripData, username) => {
  const record = { id: generateId(), ...tripData, ...getCreateMeta(username) }
  return api.create(SHEET, record)
}

export const updateTrip = async (id, updates, username) => {
  return api.update(SHEET, { id, ...updates, ...getUpdateMeta(username) })
}

export const softDeleteTrip = async (id, username) => {
  return api.update(SHEET, { id, isDeleted: 'true', ...getUpdateMeta(username) })
}
