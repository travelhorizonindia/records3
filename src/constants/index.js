// Enquiry / Booking statuses
export const BOOKING_STATUS = {
  ENQUIRY: 'Enquiry',
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const BOOKING_STATUS_OPTIONS = Object.values(BOOKING_STATUS)

export const BOOKING_STATUS_COLORS = {
  Enquiry: 'bg-gray-100 text-gray-700',
  Upcoming: 'bg-blue-100 text-blue-700',
  Ongoing: 'bg-yellow-100 text-yellow-700',
  Completed: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
}

// Trip types
export const TRIP_TYPE = {
  LOCAL: 'Delhi/NCR Local',
  OUTSTATION: 'Outstation',
}

export const TRIP_TYPE_OPTIONS = Object.values(TRIP_TYPE)

export const LOCAL_SUB_TYPE_OPTIONS = [
  'Pickup/Drop',
  '40km & 4 Hours',
  '80km & 8 Hours',
  '120km & 12 Hours',
]

// Vehicle types
export const VEHICLE_TYPE_OPTIONS = [
  'Maruti Dzire',
  'Innova Crysta',
  'Force Traveller 12+1',
  'Force Urbania 16+1',
]

// Payment modes
export const PAYMENT_MODE_OPTIONS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other']

// Business expense categories
export const BUSINESS_EXPENSE_CATEGORY_OPTIONS = [
  'Office Rent',
  'Office Expense',
  'Marketing Expense',
  'Other',
]

// Predefined system agents
export const SYSTEM_AGENTS = ['Self', 'Google Ads', 'Repeating Google Ads']

// Sheet names
export const SHEETS = {
  VEHICLES: 'Vehicles',
  DRIVERS: 'Drivers',
  AGENTS: 'Agents',
  CUSTOMERS: 'Customers',
  ENQUIRIES_BOOKINGS: 'EnquiriesBookings',
  TRIPS: 'Trips',
  PAYMENTS: 'Payments',
  DRIVER_ALLOWANCES: 'DriverAllowances',
  TOLL_EXPENSES: 'TollExpenses',
  PARKING_EXPENSES: 'ParkingExpenses',
  STATE_TAX_EXPENSES: 'StateTaxExpenses',
  FUEL_EXPENSES: 'FuelExpenses',
  VEHICLE_MAINTENANCE: 'VehicleMaintenance',
  DRIVER_SALARY: 'DriverSalary',
  BUSINESS_EXPENSES: 'BusinessExpenses',
}
