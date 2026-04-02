create extension if not exists pgcrypto;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  distance text not null check (distance in ('가깝다', '적당', '멀다')),
  price text not null check (price in ('싸다', '적당', '비싸다')),
  waiting boolean not null default false,
  recommended_menu text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  nickname text not null,
  day_label text,
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5.0),
  waiting boolean not null default false,
  distance text not null check (distance in ('가깝다', '적당', '멀다')),
  price text not null check (price in ('싸다', '적당', '비싸다')),
  recommended_menu text,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.restaurants enable row level security;
alter table public.notes enable row level security;

drop policy if exists "Anyone can read restaurants" on public.restaurants;
create policy "Anyone can read restaurants"
  on public.restaurants for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert restaurants" on public.restaurants;
create policy "Anyone can insert restaurants"
  on public.restaurants for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anyone can update restaurants" on public.restaurants;
create policy "Anyone can update restaurants"
  on public.restaurants for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "Anyone can read notes" on public.notes;
create policy "Anyone can read notes"
  on public.notes for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert notes" on public.notes;
create policy "Anyone can insert notes"
  on public.notes for insert
  to anon, authenticated
  with check (true);

insert into public.restaurants (name, category, distance, price, waiting, recommended_menu, created_by)
values
  ('동래복국', '한식', '적당', '적당', true, '복칼국수, 볶음밥', '예지'),
  ('롤드', '일식', '적당', '적당', false, '초밥 도시락', '하늘'),
  ('록스플레이트', '일식', '멀다', '싸다', true, '돼지사골라멘', '민수')
on conflict do nothing;
