'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, RefreshCw, FileText, Activity, ChevronRight, Sparkles, Settings, Users, Send, MessageSquare, Zap, HelpCircle, Calendar, DollarSign, Mic, MicOff, BarChart3, Bell } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

interface Message {
  id: string;
  text: React.ReactNode;
  sender: 'user' | 'ai';
  timestamp: Date;
  action?: () => void;
  actionLabel?: string;
  component?: React.ReactNode; // For Rich Content (Charts, Stats, etc.)
}

// Type definition for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'chat'>('menu');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      text: 'Halo! Saya asisten pintar Perkasa. Ada yang bisa saya bantu hari ini?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeTab, isTyping]);

  // Context-aware tips
  useEffect(() => {
    if (!isOpen) return;

    let tip = '';
    if (pathname === '/master-data/machine') {
      tip = 'Tips: Pastikan koneksi jaringan stabil sebelum melakukan sinkronisasi data mesin.';
    } else if (pathname === '/employees') {
      tip = 'Tips: Anda bisa menggunakan fitur Import Excel untuk menambahkan banyak data karyawan sekaligus.';
    } else if (pathname === '/reports') {
      tip = 'Tips: Grafik laporan dapat membantu menganalisis tren keterlambatan karyawan.';
    }

    if (tip) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.text !== tip) {
        // Logic to add tip could go here if needed, currently disabled to avoid spam
      }
    }
  }, [pathname, isOpen]);

  // Voice Recognition Logic
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'id-ID'; // Indonesian
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        // Optional: Auto-send after voice
        // handleSendMessage(undefined, transcript);
      };

      recognition.start();
    } else {
      alert('Browser Anda tidak mendukung fitur perintah suara.');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim()) return;

    // User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Process Command (Enhanced Logic)
    // Simulate AI thinking delay
    setTimeout(async () => {
      if (!isMounted.current) return;
      const lowerInput = textToSend.toLowerCase();
      let responseText: React.ReactNode = 'Maaf, saya belum mengerti perintah tersebut. Coba kata kunci seperti "karyawan", "laporan", atau "sinkronisasi".';
      let action = undefined;
      let actionLabel = undefined;
      let component = undefined;

      // --- COMMAND PROCESSING LOGIC ---

      // 1. Data Retrieval Commands (New!)
      if (lowerInput.includes('total karyawan') || lowerInput.includes('jumlah karyawan') || lowerInput.includes('berapa karyawan')) {
        try {
          const res = await fetch('/api/employees');
          if (!isMounted.current) return;
          if (res.ok) {
            const data = await res.json();
            if (!isMounted.current) return;
            const count = data.length || 0;
            responseText = `Saat ini terdapat total ${count} karyawan terdaftar dalam sistem.`;
            
            component = (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30 mt-2 flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-800 rounded-full text-orange-600 dark:text-orange-200">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-xs text-orange-600 dark:text-orange-300 font-medium uppercase">Total Karyawan</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{count}</p>
                </div>
              </div>
            );
            
            action = () => router.push('/employees');
            actionLabel = 'Lihat Detail';
          } else {
            responseText = 'Maaf, saya gagal mengambil data karyawan saat ini.';
          }
        } catch (err) {
          responseText = 'Terjadi kesalahan koneksi saat mengambil data.';
        }
      }
      else if (lowerInput.includes('notifikasi') || lowerInput.includes('pesan') || lowerInput.includes('alert')) {
        try {
          const res = await fetch('/api/notifications');
          if (!isMounted.current) return;
          if (res.ok) {
            const data = await res.json();
            if (!isMounted.current) return;
            const unreadCount = data.filter((n: any) => !n.isRead).length;
            responseText = unreadCount > 0 
              ? `Anda memiliki ${unreadCount} notifikasi baru yang belum dibaca.`
              : 'Tidak ada notifikasi baru saat ini.';
            
            component = (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30 mt-2 flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200">
                  <Bell size={24} />
                </div>
                <div>
                  <p className="text-xs text-red-600 dark:text-red-300 font-medium uppercase">Notifikasi Baru</p>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{unreadCount}</p>
                </div>
              </div>
            );
            
            action = () => router.push('/notifications');
            actionLabel = 'Buka Notifikasi';
          }
        } catch (err) {
          responseText = 'Gagal mengambil data notifikasi.';
        }
      }
      else if (lowerInput.includes('status mesin') || lowerInput.includes('koneksi mesin') || lowerInput.includes('log mesin')) {
         responseText = 'Mengecek status koneksi mesin...';
         // Simulation of machine check
         component = (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 mt-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">Sistem Online</span>
                </div>
                <div className="space-y-2 text-xs text-blue-700 dark:text-blue-300">
                    <div className="flex justify-between">
                        <span>Database:</span>
                        <span className="font-mono">Connected (12ms)</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Fingerprint Device:</span>
                        <span className="font-mono">Ready</span>
                    </div>
                </div>
            </div>
         );
         action = () => router.push('/master-data/machine');
         actionLabel = 'Log Lengkap';
      }

      // 2. Knowledge Base (New!)
      else if (lowerInput.includes('cara') || lowerInput.includes('bagaimana') || lowerInput.includes('tanya')) {
        const kb: Record<string, string> = {
            'tambah karyawan': 'Untuk menambah karyawan, buka halaman Data Karyawan, lalu klik tombol "Tambah Karyawan" di pojok kanan atas.',
            'slip gaji': 'Slip gaji dibuat otomatis setiap bulan. Anda bisa mencetaknya di menu Penggajian > Slip Gaji.',
            'absensi': 'Data absensi ditarik dari mesin fingerprint. Gunakan menu "Sync Mesin" untuk memperbarui data terbaru.',
            'lupa password': 'Hubungi administrator IT untuk mereset password akun Anda.',
            'dark mode': 'Klik ikon bulan/matahari di pojok kanan atas layar untuk mengubah tema.',
        };
        
        const foundKey = Object.keys(kb).find(k => lowerInput.includes(k));
        if (foundKey) {
            responseText = kb[foundKey];
        } else {
            responseText = 'Maaf, saya tidak menemukan panduan untuk topik tersebut. Coba kata kunci lain seperti "tambah karyawan" atau "slip gaji".';
        }
      }
      
      // 3. Navigation Rules
      else if (lowerInput.includes('karyawan') || lowerInput.includes('pegawai') || lowerInput.includes('staff')) {
        responseText = 'Membuka halaman Data Karyawan...';
        action = () => router.push('/employees');
        actionLabel = 'Buka Data Karyawan';
      } else if (lowerInput.includes('laporan') || lowerInput.includes('report') || lowerInput.includes('grafik')) {
        responseText = 'Membuka halaman Laporan...';
        action = () => router.push('/reports');
        actionLabel = 'Lihat Laporan';
      } else if (lowerInput.includes('mesin') || lowerInput.includes('sync') || lowerInput.includes('sinkron')) {
        responseText = 'Membuka halaman Manajemen Mesin...';
        action = () => router.push('/master-data/machine');
        actionLabel = 'Kelola Mesin';
      } else if (lowerInput.includes('izin') || lowerInput.includes('cuti') || lowerInput.includes('sakit')) {
        responseText = 'Membuka halaman Izin & Cuti...';
        action = () => router.push('/permissions');
        actionLabel = 'Kelola Izin';
      } else if (lowerInput.includes('gaji') || lowerInput.includes('salary') || lowerInput.includes('slip')) {
        responseText = 'Membuka halaman Penggajian...';
        action = () => router.push('/salary');
        actionLabel = 'Lihat Penggajian';
      } else if (lowerInput.includes('setting') || lowerInput.includes('pengaturan') || lowerInput.includes('konfigurasi')) {
        responseText = 'Membuka halaman Pengaturan Sistem...';
        action = () => router.push('/settings');
        actionLabel = 'Buka Pengaturan';
      } 
      
      // 3. Info/Chat Rules
      else if (lowerInput.includes('halo') || lowerInput.includes('hai') || lowerInput.includes('selamat')) {
        responseText = 'Halo! Senang bertemu Anda. Silakan pilih menu atau ketik perintah yang Anda butuhkan.';
      } else if (lowerInput.includes('siapa kamu') || lowerInput.includes('bot') || lowerInput.includes('ai')) {
        responseText = 'Saya adalah Asisten AI Perkasa, dirancang untuk membantu operasional sistem HR & Finance Anda.';
      } else if (lowerInput.includes('bantuan') || lowerInput.includes('help')) {
        responseText = (
          <div className="space-y-1">
            <p>Saya bisa membantu navigasi dan cek data. Coba katakan:</p>
            <ul className="list-disc pl-4 text-xs space-y-1">
              <li>"Buka data karyawan"</li>
              <li>"Berapa jumlah karyawan?"</li>
              <li>"Saya mau sinkronisasi mesin"</li>
              <li>"Lihat laporan bulanan"</li>
            </ul>
          </div>
        );
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: 'ai',
        timestamp: new Date(),
        action,
        actionLabel,
        component
      };

      if (isMounted.current) {
        setIsTyping(false);
        setMessages(prev => [...prev, aiMsg]);
      }
      
      // Auto-execute navigation logic (kept simple)
      if (action && (lowerInput.includes('buka') || lowerInput.includes('pergi') || lowerInput.includes('lihat'))) {
        setTimeout(() => {
           // Optional: Auto-redirect
        }, 1500);
      }

    }, 1000 + Math.random() * 500); // Variable natural delay
  };

  const quickActions = [
    { 
      label: 'Sync Mesin', 
      icon: RefreshCw, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      action: () => router.push('/master-data/machine') 
    },
    { 
      label: 'Data Karyawan', 
      icon: Users, 
      color: 'text-orange-500', 
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      action: () => router.push('/employees') 
    },
    { 
      label: 'Laporan', 
      icon: FileText, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      action: () => router.push('/reports') 
    },
    { 
      label: 'Izin & Cuti', 
      icon: Calendar, 
      color: 'text-purple-500', 
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      action: () => router.push('/permissions') 
    }
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-xl transition-all duration-300 z-50 flex items-center justify-center border border-white/20 backdrop-blur-sm ${
          isOpen 
            ? 'bg-red-500/80 rotate-90 text-white hover:bg-red-600/90' 
            : 'bg-gradient-to-br from-red-600/80 to-blue-600/80 hover:scale-110 text-white hover:shadow-blue-500/50'
        }`}
        title="Perkasa AI Assistant"
      >
        {isOpen ? (
          <X size={32} />
        ) : (
          <div className="relative w-12 h-12 animate-pulse-slow">
            <img 
              src="/uploads/logo-ai.png" 
              alt="AI Logo" 
              className="object-contain w-full h-full" 
            />
          </div>
        )}
      </button>

      {/* Main Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-neutral-800/50 z-50 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200 flex flex-col max-h-[80vh]">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600/80 to-purple-600/80 backdrop-blur-md p-4 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <img 
                  src="/uploads/logo-ai.png" 
                  alt="AI Background" 
                  width={100} 
                  height={100} 
                  className="object-contain grayscale" 
                />
            </div>
            <div className="flex items-center gap-3 text-white relative z-10">
              <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner">
                <img 
                  src="/uploads/logo-ai.png" 
                  alt="AI Logo" 
                  width={24} 
                  height={24} 
                  className="object-contain" 
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">Perkasa AI</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <p className="text-indigo-100 text-xs">Online • Siap Membantu</p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex mt-4 bg-black/20 p-1 rounded-lg backdrop-blur-sm">
                <button 
                  onClick={() => setActiveTab('menu')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === 'menu' 
                      ? 'bg-white/90 text-indigo-600 shadow-sm backdrop-blur-sm' 
                      : 'text-indigo-100 hover:bg-white/10'
                  }`}
                >
                  <Zap size={14} />
                  Menu
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeTab === 'chat' 
                      ? 'bg-white/90 text-indigo-600 shadow-sm backdrop-blur-sm' 
                      : 'text-indigo-100 hover:bg-white/10'
                  }`}
                >
                  <MessageSquare size={14} />
                  Chat
                </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/20 dark:bg-neutral-900/20 backdrop-blur-sm">
            
            {/* MENU TAB */}
            {activeTab === 'menu' && (
              <div className="p-4 space-y-4">
                {/* Status Card */}
                <div className="bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm p-3 rounded-xl border border-gray-100/50 dark:border-neutral-700/50 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-gray-400 uppercase">STATUS SISTEM</span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50/50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100/50 dark:border-green-900/30">
                      100% Operasional
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-gray-50/50 dark:bg-neutral-700/30 p-2 rounded-lg">
                       <span className="text-[10px] text-gray-400 block">Database</span>
                       <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Terhubung</span>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-neutral-700/30 p-2 rounded-lg">
                       <span className="text-[10px] text-gray-400 block">Latensi</span>
                       <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">24ms</span>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div>
                  <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={12} />
                    Pintasan
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          action.action();
                          setIsOpen(false);
                        }}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-neutral-700/80 transition-all border border-gray-100/50 dark:border-neutral-700/50 shadow-sm hover:shadow-md group text-center"
                      >
                        <div className={`p-2 rounded-full ${action.bg} ${action.color} group-hover:scale-110 transition-transform bg-opacity-80`}>
                          <action.icon size={20} />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context Tip */}
                <div className="bg-indigo-50/60 dark:bg-indigo-900/10 backdrop-blur-sm p-3 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <Sparkles size={16} className="text-indigo-500" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-1">Saran AI</h5>
                    <p className="text-xs text-indigo-600/80 dark:text-indigo-300 leading-relaxed">
                      {pathname === '/master-data/machine' 
                        ? 'Pastikan mesin terhubung ke jaringan yang sama sebelum sinkronisasi.' 
                        : pathname === '/employees'
                        ? 'Data karyawan yang lengkap memudahkan perhitungan gaji otomatis.'
                        : 'Gunakan fitur pencarian global untuk menemukan data dengan cepat.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] space-y-2`}>
                        <div className={`rounded-2xl p-3 text-sm shadow-sm ${
                          msg.sender === 'user' 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm text-gray-700 dark:text-gray-200 border border-gray-100/50 dark:border-neutral-700/50 rounded-bl-none'
                        }`}>
                          <div className="mb-1">{msg.text}</div>
                        </div>
                        
                        {/* Rich Content Component */}
                        {msg.component && (
                          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {msg.component}
                          </div>
                        )}

                        {/* Action Button */}
                        {msg.action && (
                          <button 
                            onClick={() => {
                              msg.action?.();
                              setIsOpen(false);
                            }}
                            className="inline-flex text-xs bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-neutral-700 px-3 py-1.5 rounded-full items-center gap-1 transition-colors shadow-sm"
                          >
                            {msg.actionLabel || 'Lihat'} <ChevronRight size={12} />
                          </button>
                        )}
                        
                        <span className={`text-[10px] block opacity-60 px-1 ${msg.sender === 'user' ? 'text-right text-indigo-100' : 'text-left text-gray-400'}`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex justify-start">
                       <div className="bg-white/70 dark:bg-neutral-800/70 backdrop-blur-sm border border-gray-100/50 dark:border-neutral-700/50 rounded-2xl rounded-bl-none p-3 shadow-sm flex gap-1 items-center">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                       </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-t border-gray-100/50 dark:border-neutral-800/50 shrink-0">
                  <div className="relative flex items-center gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={isListening ? "Mendengarkan..." : "Ketik perintah..."}
                      className={`w-full bg-gray-100/50 dark:bg-neutral-800/50 backdrop-blur-sm text-gray-800 dark:text-gray-200 text-sm rounded-full py-2.5 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${isListening ? 'ring-2 ring-red-500/50 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                    />
                    
                    {/* Voice Button */}
                    <button
                      type="button"
                      onClick={startListening}
                      className={`absolute right-12 p-1.5 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-indigo-600'}`}
                    >
                      {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    {/* Send Button */}
                    <button 
                      type="submit"
                      disabled={!inputValue.trim()}
                      className="absolute right-1.5 p-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}