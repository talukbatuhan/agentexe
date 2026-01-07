import {
    Monitor, Lock, Camera, Volume2, MessageSquare,
    Mic, Ban, Globe, Shield, Clock, Eye, Power, FileText,
    Video, Folder, RotateCcw, Trash2
} from 'lucide-react'

export default function GuidePage() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Özellikler ve Kullanım Kılavuzu
                    </h1>
                    <p className="text-slate-400 mt-2">HomeGuardian Agent v2.0 için kılavuz</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-purple-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-xl">
                            <Monitor className="w-6 h-6 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Görüntü ve Ses</h2>
                    </div>

                    <FeatureItem
                        icon={<Lock className="w-4 h-4 text-red-400" />}
                        title="Bilgisayarı Kilitle"
                        desc="Windows oturumunu anında kilitler. Kullanıcı parola girmelidir."
                    />
                    <FeatureItem
                        icon={<Camera className="w-4 h-4 text-purple-400" />}
                        title="Ekran Görüntüsü"
                        desc="Masaüstünün anlık ekran görüntüsünü alır."
                    />
                    <FeatureItem
                        icon={<Video className="w-4 h-4 text-pink-400" />}
                        title="Webcam"
                        desc="Bilgisayarın kamerasından anında fotoğraf çeker."
                    />
                    <FeatureItem
                        icon={<Volume2 className="w-4 h-4 text-green-400" />}
                        title="Ses Kontrol"
                        desc="Sistem sesini uzaktan ayarlayın veya tamamen kısın."
                    />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-xl">
                            <MessageSquare className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Etkileşim</h2>
                    </div>

                    <FeatureItem
                        icon={<MessageSquare className="w-4 h-4 text-blue-400" />}
                        title="Mesaj Gönder"
                        desc="Kullanıcının ekranında açılan bir mesaj penceresi gösterir."
                    />
                    <FeatureItem
                        icon={<Mic className="w-4 h-4 text-pink-400" />}
                        title="Metin Konuşma"
                        desc="Google veya sistem seslerini kullanarak metni seslendirir."
                    />
                    <FeatureItem
                        icon={<Ban className="w-4 h-4 text-yellow-400" />}
                        title="Girdi Engelle"
                        desc="Fare ve klavyeyi 15 saniye dondurur."
                    />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-red-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-red-500/20 rounded-xl">
                            <Shield className="w-6 h-6 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Güvenlik ve Filtreleme</h2>
                    </div>

                    <FeatureItem
                        icon={<Shield className="w-4 h-4 text-emerald-400" />}
                        title="Güvenli DNS"
                        desc="AdGuard Family Protection zorlanır (94.140.14.15)."
                    />
                    <FeatureItem
                        icon={<Eye className="w-4 h-4 text-orange-400" />}
                        title="İçerik Takibi"
                        desc="Uygunsuz kelimeleri tespit eder, uygulamayı kapatır ve kanıt ekran görüntüsü alır."
                    />
                    <FeatureItem
                        icon={<FileText className="w-4 h-4 text-slate-400" />}
                        title="Uygulama İzin Listesi"
                        desc="Sadece izinli uygulamaların çalışmasına izin verir. Yasaklı liste önceliklidir."
                    />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-yellow-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-yellow-500/20 rounded-xl">
                            <Folder className="w-6 h-6 text-orange-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Dosyalar ve Zaman</h2>
                    </div>

                    <FeatureItem
                        icon={<Folder className="w-4 h-4 text-orange-400" />}
                        title="Dosya Gezgin"
                        desc="Klasörleri uzaktan gez, dosyaları görüntüle ve gerekirse sil."
                    />
                    <FeatureItem
                        icon={<Clock className="w-4 h-4 text-yellow-400" />}
                        title="Zaman Kotaları"
                        desc="23:00 - 07:00 arasında bilgisayarı otomatik kilitler."
                    />
                    <FeatureItem
                        icon={<Globe className="w-4 h-4 text-indigo-400" />}
                        title="Site Engelle"
                        desc="Belirli alan adlarını HOSTS dosyası üzerinden engeller."
                    />
                    <FeatureItem
                        icon={<Trash2 className="w-4 h-4 text-orange-400" />}
                        title="Temizlik"
                        desc="7 günden eski log ve ekran görüntülerini temizler."
                    />
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 hover:border-slate-500/50 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-slate-500/20 rounded-xl">
                            <Power className="w-6 h-6 text-slate-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-white">Sistem Kontrolü</h2>
                    </div>

                    <FeatureItem
                        icon={<Power className="w-4 h-4 text-red-400" />}
                        title="Kapat / Yeniden Başlat"
                        desc="Bilgisayarı uzaktan kapat veya yeniden başlat."
                    />
                    <FeatureItem
                        icon={<Power className="w-4 h-4 text-red-400" />}
                        title="Agent Durdur"
                        desc="Agent ve Watchdog'u güvenli şekilde durdurur."
                    />
                    <FeatureItem
                        icon={<Shield className="w-4 h-4 text-green-400" />}
                        title="Watchdog ve Müdahale Koruması"
                        desc="Agent kapatılırsa otomatik başlatır. Görev Yöneticisi'ni engeller."
                    />
                </div>

            </div>
        </div>
    )
}

function FeatureItem({ icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="mt-1 shrink-0">{icon}</div>
            <div>
                <h4 className="text-sm font-medium text-white">{title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}
