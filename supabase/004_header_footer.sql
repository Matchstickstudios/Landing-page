-- 004: header and footer wording, editable from the studio.
--
-- One jsonb column on the settings row rather than a column per phrase, so a
-- new phrase later is a studio change, not another migration. Keys the site
-- reads (anything missing falls back to the wording the site was built with):
--
--   logo_name      bold word beside the logo          ("" hides it)
--   logo_sub       small line under it                ("" hides it)
--   logo_height    logo picture height in px          (default 38)
--   header_button  the button on the right of the bar and in the phone menu
--   footer_word    the huge word across the footer
--   copyright      the line at the foot of the page
--   wa_message     what the floating WhatsApp button opens with
--
-- Run once in the Supabase SQL editor. Safe to run again.

alter table settings add column if not exists labels jsonb not null default '{}';
