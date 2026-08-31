-- Some dishes are sold in two sizes with two prices -- espresso / double,
-- cappuccino small / large, breakfast for one / for two. The sheet expresses
-- these as "12 // 10", and the importer kept only the first number, so the
-- second option never reached the customer.
--
-- `price` stays the single numeric value (sorting, and the figure used when a
-- dish has one price). `price_text`, when non-empty, is the human-readable
-- string shown instead -- e.g. "₪12 / ₪10" or "₪79 יחיד / ₪149 זוג".
alter table public.dishes add column if not exists price_text text default '';

comment on column public.dishes.price_text is
  'Display price when a dish has several options; overrides `price` in the UI when non-empty.';
