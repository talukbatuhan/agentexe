import Link from 'next/link'
import { Shield, Monitor, Activity } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-500/20 p-6 rounded-2xl backdrop-blur-xl border border-purple-500/30">
              <Shield className="w-16 h-16 text-purple-400" />
            </div>
          </div>

          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            HomeGuardian
          </h1>

          <p className="text-xl text-slate-300 mb-8">
            Çocuklarınızın bilgisayarını uzaktan izleyin ve kontrol edin
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              Kontrol Paneline Git
            </Link>

            <Link
              href="/devices"
              className="px-8 py-4 bg-white/10 backdrop-blur-xl rounded-xl font-semibold text-white hover:bg-white/20 transition-all duration-300 border border-white/20"
            >
              Cihazları Yönet
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
            <Monitor className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Uzaktan Kontrol</h3>
            <p className="text-slate-400 text-sm">
              Bilgisayarı kilitleyin, uygulamaları kapatın ve anında mesaj gönderin
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
            <Activity className="w-10 h-10 text-pink-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Canlı İzleme</h3>
            <p className="text-slate-400 text-sm">
              Aktif pencereleri, CPU ve RAM kullanımını gerçek zamanlı görün
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300">
            <Shield className="w-10 h-10 text-blue-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Güvenli ve Özel</h3>
            <p className="text-slate-400 text-sm">
              Supabase güvenliği ile uçtan uca şifrelenmiş komutlar
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-sm font-medium">Sistem Çevrimiçi</span>
          </div>
        </div>
      </div>
    </div>
  )
}
