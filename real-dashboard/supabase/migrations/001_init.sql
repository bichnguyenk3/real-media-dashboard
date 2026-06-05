-- REAL Media Dashboard – Database Schema

-- Posts table (content plan + tracking)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  week_offset integer not null,
  day_index integer not null,        -- 0=T2 ... 6=CN
  slot text not null,                -- '09:00' | '11:30' | '14:00' | '19:30' | '21:00'
  pillar text not null default 'rs', -- rs | gr | rc | ct | dp | sb
  format text not null default 'img',-- img | vid
  content text default '',
  status text not null default 'pending', -- pending|waiting|approved|posted|feedback|edited
  updated_at timestamptz default now(),
  unique(week_offset, day_index, slot)
);

-- Post images
create table if not exists post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  url text not null,
  created_at timestamptz default now()
);

-- Feedback messages
create table if not exists feedbacks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade,
  role text not null default 'lead', -- lead | member
  message text not null,
  created_at timestamptz default now()
);

-- Poster / Banner items
create table if not exists pb_items (
  id uuid primary key default gen_random_uuid(),
  month_offset integer not null,
  type text not null,               -- poster | banner
  position integer not null,
  name text default '',
  status text not null default 'pending',
  deadline date,
  note text default '',
  img_url text,
  updated_at timestamptz default now(),
  unique(month_offset, type, position)
);

-- Enable realtime on all tables
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table feedbacks;
alter publication supabase_realtime add table pb_items;

-- RLS: allow all for now (tighten later with auth)
alter table posts enable row level security;
alter table post_images enable row level security;
alter table feedbacks enable row level security;
alter table pb_items enable row level security;

create policy "allow all" on posts for all using (true) with check (true);
create policy "allow all" on post_images for all using (true) with check (true);
create policy "allow all" on feedbacks for all using (true) with check (true);
create policy "allow all" on pb_items for all using (true) with check (true);
