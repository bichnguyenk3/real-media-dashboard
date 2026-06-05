# REAL Media Dashboard

Dashboard quản lý content cho team media REAL Clothes.
**Realtime** — mọi người thấy cập nhật ngay lập tức, data không bao giờ mất.

---

## Setup (làm 1 lần duy nhất)

### Bước 1 — Tạo Supabase project (database + storage)

1. Vào **https://supabase.com** → Sign up / Login bằng Google
2. Bấm **New project** → đặt tên `real-media-dashboard` → chọn region **Southeast Asia (Singapore)** → tạo password bất kỳ → **Create project**
3. Đợi ~1 phút cho project khởi tạo xong
4. Vào **SQL Editor** (menu trái) → paste toàn bộ nội dung file `supabase/migrations/001_init.sql` → bấm **Run**
5. Vào **Storage** → **New bucket** → đặt tên `post-files`, tick **Public** → Create
6. Tạo thêm bucket `pb-files`, tick **Public** → Create
7. Vào **Settings → API** → copy 2 giá trị:
   - `Project URL` → dán vào `.env.local` chỗ `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → dán vào `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Bước 2 — Tạo file `.env.local`

```bash
cp .env.example .env.local
# rồi mở .env.local, dán URL và key từ bước 1 vào
```

### Bước 3 — Copy ảnh sản phẩm vào public/

```bash
mkdir -p public/products
# copy 9 ảnh sản phẩm (1.jpg → 9.jpg) vào thư mục public/products/
# copy Logo_nền_kem.jpg vào public/ đổi tên thành logo.jpg
```

### Bước 4 — Chạy local để test

```bash
npm install
npm run dev
# Mở http://localhost:3000
```

---

## Deploy lên Vercel (free, link cố định, cả team dùng chung)

### Bước 1 — Push code lên GitHub

```bash
git init
git add .
git commit -m "init"
# Tạo repo mới trên github.com rồi:
git remote add origin https://github.com/YOUR_USERNAME/real-media-dashboard.git
git push -u origin main
```

### Bước 2 — Deploy trên Vercel

1. Vào **https://vercel.com** → Login bằng GitHub
2. Bấm **Add New Project** → chọn repo `real-media-dashboard`
3. Vào **Environment Variables** → thêm 2 biến:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL từ bước Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = key từ bước Supabase
4. Bấm **Deploy**
5. Đợi ~2 phút → Vercel cho link dạng `https://real-media-dashboard.vercel.app`

**Gửi link đó cho cả team là xài được luôn, không cần làm gì thêm.**

---

## Tính năng

| Tab | Tính năng |
|-----|-----------|
| **Content Plan** | Lịch 7 ngày × 5 khung giờ, dropdown pillar, toggle Ảnh/Video, nav 52 tuần |
| **Theo dõi tiến độ** | Xem tuần (click badge cycle trạng thái), xem ngày (nhập nội dung, upload file, feedback realtime) |
| **Poster / Banner** | Theo tháng, upload ảnh, lightbox, deadline, ghi chú, trạng thái |

## Realtime

- Mọi thay đổi trạng thái, nội dung, feedback đồng bộ ngay lập tức cho tất cả người đang mở web
- Không cần refresh trang
- Data lưu vĩnh viễn trên Supabase (free tier: 500MB, đủ dùng nhiều năm)

---

## Stack

- **Next.js 14** — frontend
- **Supabase** — database PostgreSQL + realtime + file storage
- **Vercel** — hosting (free)
- **Montserrat** — font
