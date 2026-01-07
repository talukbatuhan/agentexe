'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AllowlistManager from '@/components/AllowlistManager'
import { Shield, ArrowLeft, Loader2 } from 'lucide-react'

export default function AllowlistPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.deviceId as string
  const supabase = createClient()

  const [isOnline, setIsOnline] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from('heartbeat')
          .select('*')
          .eq('device_id', deviceId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (data) {
          const lastSeenOk = data.last_seen ? new Date(data.last_seen) > new Date(Date.now() - 2 * 60 * 1000) : false
          setIsOnline(Boolean(data.is_online) && lastSeenOk)
        }
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto text-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-400" />
            Application Allowlist
          </h1>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full overflow-hidden">
          <div className="p-6">
            <AllowlistManager deviceId={deviceId} isOnline={isOnline} />
          </div>
        </div>
      )}
    </div>
  )
}
