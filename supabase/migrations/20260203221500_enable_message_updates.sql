-- Enable UPDATE for campaign_messages so users can mark them as read

-- Admins can update any message (to mark as read)
CREATE POLICY "Admins can update messages"
  ON campaign_messages
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Distributors can update messages in their campaigns (to mark as read)
CREATE POLICY "Distributors can update messages"
  ON campaign_messages
  FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id
      FROM campaigns c
      JOIN films f ON c.film_id = f.id
      JOIN distributor_users du ON f.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
        AND du.is_active = true
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT c.id
      FROM campaigns c
      JOIN films f ON c.film_id = f.id
      JOIN distributor_users du ON f.distributor_id = du.distributor_id
      WHERE du.user_id = auth.uid()
        AND du.is_active = true
    )
  );
