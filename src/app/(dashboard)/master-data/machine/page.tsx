'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, RefreshCw, Plus, Trash2, Search, 
  AlertCircle, CheckCircle2, X, Pencil, Download, FileSpreadsheet, Settings 
} from 'lucide-react';

type MachineUser = {
  uid: number;
  userId: string;
  name: string;
  role: number;
  password?: string;
  cardno?: string;
};

type MachineSettings = {
  id?: string;
  machineIp: string;
  machinePort: number;
};

export default function MachineManagementPage() {
  const [users, setUsers] = useState<MachineUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [machineSettings, setMachineSettings] = useState<MachineSettings>({ machineIp: '', machinePort: 4370 });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
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

  const [isExporting, setIsExporting] = useState(false);
  const [warning, setWarning] = useState('');

  const [selectedUids, setSelectedUids] = useState<number[]>([]);

  const fetchUsers = async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const options: RequestInit = {};
      if (signal) options.signal = signal;
      const res = await fetch('/api/machine/users', options);
      const data = await res.json();
      
      if (data.status === 'success') {
        setUsers(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
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

  const fetchSettings = async (signal?: AbortSignal) => {
    try {
      const options: RequestInit = {};
      if (signal) options.signal = signal;
      const res = await fetch('/api/settings', options);
      const data = await res.json();
      if (data) {
        setMachineSettings({
            id: data.id,
            machineIp: data.machineIp || '103.162.16.14',
            machinePort: data.machinePort || 4370
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch settings', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchUsers(controller.signal);
    fetchSettings(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setError('');
    
    try {
        // We need to fetch current settings first to preserve other fields? 
        // Or rely on Prisma ignoring undefined.
        // But to be safe, let's just send what we have.
        // We need ID.
        if (!machineSettings.id) throw new Error("Settings ID not found");

        const res = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: machineSettings.id,
                machineIp: machineSettings.machineIp,
                machinePort: machineSettings.machinePort
            })
        });
        
        const data = await res.json();
        if (data.id) {
            setSuccess('Konfigurasi mesin berhasil disimpan');
            setIsSettingsOpen(false);
            fetchSettings(); // Refresh
        } else {
            throw new Error(data.error || 'Gagal menyimpan pengaturan');
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSavingSettings(false);
    }
  };

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

  const toggleSelection = (uid: number) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const toggleSelectAll = () => {
    const visibleUids = filteredUsers.map(u => u.uid);
    const allSelected = visibleUids.length > 0 && visibleUids.every(uid => selectedUids.includes(uid));
    
    if (allSelected) {
      setSelectedUids(prev => prev.filter(uid => !visibleUids.includes(uid)));
    } else {
      // Add all visible UIDs that aren't already selected
      const newSelected = [...selectedUids];
      visibleUids.forEach(uid => {
        if (!newSelected.includes(uid)) newSelected.push(uid);
      });
      setSelectedUids(newSelected);
    }
  };

  const handleExportExcel = async () => {
    if (users.length === 0) {
      setError('Tidak ada data user untuk diexport');
      return;
    }

    setIsExporting(true);
    setSuccess('Sedang mengambil data log asli dari mesin...');
    setError('');

    try {
      // 1. Identify Target Users
      const targetUsers = selectedUids.length > 0 
        ? users.filter(u => selectedUids.includes(u.uid))
        : users;
        
      const targetUserIds = targetUsers.map(u => u.userId);

      // 2. Fetch Logs from Machine via API
      const res = await fetch('/api/machine/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: targetUserIds })
      });
      const result = await res.json();
      
      if (result.status !== 'success') {
          throw new Error(result.message || 'Gagal mengambil log');
      }

      const logs = result.data || [];
      console.log(`Fetched ${logs.length} logs for export`);

      // 3. Common Column Settings (Matches ZKTime Format)
      const wscols = [
        { wch: 15 }, // AC-No.
        { wch: 8 },  // No.
        { wch: 30 }, // Name
        { wch: 20 }, // Time
        { wch: 10 }, // State
        { wch: 15 }, // New State
        { wch: 15 }, // Exception
        { wch: 10 }  // Operation
      ];

      // Helper to map status to State string
      const getStateLabel = (status: number | string | undefined) => {
          const s = Number(status);
          switch(s) {
              case 0: return 'C/In';
              case 1: return 'C/Out';
              case 2: return 'Break Out';
              case 3: return 'Break In';
              case 4: return 'OT-In';
              case 5: return 'OT-Out';
              default: return 'C/In'; // Default to C/In if unknown
          }
      };

      // Helper to detect Exceptions & Apply Smart Logic
      const processLogsWithExceptions = (userLogs: any[]) => {
          // Sort by time
          const sorted = [...userLogs].sort((a: any, b: any) => 
            new Date(a.record_time || a.recordTime).getTime() - new Date(b.record_time || b.recordTime).getTime()
          );

          return sorted.map((log, idx) => {
              // Handle field names from both libraries (zkteco-js: record_time, node-zklib: recordTime)
              const timeStr = log.record_time || log.recordTime;
              const currentMsg = new Date(timeStr);
              let exception = '';
              
              // Check for Repeat (within 2 minutes of previous log)
              if (idx > 0) {
                  const prevLog = sorted[idx-1];
                  const prevTimeStr = prevLog.record_time || prevLog.recordTime;
                  const prevMsg = new Date(prevTimeStr);
                  const diffMs = currentMsg.getTime() - prevMsg.getTime();
                  if (diffMs < 2 * 60 * 1000) { // 2 minutes
                      exception = 'Repeat';
                  }
              }

              const hour = currentMsg.getHours();
              // Get raw state (zkteco-js: state, node-zklib: status/state)
              const rawState = log.state !== undefined ? log.state : (log.status ?? 0);
              let state = getStateLabel(rawState);
              
              // Use raw state from machine (0=CheckIn, 1=CheckOut, etc.)
              // We do NOT infer state based on time to preserve data integrity ("Data Real")
              // (Logic for smart inference removed to show exact machine data)

              // Simple OverTime detection (if after 17:00 and is Check Out)
              if (state === 'C/Out' && hour >= 17) {
                  if (exception) exception += ', OverTime';
                  else exception = 'OverTime';
              }

              return {
                  ...log,
                  _recordTime: currentMsg, // Normalized Date object
                  _stateLabel: state,
                  _exception: exception
              };
          });
      };

      // 4. Scenario 1: Export Selected Users (Separate Files)
      if (selectedUids.length > 0) {
        
        // Process sequentially to stagger downloads
        const XLSXModule = await import('xlsx');
        const XLSX = (XLSXModule as any).default || XLSXModule;

        targetUsers.forEach((user, index) => {
          // Filter logs for this user (handle both user_id formats)
          const rawUserLogs = logs.filter((l: any) => {
              const logUid = String(l.user_id || l.deviceUserId);
              return logUid === String(user.userId);
          });
          
          const processedLogs = processLogsWithExceptions(rawUserLogs);

          const dataToExport = processedLogs.length > 0 ? processedLogs.map((l: any) => ({
            'AC-No.': user.userId,
            'No.': '',
            'Name': user.name,
            'Time': l._recordTime.toLocaleString('id-ID'), // e.g. 02/02/2026 08:00:00
            'State': l._stateLabel,
            'New State': '',
            'Exception': l._exception,
            'Operation': ''
          })) : [{
             'AC-No.': user.userId,
             'No.': '',
             'Name': user.name,
             'Time': 'TIDAK ADA DATA LOG',
             'State': '',
             'New State': '',
             'Exception': '',
             'Operation': ''
          }];

          const ws = XLSX.utils.json_to_sheet(dataToExport);
          const wb = XLSX.utils.book_new();
          ws['!cols'] = wscols;
          XLSX.utils.book_append_sheet(wb, ws, "Log Absensi");
          
          // Stagger downloads
          setTimeout(() => {
             const safeName = user.name.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
             XLSX.writeFile(wb, `Log_${safeName || user.userId}_${new Date().toISOString().split('T')[0]}.xlsx`);
          }, index * 800);
        });
        
        setSuccess(`Sedang memproses download ${targetUsers.length} file Log Absensi...`);
      } 
      // 5. Scenario 2: Export All Users (Single File)
      else {
        // Group by user to process exceptions correctly per user
        let allProcessedLogs: any[] = [];
        
        users.forEach(user => {
            const rawUserLogs = logs.filter((l: any) => {
                const logUid = String(l.user_id || l.deviceUserId);
                return logUid === String(user.userId);
            });
            const processed = processLogsWithExceptions(rawUserLogs).map(l => ({
                ...l,
                _userName: user.name,
                _userId: user.userId
            }));
            allProcessedLogs = [...allProcessedLogs, ...processed];
        });

        // Sort all by time
        allProcessedLogs.sort((a: any, b: any) => a._recordTime.getTime() - b._recordTime.getTime());

        const XLSXModule = await import('xlsx');
        const XLSX = (XLSXModule as any).default || XLSXModule;

        const dataToExport = allProcessedLogs.map((l: any) => ({
            'AC-No.': l._userId,
            'No.': '',
            'Name': l._userName,
            'Time': l._recordTime.toLocaleString('id-ID'),
            'State': l._stateLabel,
            'New State': '',
            'Exception': l._exception,
            'Operation': ''
        }));

        if (dataToExport.length === 0) {
             dataToExport.push({ 
                 'AC-No.': '-', 'No.': '', 'Name': '-', 'Time': 'TIDAK ADA DATA LOG', 
                 'State': '', 'New State': '', 'Exception': '', 'Operation': '' 
            });
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        ws['!cols'] = wscols;
        XLSX.utils.book_append_sheet(wb, ws, "Semua Log Absensi");
        
        XLSX.writeFile(wb, `Machine_Logs_All_${new Date().toISOString().split('T')[0]}.xlsx`);
        setSuccess(`Berhasil mengexport ${logs.length} data log ke Excel`);
      }

    } catch (err: any) {
      setError('Gagal export: ' + err.message);
    } finally {
      setIsExporting(false);
    }
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
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Machine Controls Group */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
                <button 
                    onClick={() => fetchUsers()}
                    disabled={loading}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-neutral-700 rounded-md transition-all"
                    title="Refresh Data dari Mesin"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="h-8 w-px bg-gray-300 dark:bg-neutral-700 mx-1 hidden md:block"></div>

            {/* Data Operations Group */}
            <button 
                onClick={handleSync}
                disabled={isSyncing || loading}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all shadow-sm disabled:opacity-50 text-sm font-medium"
                title="Tarik Data User dari Mesin ke Database"
            >
                <Download className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Menarik...' : 'Tarik Data'}</span>
            </button>

            <button 
                onClick={handleExportExcel}
                disabled={loading || users.length === 0 || isExporting}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg transition-all shadow-sm disabled:opacity-50 text-sm font-medium"
                title={selectedUids.length > 0 ? `Export Log ${selectedUids.length} User Terpilih` : "Export Semua Log"}
            >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">{isExporting ? 'Proses...' : 'Export Log'}</span>
            </button>

            <div className="h-8 w-px bg-gray-300 dark:bg-neutral-700 mx-1 hidden md:block"></div>

            {/* Primary Actions Group */}
            <button 
                onClick={handleClearLogs}
                disabled={isClearing || isSyncing || loading}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-transparent hover:border-red-200 rounded-lg transition-all disabled:opacity-50 text-sm font-medium"
                title="Hapus Log Absensi di Mesin"
            >
                <Trash2 className={`w-4 h-4 ${isClearing ? 'animate-pulse' : ''}`} />
                <span className="hidden sm:inline">{isClearing ? 'Menghapus...' : 'Hapus Log'}</span>
            </button>
          
            <button 
                onClick={openAddModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                <span>Tambah User</span>
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
                <th className="px-6 py-3 font-medium w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUids.includes(u.uid))}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                </th>
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
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                      <p>Menghubungkan ke mesin...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data user ditemukan
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedUids.includes(user.uid)}
                        onChange={() => toggleSelection(user.uid)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </td>
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

      {/* Settings Modal removed: konfigurasi dipindahkan ke Master Data → Konfigurasi Server */}

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
