-- Matchstick Studios — seed data
-- Your content as it stands today. Run after schema.sql.
-- Re-running rewrites the content tables; enquiries are never touched.

begin;

truncate nav, social, ticker, team, services, projects, reasons, brief_options, posts restart identity;

-- ---------- nav ----------
insert into nav (label, href, sort) values ('Services', '#desk', 0);
insert into nav (label, href, sort) values ('Work', '#work', 1);
insert into nav (label, href, sort) values ('Our Team', '#crew', 2);
insert into nav (label, href, sort) values ('Why Us', '#why', 3);
insert into nav (label, href, sort) values ('Writing', '/blog/', 4);
insert into nav (label, href, sort) values ('Brief', '#brief', 5);

-- ---------- social ----------
insert into social (network, url, sort) values ('Instagram', 'https://instagram.com/matchstickstudios', 0);
insert into social (network, url, sort) values ('Facebook', 'https://facebook.com/matchstickstudios', 1);
insert into social (network, url, sort) values ('X', 'https://x.com/matchstickstd', 2);
insert into social (network, url, sort) values ('LinkedIn', 'https://linkedin.com/company/matchstickstudios', 3);

-- ---------- ticker ----------
insert into ticker (phrase, sort) values ('Branding', 0);
insert into ticker (phrase, sort) values ('Creatives & Promotions', 1);
insert into ticker (phrase, sort) values ('Social Media', 2);
insert into ticker (phrase, sort) values ('Meta Ads', 3);
insert into ticker (phrase, sort) values ('Google Ads', 4);
insert into ticker (phrase, sort) values ('Lead Generation', 5);
insert into ticker (phrase, sort) values ('Websites', 6);
insert into ticker (phrase, sort) values ('Property first, not property only', 7);
insert into ticker (phrase, sort) values ('Shops · Clinics · Restaurants · Gyms', 8);
insert into ticker (phrase, sort) values ('Built to be noticed', 9);

-- ---------- team ----------
insert into team (name, role, initials, bio, does, pos_x, pos_y, pos_r, sort) values (
  'Rohith', 'Founder & Client Partner', 'RO', 'The first call, and every one after it. Rohith decides what we take on, agrees what it is worth, and stays on your file long after the handshake.',
  array['Clients','Strategy','Pitching','Decisions']::text[], 1, 0, -3, 0);
insert into team (name, role, initials, bio, does, pos_x, pos_y, pos_r, sort) values (
  'Harikrishnam Raju', 'Co-founder · UI/UX & Strategy Lead', 'HR', 'Co-founder, and the person who turns a loose brief into something you can actually see. Senior UI/UX design, the strategy sitting under it, and the standard every piece of work here is held to before it leaves the room.',
  array['UI/UX','Product design','Strategy','Design systems','Direction']::text[], 36, 8, 2, 1);
insert into team (name, role, initials, bio, does, pos_x, pos_y, pos_r, sort) values (
  'Akhil', 'Creative Lead', 'AK', 'Everything you look at. Project identity, launch creatives, brochures and hoardings. Campaign art that has to hold up on a phone screen and on a forty-foot board.',
  array['Identity','Creatives','Print','Campaign']::text[], 70, 1, -1.5, 2);
insert into team (name, role, initials, bio, does, pos_x, pos_y, pos_r, sort) values (
  'Ramnath', 'Web & Growth Engineer', 'RA', 'Sites and landing pages when they are needed. And on every single account, the tracking, the lead routing and the weekly numbers that say whether any of it actually worked.',
  array['Websites','Landing pages','Tracking','Lead ops','Reporting']::text[], 13, 47, 2.5, 3);
insert into team (name, role, initials, bio, does, pos_x, pos_y, pos_r, sort) values (
  'Danush', 'Content & Social', 'DA', 'Reels, calendars, captions and the community underneath them, plus the day-to-day of the paid social, so the feed never goes quiet on you.',
  array['Content','Reels','Calendars','Community']::text[], 50, 55, -2, 4);

-- ---------- services ----------
insert into services (title, kicker, summary, get_items, first_30, sort) values (
  'Branding', 'Identity', 'The name, the mark, and the rules that keep every project looking like you.',
  array['A logo and mark in every file you will be asked for','Colour, type and a one-page rule sheet anyone can follow','An identity kit so each new project still looks like yours']::text[], 'Positioning in week one, a first identity route inside three.', 0);
insert into services (title, kicker, summary, get_items, first_30, sort) values (
  'Creatives &amp; Promotions', 'Campaign', 'Launch artwork that holds up on a phone screen and on a hoarding.',
  array['One key visual the whole campaign hangs off','Creatives cut to every placement you actually buy','Brochures, standees and hoardings from the same set']::text[], 'Key visual signed off, the first full set live inside the month.', 1);
insert into services (title, kicker, summary, get_items, first_30, sort) values (
  'Social Media', 'Always on', 'A month you can see in advance, posted and replied to by us.',
  array['A monthly calendar approved before anything goes out','Reels, stories and posts designed, written and scheduled','Comments and DMs answered, real enquiries passed same day']::text[], 'A calendar a month ahead, the first shoot at site by week three.', 2);
insert into services (title, kicker, summary, get_items, first_30, sort) values (
  'Meta &amp; Google Ads', 'Paid media', 'Budget pointed at enquiries, not at likes.',
  array['Meta and Google set up properly, tracking in place first','Creative tested against creative instead of guessed at','Weekly numbers in plain language, good week or bad']::text[], 'Tracking fixed first, then a real cost per enquiry by day thirty.', 3);
insert into services (title, kicker, summary, get_items, first_30, sort) values (
  'Lead Generation', 'Enquiries', 'The enquiry reaches a human while they are still interested.',
  array['A landing page per project, built to be filled in on a phone','Routing so the right person sees it first, not a shared inbox','A follow-up flow your sales team can actually work']::text[], 'Page live, form tested end to end, leads on a phone in two weeks.', 4);
insert into services (title, kicker, summary, get_items, first_30, sort) values (
  'Websites', 'Build', 'Fast, clear, and something you can update without calling us.',
  array['A company site with a project section you control','A microsite per project when a launch deserves its own','Built to open quickly on a phone, on mobile data']::text[], 'Sitemap and design agreed in week one, the build yours by week four.', 5);

-- ---------- projects ----------
insert into projects (title, tag, summary, chips, sort) values (
  'Project launch campaign', 'Launch', 'Everything a new phase needs on day one: a name, a key visual, creatives cut for every placement you buy, and the ads running behind them.', array['Key visual','Creative suite','Meta + Google','Launch calendar']::text[], 0);
insert into projects (title, tag, summary, chips, sort) values (
  'Builder identity system', 'Branding', 'One identity for the company and a repeatable kit, so every project you launch still looks like it came from you.', array['Logo & mark','Colour & type','Usage rules','Project kit']::text[], 1);
insert into projects (title, tag, summary, chips, sort) values (
  'Site-visit lead engine', 'Lead gen', 'Landing page, form, routing and follow-up, tuned so the enquiry reaches a human while they are still interested.', array['Landing page','Lead routing','Follow-up flow','Weekly report']::text[], 2);
insert into projects (title, tag, summary, chips, sort) values (
  'Walkthrough & reel content', 'Content', 'Shoot days at site, walkthroughs and vertical cutdowns, posted against a calendar you can see a month ahead.', array['Site shoot','Reels','Monthly calendar','Community']::text[], 3);
insert into projects (title, tag, summary, chips, sort) values (
  'Hoarding & print suite', 'Creatives', 'Hoardings, standees, brochures and site boards drawn from the same artwork as the digital campaign, so nothing looks borrowed.', array['Hoardings','Brochure','Standees','Site boards']::text[], 4);
insert into projects (title, tag, summary, chips, sort) values (
  'Project microsite', 'Web', 'A fast single-project site with plans, gallery and location, and an enquiry form that hands straight to your sales team.', array['Fast build','Plans & gallery','Enquiry form','Tracking']::text[], 5);

-- ---------- reasons ----------
insert into reasons (title, body, pos_x, pos_y, pos_r, sort) values (
  'No layers, no handoffs', 'The person you brief is the person doing the work. Nothing is passed down to someone you have never met, because there is nobody to pass it to.', 2, 2, -3, 0);
insert into reasons (title, body, pos_x, pos_y, pos_r, sort) values (
  'Sharpest on property', 'We think in site visits, walk-ins and launch dates, because property does not behave like retail. That same thinking travels. A showroom, a clinic or a gym gets the walk-ins version of it.', 37, 12, 2, 1);
insert into reasons (title, body, pos_x, pos_y, pos_r, sort) values (
  'Creative and media together', 'Whoever makes the creative also watches it run. When something underperforms it gets changed that week, not next quarter.', 68, 26, -1.5, 2);
insert into reasons (title, body, pos_x, pos_y, pos_r, sort) values (
  'Small on purpose', 'We take on a few projects at a time so each one gets the attention it was sold with. When we are full, we will say so.', 14, 52, 3, 3);

-- ---------- the brief's three questions ----------
insert into brief_options (question, value, sort) values ('services', 'Branding', 0);
insert into brief_options (question, value, sort) values ('services', 'Creatives & Promotions', 1);
insert into brief_options (question, value, sort) values ('services', 'Social Media', 2);
insert into brief_options (question, value, sort) values ('services', 'Meta & Google Ads', 3);
insert into brief_options (question, value, sort) values ('services', 'Lead Generation', 4);
insert into brief_options (question, value, sort) values ('services', 'Websites', 5);
insert into brief_options (question, value, sort) values ('who', 'a builder', 0);
insert into brief_options (question, value, sort) values ('who', 'a real-estate agency', 1);
insert into brief_options (question, value, sort) values ('who', 'one project', 2);
insert into brief_options (question, value, sort) values ('who', 'something else', 3);
insert into brief_options (question, value, emoji, sort) values ('when', 'this month', '🤩', 0);
insert into brief_options (question, value, emoji, sort) values ('when', 'this quarter', '🙂', 1);
insert into brief_options (question, value, emoji, sort) values ('when', 'just planning', '🤔', 2);

-- ---------- settings, one row ----------
insert into settings (id, story, stats, colors, phone, whatsapp, email, site_url) values (
  1, 'One room, five people, and work that never leaves the building. Property is where we are sharpest, but the job is the same for a showroom, a clinic or a restaurant: make it impossible to walk past.', '[{"value":"24","label":"Projects delivered"},{"value":"06","label":"Services"},{"value":"12","label":"Brands launched"},{"value":"40","label":"Campaigns run"}]'::jsonb, '{"soot":"#07070A","soot2":"#0D0E12","panel":"#12131A","ash":"#F0EAE0","ash2":"#9B958C","ash3":"#837F79","ember":"#FF5F1F","flame":"#FFB13D","gold":"#FFD98A","deep":"#C0261A","cool":"#4C7FA8"}'::jsonb,
  '+917904888874', '917904888874', 'matchstickstudios@gmail.com', 'https://matchstickstudios.github.io/Landing-page')
on conflict (id) do update set
  story = excluded.story, stats = excluded.stats, colors = excluded.colors,
  phone = excluded.phone, whatsapp = excluded.whatsapp, email = excluded.email,
  site_url = excluded.site_url;

-- ---------- blog ----------
insert into posts (slug, title, published, excerpt, tags, body, draft) values (
  'hoardings-still-work', 'Why a hoarding still beats a boosted post', '2026-09-12',
  'A forty-foot board has one job and it does it for six months. Here is where it still outruns the feed, and where it does not.', array['Creatives','Property']::text[], 'A hoarding is the only piece of media your buyer cannot scroll past. That is
the whole argument, and it is worth more than it sounds.

## The board does not compete for attention

A boosted post fights for a slot against everything else in the feed. A board
on the approach road to a site is the only thing on the approach road to a
site. The competition is a tree.

## Where it stops working

- When the artwork was drawn for a phone and blown up. Type that reads at
  360px turns to mush at forty feet.
- When there is no number on it, or the number is not the one that gets
  answered.
- When it runs past the launch it was selling.

## What we do about it

The hoarding comes out of the same artwork as the campaign, so the person who
saw the board and the person who saw the reel are looking at one thing, not
two. That is the part most people skip.', false);
insert into posts (slug, title, published, excerpt, tags, body, draft) values (
  'what-a-launch-week-looks-like', 'What a launch week actually looks like', '2026-08-28',
  'Seven days, from the name being signed off to the first enquiry landing in someone''s hand. No theory, just the order things happen in.', array['Launch','Process']::text[], 'Most launch plans are a list of deliverables. This is the order they arrive in,
which is the part that decides whether the week works.

**Monday** — the name and the key visual are signed off. Nothing else starts
until this does, because everything else is cut from it.

**Tuesday and Wednesday** — the creative suite. Every placement you are
actually buying gets its own cut. Not one artwork resized six ways.

**Thursday** — tracking goes in before the spend does. Lead routing is tested
with a real phone and a real person.

**Friday** — ads go live, low, to see what the click costs before the weekend.

**Saturday and Sunday** — the first real numbers. By Monday you know which
creative is carrying the campaign, and the one that is not gets replaced.', false);

commit;
