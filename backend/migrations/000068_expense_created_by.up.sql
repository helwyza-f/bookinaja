-- Akuntabilitas: siapa mencatat biaya. NULL untuk data lama / entri sistem.
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
