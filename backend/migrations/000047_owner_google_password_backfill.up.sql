UPDATE users
SET
    password_setup_required = TRUE
WHERE role = 'owner'
  AND deleted_at IS NULL
  AND google_subject IS NOT NULL
  AND BTRIM(google_subject) <> ''
  AND COALESCE(BTRIM(password), '') = '';
