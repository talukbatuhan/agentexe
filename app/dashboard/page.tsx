import { createClient } from '@/lib/supabase/server'
import DeviceCard from '@/components/DeviceCard'
import { Database } from '@/types/database'

type Device = Database['public']['Tables']['devices']['Row']
type Heartbeat = Database['public']['Tables']['heartbeat']['Row']

export default async function DashboardPage() {
    const supabase = await createClient()

    // Get current user
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

    // Fetch devices for this parent
    const { data: devices, error } = await supabase
        .from('devices')
        .select('*')
        .eq('parent_id', user.id)
        .eq('is_active', true)

    if (error) {
        console.error('Error fetching devices:', error)
    }

    // Fetch heartbeat data for all devices
    const deviceIds = devices?.map(d => d.device_id) || []
    const { data: heartbeats } = await supabase
        .from('heartbeat')
        .select('*')
        .in('device_id', deviceIds)

    // Create a map of device_id -> heartbeat
    const heartbeatMap = new Map<string, Heartbeat>()
    heartbeats?.forEach(hb => {
        heartbeatMap.set(hb.device_id, hb)
    })

    return (
        <div className="min-h-screen p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                        Kontrol Paneli
                    </h1>
                    <p className="text-slate-400">Tüm cihazlarınızı izleyin ve kontrol edin</p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                        <div className="text-slate-400 text-sm mb-1">Toplam Cihaz</div>
                        <div className="text-3xl font-bold text-white">{devices?.length || 0}</div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                        <div className="text-slate-400 text-sm mb-1">Çevrimiçi</div>
                        <div className="text-3xl font-bold text-green-400">
                            {heartbeats?.filter(hb => hb.is_online).length || 0}
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
                        <div className="text-slate-400 text-sm mb-1">Çevrimdışı</div>
                        <div className="text-3xl font-bold text-slate-400">
                            {(devices?.length || 0) - (heartbeats?.filter(hb => hb.is_online).length || 0)}
                        </div>
                    </div>
                </div>

                {/* Device List */}
                {!devices || devices.length === 0 ? (
                    <div className="bg-white/5 backdrop-blur-xl p-12 rounded-2xl border border-white/10 text-center">
                        <h3 className="text-xl font-semibold text-white mb-2">Henüz cihaz yok</h3>
                        <p className="text-slate-400">Başlamak için bir bilgisayara HomeGuardian agent'ını yükleyin</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {devices.map((device) => (
                            <DeviceCard
                                key={device.id}
                                device={device}
                                heartbeat={heartbeatMap.get(device.device_id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
