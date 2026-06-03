-- The Admin form and generated TypeScript types reference a `chef_note_en`
-- column (the English counterpart of `chef_note`), and every dish insert/update
-- sends it in the payload. Without the column, PostgREST rejects the request
-- ("Could not find the 'chef_note_en' column ... in the schema cache") and the
-- dish cannot be saved. Add it idempotently to keep the schema in sync.
ALTER TABLE public.dishes ADD COLUMN IF NOT EXISTS chef_note_en text DEFAULT '';
