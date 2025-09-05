-- Policy: Allow only the tutor of the session to update the is_finished column in tutor_sessions

-- Enable RLS on the table if not already enabled
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for updating is_finished
CREATE POLICY "Tutor can update is_finished"
  ON tutor_sessions
  FOR UPDATE
  USING (
    auth.uid() = tutor_id
  )
  WITH CHECK (
    auth.uid() = tutor_id
  );

-- (Optional) Restrict update to only the is_finished column
-- This is not enforced by policy, but you can use a trigger or application logic to enforce column-level restrictions.
