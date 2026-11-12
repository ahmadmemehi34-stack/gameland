-- =====================================================================
--  ثبت خودت به‌عنوان مدیر سایت
--  ۱) اول در Supabase › Authentication › Users یک کاربر بساز (همان ایمیل و رمز ورود به پنل).
--  ۲) ایمیل زیر را با ایمیل خودت عوض کن و این خط را در SQL Editor اجرا کن.
-- =====================================================================
insert into public.admins (user_id)
select id from auth.users where email = 'YOUR_EMAIL@gmail.com'
on conflict do nothing;

-- برای دیدن اینکه ثبت شد (باید یک ردیف نشان بدهد):
select a.user_id, u.email from public.admins a join auth.users u on u.id = a.user_id;
