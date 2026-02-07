'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!email) {
      setMessage("Email wajib diisi");
      return;
    }
    if (!email.includes("@")) {
      setMessage("Format email tidak valid");
      return;
    }
    if (!password || password.length < 6) {
      setMessage("Kata sandi minimal 6 karakter");
      return;
    }
    const allowed = ["administrator@test.com", "admin@test.com"];
    if (!allowed.includes(email.toLowerCase()) || password !== "123456") {
      setMessage("Email atau kata sandi tidak cocok");
      return;
    }
    const auth = { email };
    try {
      const storage = remember ? window.localStorage : window.sessionStorage;
      storage.setItem("perkasa-finance-auth", JSON.stringify(auth));
      
      // Set cookie for middleware
      const maxAge = remember ? 7 * 24 * 60 * 60 : 0; // 7 days or session
      const expires = remember ? `; max-age=${maxAge}` : '';
      document.cookie = `perkasa-finance-auth=true; path=/${expires}`;
    } catch {}
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center p-8 sm:p-32">
        <div className="flex flex-col items-center gap-6 text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Finance Perkasa
          </h1>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">#juaranyawifi</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800">
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@perkasa.net.id"
              className="w-full p-3 border rounded-lg text-gray-900 dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="minimal 6 karakter"
                className="w-full p-3 border rounded-lg text-gray-900 dark:text-zinc-100 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="mb-6 flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <label htmlFor="remember" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">Ingat Saya</label>
          </div>
          
          {message && (
            <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400 text-center">
                {message}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            Masuk
          </button>
        </form>
      </main>
    </div>
  );
}
