import { createClient } from '@/lib/supabase/server'
import DeviceCard from '@/components/DeviceCard'
import AddDeviceButton from '@/components/AddDeviceButton'
import { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

type Device = Database['public']['Tables']['devices']['Row']
type Heartbeat = Database['public']['Tables']['heartbeat']['Row']

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Lütfen giriş yapın</h1>
                    <p className="text-slate-400">Kontrol paneline erişmek için giriş yapmalısınız</p>
                </div>
            </div>
        )
    }

    const resolvedParams = await searchParams
    const page = Math.max(parseInt(resolvedParams?.page || '1', 10) || 1, 1)
    const limit = 1
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: devices, count } = await supabase
        .from('devices')
        .select('*', { count: 'exact' })
        .eq('parent_id', user.id)
        .eq('is_active', true)
        .order('id', { ascending: true })
        .range(from, to)

    const totalDevices = count || 0
    const totalPages = Math.max(Math.ceil(totalDevices / limit), 1)

    const currentDevice = devices?.[0] || null
    const { data: heartbeatForCurrent } = currentDevice
        ? await supabase
            .from('heartbeat')
            .select('*')
            .eq('device_id', currentDevice.device_id)
            .limit(1)
            .single()
        : { data: null }

    const prevPage = page > 1 ? page - 1 : 1
    const nextPage = page < totalPages ? page + 1 : totalPages

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                            Kontrol Paneli
                        </h1>
                        <p className="text-slate-400">Cihazlarınızı izleyin ve kontrol edin</p>
                    </div>
                    <AddDeviceButton />
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                        <div className="text-slate-400 text-sm mb-1">Toplam Cihaz</div>
                        <div className="text-3xl font-bold text-white">{totalDevices}</div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                        <div className="text-slate-400 text-sm mb-1">Çevrimiçi</div>
                        <div className="text-3xl font-bold text-green-400">
                            {heartbeatForCurrent?.is_online ? 1 : 0}
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                        <div className="text-slate-400 text-sm mb-1">Çevrimdışı</div>
                        <div className="text-3xl font-bold text-slate-400">
                            {heartbeatForCurrent?.is_online ? 0 : 1}
                        </div>
                    </div>
                </div>

                {!currentDevice ? (
                    <div className="bg-white/5 backdrop-blur-xl p-12 rounded-2xl border border-white/10 text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">Henüz cihaz yok</h3>
                        <p className="text-slate-400">Başlamak için bir bilgisayara HomeGuardian agentını yükleyin</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <DeviceCard
                            key={currentDevice.id}
                            device={currentDevice as Device}
                            heartbeat={heartbeatForCurrent as Heartbeat | null}
                        />
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
                            <a
                                href={`/dashboard?page=${prevPage}`}
                                className={`px-4 py-2 rounded-lg border border-white/10 text-sm ${page > 1 ? 'text-white hover:bg-white/10' : 'text-slate-500 cursor-not-allowed'}`}
                                aria-disabled={page <= 1}
                            >
                                Önceki
                            </a>
                            <div className="text-slate-300 text-sm">
                                Sayfa {page} / {totalPages}
                            </div>
                            <a
                                href={`/dashboard?page=${nextPage}`}
                                className={`px-4 py-2 rounded-lg border border-white/10 text-sm ${page < totalPages ? 'text-white hover:bg-white/10' : 'text-slate-500 cursor-not-allowed'}`}
                                aria-disabled={page >= totalPages}
                            >
                                Sonraki
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
