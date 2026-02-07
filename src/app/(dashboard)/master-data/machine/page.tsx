'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, RefreshCw, Plus, Trash2, Search, 
  AlertCircle, CheckCircle2, X, Pencil, Download, FileSpreadsheet 
} from 'lucide-react';
import * as XLSX from 'xlsx';

type MachineUser = {
  uid: number;
  userId: string;
  name: string;
  role: number;
  password?: string;
  cardno?: string;
};

export default function MachineManagementPage() {
  const [users, setUsers] = useState<MachineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [formData, setFormData] = useState({
    uid: 0,
    userId: '',
    name: '',
    role: 0,
    password: '',
    cardno: 0
  });

  const [warning, setWarning] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const res = await fetch('/api/machine/users');
      const data = await res.json();
      
      if (data.status === 'success') {
        setUsers(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!confirm('Apakah Anda yakin ingin menarik data user dari mesin ke database aplikasi? Data yang belum ada akan ditambahkan otomatis.')) return;
    
    setIsSyncing(true);
    setError('');
    setSuccess('');
    setWarning('');
    
    try {
      const res = await fetch('/api/machine/sync', { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'success') {
        setSuccess(data.message);
        if (data.details && data.details.skippedCount > 0) {
            setWarning(`${data.details.skippedCount} user dilewati karena nama tidak valid (angka/kosong). Silakan perbaiki nama di tabel dan sync ulang.`);
        }
      } else {
        throw new Error(data.message || 'Gagal sinkronisasi data');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('PERINGATAN KERAS: Apakah Anda yakin ingin MENGHAPUS SEMUA LOG ABSENSI di mesin?\n\nCATATAN PENTING: Tindakan ini HANYA menghapus riwayat absen. Data Karyawan, Wajah, dan Sidik Jari TETAP AMAN.\n\nTindakan ini tidak dapat dibatalkan. Pastikan data sudah tersinkronisasi atau dibackup sebelumnya.')) return;
    if (!confirm('Konfirmasi ke-2: Yakin hapus log? Data yang hilang tidak bisa dikembalikan.')) return;

    setIsClearing(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch('/api/machine/clear-logs', { method: 'POST' });
      const data = await res.json();
      
      if (data.status === 'success') {
        setSuccess(data.message);
      } else {
        throw new Error(data.message || 'Gagal menghapus log');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setFormData({ uid: 0, userId: '', name: '', role: 0, password: '', cardno: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (user: MachineUser) => {
    setIsEditMode(true);
    setFormData({
      uid: user.uid,
      userId: user.userId,
      name: user.name,
      role: user.role,
      password: user.password || '',
      cardno: user.cardno ? parseInt(user.cardno) : 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const endpoint = isEditMode ? '/api/machine/users/edit' : '/api/machine/users';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        setSuccess(`User berhasil ${isEditMode ? 'diperbarui' : 'ditambahkan'}`);
        setIsModalOpen(false);
        fetchUsers();
      } else {
        throw new Error(data.message || 'Operasi gagal');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (uid: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user ${name} dari mesin?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/machine/users/${uid}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      
      if (data.status === 'success') {
        setSuccess(`User ${name} berhasil dihapus`);
        fetchUsers();
      } else {
        throw new Error(data.message || 'Gagal menghapus user');
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.userId.toString().includes(searchTerm)
  );

  const handleExportExcel = () => {
    if (users.length === 0) {
      setError('Tidak ada data user untuk diexport');
      return;
    }

    const dataToExport = users.map(user => ({
      'User ID': user.userId,
      'Nama': user.name,
      'Role': user.role === 14 ? 'Admin' : 'User',
      'Card No': user.cardno || '-',
      'Password': user.password || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Machine Users");
    
    // Auto-width columns
    const wscols = [
        { wch: 15 }, // User ID
        { wch: 30 }, // Nama
        { wch: 10 }, // Role
        { wch: 15 }, // Card No
        { wch: 15 }  // Password
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Machine_Users_${new Date().toISOString().split('T')[0]}.xlsx`);
    setSuccess('Data berhasil diexport ke Excel');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-blue-600" />
            Manajemen User Mesin
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kelola data user yang tersimpan di mesin fingerprint (ZKTeco)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearLogs}
            disabled={isClearing || isSyncing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Hapus Log Absensi di Mesin"
          >
            <Trash2 className={`w-4 h-4 ${isClearing ? 'animate-pulse' : ''}`} />
            {isClearing ? 'Menghapus...' : 'Hapus Log'}
          </button>

          <button 
            onClick={handleSync}
            disabled={isSyncing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Tarik Data User dari Mesin ke Database"
          >
            <Download className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            {isSyncing ? 'Menarik Data...' : 'Tarik Data'}
          </button>

          <button 
            onClick={handleExportExcel}
            disabled={loading || users.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
            title="Export Data ke Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </button>
          
          <button 
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah User
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-300">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Cari nama atau ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Total User: <span className="font-semibold text-gray-900 dark:text-white">{users.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-neutral-700">
              <tr>
                {/* <th className="px-6 py-3 font-medium">UID (Internal)</th> */}
                <th className="px-6 py-3 font-medium">User ID (Display)</th>
                <th className="px-6 py-3 font-medium">Nama</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <p>Menghubungkan ke mesin...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data user ditemukan
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                    {/* <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{user.uid}</td> */}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{user.userId}</td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {/^\d+$/.test(user.name) ? (
                             <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400" title="Nama tidak valid (angka). Mohon edit.">
                                <AlertCircle className="w-4 h-4" />
                                <span>{user.name}</span>
                             </div>
                        ) : (
                            user.name
                        )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 14 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {user.role === 14 ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.uid, user.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Edit User Mesin' : 'Tambah User Baru'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {isEditMode && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                  UID Internal: {formData.uid} (Tidak dapat diubah)
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User ID (No. Pegawai)
                </label>
                <input 
                  type="text"
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({...formData, userId: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Contoh: 101"
                  readOnly={isEditMode} // Usually we don't change User ID, just Name/Role. But zkteco supports it. Let's make it readOnly to be safe or allow it? Safest is readOnly to avoid duplicates.
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap
                </label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Nama Karyawan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value={0}>User Biasa</option>
                  <option value={14}>Administrator</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan ke Mesin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
