'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    } catch {}
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-center">
        <div className="flex flex-col items-center gap-6 text-center sm:items-center sm:text-center">
          <h1 className="max-w-md text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Finance Perkasa
          </h1>
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">#juaranyawifi</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-lg shadow">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@perkasa.net.id"
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kata Sandi</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimal 6 karakter"
              className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="remember" className="text-sm text-gray-700 dark:text-gray-300">Ingat Saya</label>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-bold"
          >
            Masuk
          </button>
          {message && <p className="text-red-600 mt-3">{message}</p>}
        </form>
      </main>
    </div>
  );
}
