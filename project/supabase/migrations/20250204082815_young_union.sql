/*
  # Create receipts table

  1. New Tables
    - `receipts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `date` (date, receipt date)
      - `vendor` (text, vendor name)
      - `account_category` (text, account category)
      - `amount` (integer, amount in yen)
      - `created_at` (timestamptz, creation timestamp)

  2. Security
    - Enable RLS on `receipts` table
    - Add policies for authenticated users to:
      - Read their own receipts
      - Insert their own receipts
*/

CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL,
  vendor text NOT NULL,
  account_category text NOT NULL,
  amount integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own receipts"
  ON receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON receipts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);