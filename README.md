# GameLand | گیم‌لند — راهنمای انتشار (۳ قدم)

این پوشه یک سایت کامل و آماده است. سایت فعلاً در «حالت ساده» کار می‌کند (بدون سرور و بدون پایگاه داده) و رایگان روی GitHub Pages منتشر می‌شود.

## قدم ۱: ساخت مخزن
در github.com/new یک مخزن **Public** با اسم `gameland` بساز.

## قدم ۲: آپلود فایل‌ها
زیپ را باز کن (Extract). در صفحه‌ی `github.com/USERNAME/gameland/upload/main` گزینه‌ی **choose your files** را بزن و **همه‌ی فایل‌های داخل پوشه** را انتخاب کن، بعد **Commit changes**.

## قدم ۳: روشن کردن سایت
Settings ← Pages ← Source: **Deploy from branch** ← Branch: **main** و **/(root)** ← Save.
بعد از ۲ تا ۳ دقیقه سایت در `https://USERNAME.github.io/gameland/` باز می‌شود.

## فایل APK
فایل APK را با اسم دقیق `MEGA-GAMES.apk` در همان مخزن آپلود کن؛ دکمه‌ی دانلود APK خودکار روی سایت ظاهر می‌شود.

## افزودن بازی جدید
فایل بازی (مثلاً `my-game.html`) و عکس کاورش را آپلود کن و یک بلوک جدید به `games.json` اضافه کن (یا از من بخواه).

## گوگل (Search Console)
۱) به search.google.com/search-console برو و Add property ← URL prefix را بزن و آدرس سایت را بده.
۲) روش «HTML tag» را انتخاب کن و کد را به‌جای خط کامنت‌شده‌ی `google-site-verification` در `index.html` بگذار.
۳) بعد از Verify، در بخش Sitemaps بنویس `sitemap.xml`.

## مرحله‌ی دوم (اختیاری): پنل مدیریت
برای آپلود بازی از داخل سایت و شمارنده‌ی دانلود: یک پروژه‌ی رایگان Supabase بساز، `setup.sql` را در SQL Editor اجرا کن، یک کاربر بساز و با `make-admin.sql` مدیرش کن، بعد `config.js` را با آدرس و کلید پر کن. پنل در `admin.html` فعال می‌شود.
