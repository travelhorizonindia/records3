import api from './apiClient.js'
import { generateEnquiryId, generateBookingId, getCreateMeta, getUpdateMeta } from '../utils/index.js'

const SHEET = 'EnquiriesBookings'

export const getEnquiries = async () => {
  const { data } = await api.getAll(SHEET)
  return data
}

export const createEnquiry = async (enquiryData, username) => {
  // Fetch all existing enquiry IDs to generate the next serial
  const existing = await getEnquiries()
  const existingIds = existing.map((e) => e.enquiryId)
  const enquiryId = generateEnquiryId(existingIds)

  const record = {
    enquiryId,
    bookingId: '',
    ...enquiryData,
    status: 'Enquiry',
    ...getCreateMeta(username),
  }
  return api.create(SHEET, record)
}

export const updateEnquiry = async (enquiryId, updates, username) => {
  return api.update(SHEET, { enquiryId, ...updates, ...getUpdateMeta(username) })
}

export const confirmBooking = async (enquiryId, bookingData, username) => {
  // Generate booking ID
  const existing = await getEnquiries()
  const existingBookingIds = existing.map((e) => e.bookingId).filter(Boolean)
  const bookingId = generateBookingId(existingBookingIds)

  return api.update(SHEET, {
    enquiryId,
    bookingId,
    ...bookingData,
    status: 'Upcoming',
    ...getUpdateMeta(username),
  })
}

export const softDeleteEnquiry = async (enquiryId, username) => {
  return api.update(SHEET, { enquiryId, isDeleted: 'true', ...getUpdateMeta(username) })
}
