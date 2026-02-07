
# Panduan Setting Vercel (User)

Karena Anda memegang kendali Vercel dan Tim memegang Database, berikut adalah langkah-langkah untuk menyambungkan keduanya.

## 1. Data yang Harus Anda Minta dari Tim
Sebelum setting Vercel, mintalah **Connection String** database MySQL dari tim Anda.

Formatnya biasanya seperti ini:
```
mysql://USER:PASSWORD@HOST:PORT/NAMA_DATABASE
```

*Contoh:*
`mysql://admin:rahasia123@db.perkasa.co.id:3306/finance_db`

> **PENTING UNTUK TIM:**
> Sampaikan pada tim bahwa Database MySQL mereka harus **"Publicly Accessible"** (Bisa diakses dari internet), karena server Vercel berada di cloud. Jika mereka menggunakan firewall, minta mereka untuk mengizinkan koneksi dari mana saja (0.0.0.0/0) namun dengan password yang KUAT.

## 2. Setting di Vercel Dashboard
Setelah Anda mendapatkan Connection String tersebut:

1.  Masuk ke Dashboard Vercel project `finance`.
2.  Pergi ke menu **Settings** > **Environment Variables**.
3.  Tambahkan variable baru:
    *   **Key:** `DATABASE_URL`
    *   **Value:** *(Tempelkan connection string dari Tim di sini)*
4.  Klik **Save**.

## 3. Deployment (Penyatuan)
Setelah variable disimpan:

1.  Pastikan kode di GitHub sudah menggunakan branch yang support MySQL (misalnya branch `main` setelah kode migrasi di-merge).
2.  Pergi ke menu **Deployments** di Vercel.
3.  Klik titik tiga (...) pada deployment terakhir -> **Redeploy**.
4.  Centang "Use existing Build Cache" (opsional) -> Klik **Redeploy**.

Saat proses redeploy, Vercel akan:
1.  Mengambil kode terbaru dari GitHub.
2.  Membaca `DATABASE_URL` yang baru saja Anda set.
3.  Menghubungkan aplikasi ke database MySQL tim.
4.  Online! 🚀

---

## Troubleshooting Umum

**Q: Deployment Gagal dengan error "Can't connect to database"?**
A: Biasanya karena database tim diblokir firewall. Pastikan tim sudah membuka akses public.

**Q: Data kosong setelah deploy?**
A: Ini wajar jika database baru. Minta tim untuk menjalankan script `restore-database.js` yang sudah saya siapkan di GitHub untuk mengisi data awal.
