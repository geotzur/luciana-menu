-- Some dishes are only served during part of the day -- breakfast runs until
-- noon. The note stays on the menu all day rather than disappearing after the
-- cut-off, so a diner arriving in the afternoon learns when to come back.
--
-- Stored per dish rather than per category: the serving window is a property of
-- the dish, and categories are deleted and recreated by every Excel import, so
-- anything keyed to a category id would not survive one.
--
-- Empty string means no limit. The value is a plain "HH:MM" label shown as-is,
-- not a timestamp: it is a statement about the kitchen's hours, not something
-- the app compares against a clock.
alter table public.dishes add column if not exists available_until text default '';

comment on column public.dishes.available_until is
  'Serving cut-off shown on the dish, e.g. "12:00". Empty when the dish has no limit.';
