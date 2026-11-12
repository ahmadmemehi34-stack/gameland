-- =====================================================================
--  GameLand | گیم‌لند  —  راه‌اندازی پایگاه داده و فضای ذخیره‌سازی
--  این فایل را کامل در Supabase › SQL Editor پیست کن و Run بزن.
--  (می‌توانی چند بار اجرایش کنی؛ مشکلی پیش نمی‌آید.)
-- =====================================================================

-- ۱) جدول مدیران (فقط کاربرهایی که اینجا ثبت شوند اجازه‌ی مدیریت دارند)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;   -- بدون policy: از بیرون قابل خواندن نیست

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- ۲) جدول بازی‌ها
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  short_desc  text,
  description text,
  category    text not null default 'arcade' check (category in ('car','shooter','puzzle','arcade','other')),
  cover_url   text,
  screenshots text[] not null default '{}',
  apk_url     text,  apk_size  bigint,
  zip_url     text,  zip_size  bigint,
  html_url    text,  html_size bigint,
  play_url    text,
  downloads   bigint not null default 0,
  featured    boolean not null default false,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists games_created_idx on public.games (created_at desc);

alter table public.games enable row level security;
drop policy if exists "games_read"   on public.games;
drop policy if exists "games_insert" on public.games;
drop policy if exists "games_update" on public.games;
drop policy if exists "games_delete" on public.games;
create policy "games_read"   on public.games for select using (published or public.is_admin());
create policy "games_insert" on public.games for insert to authenticated with check (public.is_admin());
create policy "games_update" on public.games for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "games_delete" on public.games for delete to authenticated using (public.is_admin());

-- ۳) شمارنده‌ی دانلود (همه می‌توانند فقط همین یک تابع را صدا بزنند)
create or replace function public.increment_downloads(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.games set downloads = downloads + 1 where id = p_id and published;
$$;
grant execute on function public.increment_downloads(uuid) to anon, authenticated;

-- ۴) فضای ذخیره‌سازی فایل‌ها (covers = عکس‌ها ، gamefiles = APK / ZIP / HTML)
insert into storage.buckets (id, name, public, file_size_limit) values
  ('covers',    'covers',    true,  5242880),     --  ۵ مگابایت
  ('gamefiles', 'gamefiles', true, 52428800)      -- ۵۰ مگابایت (سقف نسخه‌ی رایگان)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "gl_read"   on storage.objects;
drop policy if exists "gl_insert" on storage.objects;
drop policy if exists "gl_update" on storage.objects;
drop policy if exists "gl_delete" on storage.objects;
create policy "gl_read"   on storage.objects for select using (bucket_id in ('covers','gamefiles'));
create policy "gl_insert" on storage.objects for insert to authenticated with check (bucket_id in ('covers','gamefiles') and public.is_admin());
create policy "gl_update" on storage.objects for update to authenticated using (bucket_id in ('covers','gamefiles') and public.is_admin()) with check (bucket_id in ('covers','gamefiles') and public.is_admin());
create policy "gl_delete" on storage.objects for delete to authenticated using (bucket_id in ('covers','gamefiles') and public.is_admin());
