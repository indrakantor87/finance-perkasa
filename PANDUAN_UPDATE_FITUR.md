
# Panduan Update Fitur & Database (MySQL)

Dokumen ini menjelaskan cara aman melakukan perubahan pada website dan database setelah migrasi ke MySQL.

## Apakah Aman?
**Sangat Aman.** Justru menggunakan MySQL dengan Prisma ORM jauh lebih aman daripada SQLite karena:
1.  **History Tercatat:** Setiap perubahan database tercatat dalam folder `prisma/migrations`.
2.  **Bisa Di-rollback:** Jika terjadi kesalahan struktur, kita bisa melihat history perubahannya.
3.  **Tidak Mengunci Data:** MySQL bisa menangani banyak request sekaligus (baca/tulis) tanpa membuat web "hang" seperti SQLite.

---

## Cara Melakukan Update Fitur (Workflow)

Setiap kali Anda ingin mengubah struktur data (misal: menambah kolom "No. HP" di tabel Karyawan), ikuti langkah baku ini:

### Langkah 1: Edit Schema
Buka file `prisma/schema.prisma` dan tambahkan field yang diinginkan.

Contoh (Menambah No HP):
```prisma
model Employee {
  // ... field lama ...
  phoneNumber String?  @default("-") // Tanda '?' artinya boleh kosong
}
```

### Langkah 2: Buat Migrasi (Migration)
Jalankan perintah ini di terminal untuk memberitahu MySQL ada perubahan:

```bash
npx prisma migrate dev --name tambah_no_hp_karyawan
```

*Penjelasan:*
- Perintah ini akan membuat file SQL otomatis.
- MySQL akan meng-update tabelnya sendiri.
- Prisma Client di kode web akan ter-update otomatis.

### Langkah 3: Update Kodingan Web
Sekarang Anda bisa menggunakan field baru tersebut di halaman web (misal di form edit karyawan).

```typescript
// Contoh di file page.tsx
<input 
  name="phoneNumber" 
  placeholder="Masukkan No HP" 
  // ...
/>
```

---

## Tips Keamanan Tambahan

1.  **Backup Rutin:**
    MySQL memiliki fitur `mysqldump`. Anda bisa membuat script backup otomatis setiap malam (tim server/IT biasanya paham ini).

2.  **Jangan Ubah Manual di Database:**
    Selalu ubah struktur lewat `schema.prisma` dan perintah `migrate`. Jangan mengubah kolom langsung dari phpMyAdmin atau DBeaver agar sinkronisasi kode tetap terjaga.

3.  **Cek Status:**
    Jika ragu apakah database sudah sinkron, jalankan:
    ```bash
    npx prisma studio
    ```
    Ini akan membuka panel admin database di browser untuk mengecek data secara visual.
