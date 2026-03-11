/**
 * Shared configuration for all API routes.
 * Maps sheet names to their spreadsheet IDs and headers.
 */

// ─── Spreadsheet IDs (from env) ───────────────────────────────────────────────
export const SPREADSHEET_IDS = {
  master: () => process.env.GOOGLE_SHEET_ID_MASTER,
  operations: () => process.env.GOOGLE_SHEET_ID_OPERATIONS,
  financials: () => process.env.GOOGLE_SHEET_ID_FINANCIALS,
}

// ─── Sheet definitions ────────────────────────────────────────────────────────
export const SHEET_CONFIG = {
  // Master data workbook
  Vehicles: {
    spreadsheetId: SPREADSHEET_IDS.master,
    headers: [
      'id', 'registrationNumber', 'chassisNumber', 'seater', 'color', 'odometer',
      'stateTaxFromDate', 'stateTaxToDate', 'stateTaxFileUrl',
      'authorizationFromDate', 'authorizationToDate', 'authorizationFileUrl',
      'aitpFromDate', 'aitpToDate', 'aitpFileUrl',
      'insuranceFromDate', 'insuranceToDate', 'insuranceFileUrl',
      'pollutionFromDate', 'pollutionToDate', 'pollutionFileUrl',
      'fitnessFromDate', 'fitnessToDate', 'fitnessFileUrl',
      'isOnLoan', 'monthlyLoanEmi', 'emiDate', 'loanFreeOnDate',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  Drivers: {
    spreadsheetId: SPREADSHEET_IDS.master,
    headers: [
      'id', 'name', 'phone', 'alternatePhone1', 'alternatePhone2',
      'email', 'address',
      'drivingLicenseFileUrl', 'aadharFileUrl', 'photoFileUrl',
      'otherDoc1Name', 'otherDoc1FileUrl', 'otherDoc2Name', 'otherDoc2FileUrl',
      'monthlyFixedSalary', 'joiningDate',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  Agents: {
    spreadsheetId: SPREADSHEET_IDS.master,
    headers: [
      'id', 'agentType', 'name', 'contactPersonName', 'phone', 'alternatePhone1', 'alternatePhone2',
      'email', 'alternateEmail', 'address',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  Customers: {
    spreadsheetId: SPREADSHEET_IDS.master,
    headers: [
      'id', 'name', 'phone', 'alternatePhone1', 'alternatePhone2',
      'email', 'alternateEmail', 'address',
      'customerStatus',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },

  // Quote configuration (rates per vehicle per template)
  QuoteConfig: {
    spreadsheetId: SPREADSHEET_IDS.master,
    headers: [
      'id', 'vehicleType', 'templateKey',
      // Local packages
      'baseKm', 'baseHours', 'basePrice',
      'extraKmRate', 'extraHourRate', 'driverNightCharge',
      // Outstation per-day
      'perDayRate', 'kmPerDay', 'extraKmRate2',
      // Outstation per-km
      'perKmRate', 'driverAllowancePerDay',
      // Shared
      'tollParkingNote', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },

  // Operations workbook
  EnquiriesBookings: {
    spreadsheetId: SPREADSHEET_IDS.operations,
    headers: [
      'enquiryId', 'bookingId', 'customerId', 'agentId', 'isAgentBooking', 'status',
      'guestName', 'guestPhone', 'alternateContactName', 'alternateContactPhone',
      'pickupDateTime', 'pickupLocation', 'trainFlightNumber', 'dropLocation',
      'customerRequests', 'notes', 'enquiryQuote', 'bookingQuote',
      'customerStatus',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  Trips: {
    spreadsheetId: SPREADSHEET_IDS.operations,
    headers: [
      'id', 'sequence', 'bookingId', 'enquiryId', 'tripType', 'localSubType',
      'vehicleType', 'startDate', 'endDate', 'travelPlan',
      'pickupDateTime', 'pickupLocation', 'dropLocation',
      'trainFlightNumber', 'customerRequests', 'notes',
      'isVendorTrip', 'vendorName', 'vendorPhone', 'vendorCommission',
      'allocatedVehicleId', 'allocatedVehicleNumber', 'allocatedVehicleType', 'allocatedVehicleSeating',
      'allocatedDriverId', 'allocatedDriverName', 'allocatedDriverPhone',
      'totalAmount', 'amountReceived', 'amountPending',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },

  // Financials workbook
  Payments: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'tripId', 'bookingId', 'amount', 'mode',
      'receivedBy', 'isVerified', 'paymentDate', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  FuelExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'driverId', 'bookingId', 'tripId',
      'date', 'amount', 'odometer',
      'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  TollExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'driverId', 'tripId', 'bookingId',
      'totalAmount', 'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  ParkingExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'driverId', 'tripId', 'bookingId',
      'totalAmount', 'parkingEntries',
      'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  DriverAllowances: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'driverId', 'tripId', 'bookingId',
      'amountPerDay', 'numberOfDays', 'totalAmount',
      'isNightCharge',
      'isPaid', 'paidDate',
      'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  StateTaxExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'tripId', 'bookingId',
      'stateName', 'date', 'amount',
      'isAitpEvaluation',
      'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  VehicleMaintenance: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'date', 'amount', 'description', 'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  VehicleServiceHistory: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'date', 'odometerKm', 'serviceType', 'wheelPosition', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  DriverSalary: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      // salaryMonth = "YYYY-MM" e.g. "2026-01" — for P&L month attribution
      // date = actual payment date (can differ from salary month)
      'id', 'driverId', 'salaryMonth', 'date', 'amount', 'mode',
      'isPaid', 'paidDate',
      'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  BusinessExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      // expenseMonth = "YYYY-MM" for P&L attribution; date = actual payment date
      'id', 'expenseMonth', 'date', 'category', 'amount', 'description',
      'isPaid', 'paidDate',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  OtherExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'bookingId',
      'date', 'category', 'amount', 'notes',
      'isPaid', 'paidDate',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
}

// ─── CORS / JSON helpers ──────────────────────────────────────────────────────
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}