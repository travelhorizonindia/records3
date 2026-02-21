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
      'id', 'name', 'contactPersonName', 'phone', 'alternatePhone1', 'alternatePhone2',
      'email', 'alternateEmail', 'address',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  Customers: {
    spreadsheetId: SPREADSHEET_IDS.master,
    headers: [
      'id', 'name', 'phone', 'alternatePhone1', 'alternatePhone2',
      'email', 'alternateEmail', 'address',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },

  // Operations workbook
  EnquiriesBookings: {
    spreadsheetId: SPREADSHEET_IDS.operations,
    headers: [
      'enquiryId', 'bookingId', 'customerPhone', 'customerName',
      'agentId', 'customerId', 'status',
      'pickupDateTime', 'pickupLocation', 'trainFlightNumber', 'dropLocation',
      'customerRequests', 'notes', 'enquiryQuote', 'bookingQuote',
      'totalAmount', 'amountReceived', 'amountPending',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  Trips: {
    spreadsheetId: SPREADSHEET_IDS.operations,
    headers: [
      'id', 'bookingId', 'enquiryId', 'tripType', 'localSubType',
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
  DriverAllowances: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'tripId', 'bookingId', 'amountPerDay', 'numberOfDays', 'totalAmount',
      'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  TollExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'tripId', 'bookingId', 'totalAmount', 'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  ParkingExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'tripId', 'bookingId', 'totalAmount', 'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  StateTaxExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'tripId', 'bookingId', 'stateName', 'date', 'amount',
      'isAitpEvaluation', 'isVerified', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  FuelExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'vehicleId', 'driverId', 'bookingId', 'tripId',
      'date', 'amount', 'isVerified', 'notes',
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
  DriverSalary: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'driverId', 'date', 'amount', 'mode', 'notes',
      'isDeleted', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    ],
  },
  BusinessExpenses: {
    spreadsheetId: SPREADSHEET_IDS.financials,
    headers: [
      'id', 'date', 'category', 'amount', 'description',
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
