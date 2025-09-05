-- Enable RLS if not already enabled
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow tutors to update is_finished for their own sessions
CREATE POLICY "Tutor can update is_finished"
  ON tutor_sessions
  FOR UPDATE
  USING (
    auth.uid() = tutor_id
  )
  WITH CHECK (
    auth.uid() = tutor_id
  );
