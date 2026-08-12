-- Teams meeting link auto-created via Microsoft Bookings for telemedicine appointments.
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS teams_meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS ms_booking_appointment_id TEXT;
