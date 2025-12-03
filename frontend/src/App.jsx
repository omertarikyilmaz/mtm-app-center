import { useState, useRef } from 'react'
import { Upload, Code, MessageSquare, ScanText, FileText, Loader2, AlertCircle, CheckCircle, Users, HelpCircle, Globe, Radio } from 'lucide-react'
import './index.css'

function App() {
    const [currentView, setCurrentView] = useState('dashboard')

    return (
        <div style={{ minHeight: '100vh', padding: '2rem' }}>
            <header style={{ marginBottom: '3rem', maxWidth: '1400px', margin: '0 auto 3rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    MTM App Center
                </h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>DeepSeek OCR, Local LLM ve Pipeline Servisleri</p>
            </header>

            {currentView === 'dashboard' ? (
                <Dashboard onViewChange={setCurrentView} />
            ) : currentView === 'ocr' ? (
                <OCRInterface />
            ) : currentView === 'pipelines' ? (
                <IflasOCRInterface />
            ) : currentView === 'kunye' ? (
                <KunyeInterface />
            ) : currentView === 'kunye-web' ? (
                <KunyeWebInterface />
            ) : currentView === 'radyo' ? (
                <RadyoNewsInterface />
            ) : currentView === 'chat' ? (
                <ChatInterface />
            ) : null}

            {currentView !== 'dashboard' && (
                <button
                    className="btn btn-secondary"
                    style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => setCurrentView('dashboard')}
                >
                    ← Ana Sayfaya Dön
                </button>
            )}
        </div>
    )
}

function Dashboard({ onViewChange }) {
    const [showDocs, setShowDocs] = useState(false)

    const apps = [
        {
            id: 'ocr',
            name: 'DeepSeek OCR',
            description: 'DeepSeek-V2 ve vLLM destekli gelişmiş optik karakter tanıma servisi.',
            icon: <ScanText size={32} color="#6366f1" />,
            status: 'Aktif'
        },
        {
            id: 'pipelines',
            name: 'OpenAI İflas OCR',
            description: 'Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarımı - GPT-4 destekli.',
            icon: <Code size={32} color="#f59e0b" />,
            status: 'Beta'
        },
        {
            id: 'kunye',
            name: 'MBR Künye Pipeline',
            description: 'Gazete/Dergi künyelerinden yayın ve çalışan bilgilerini ayrıştırır.',
            icon: <Users size={32} color="#ec4899" />,
            status: 'Yeni'
        },
        {
            id: 'kunye-web',
            name: 'MBR Künye Web',
            description: 'Web linkleri üzerinden künye sayfalarını analiz eder (OCR kullanmadan).',
            icon: <Globe size={32} color="#14b8a6" />,
            status: 'Yeni'
        },
        {
            id: 'radyo',
            name: 'Radyo News Analyzer',
            description: 'Radyo kayıtlarından otomatik haber segmentlerini tespit eder ve metne dönüştürür.',
            icon: <Radio size={32} color="#8b5cf6" />,
            status: 'Yeni'
        },
        {
            id: 'chat',
            name: 'Local Turkish-Gemma LLM',
            description: 'YTÜ COSMOS Turkish-Gemma-9b-T1 modeli - Türkçe\'ye özel eğitilmiş, akıllı reasoning asistanı.',
            icon: <MessageSquare size={32} color="#94a3b8" />,
            status: 'Hizmet Dışı',
            disabled: true
        },
    ]

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Documentation Button - Top Right */}
            <button
                onClick={() => setShowDocs(!showDocs)}
                style={{
                    position: 'absolute',
                    top: '-4rem',
                    right: 0,
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#6366f1',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500
                }}
            >
                <HelpCircle size={18} /> Dokümantasyon
            </button>

            {/* Documentation Modal */}
            {showDocs && (
                <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    width: '90%',
                    maxWidth: '600px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    zIndex: 2000
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>📚 API Dokümantasyonu</h2>
                        <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
                    </div>
                    <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                        <h3 style={{ color: '#f59e0b', marginTop: '1rem' }}>DeepSeek OCR API</h3>
                        <p><code>POST /api/v1/ocr</code> - Gelişmiş OCR servisi</p>

                        <h3 style={{ color: '#f59e0b', marginTop: '1rem' }}>OpenAI İflas OCR</h3>
                        <p><code>POST /api/v1/pipelines/iflas-batch</code> - İflas/icra ilanı analizi</p>

                        <h3 style={{ color: '#ec4899', marginTop: '1rem' }}>MBR Künye Pipeline</h3>
                        <p><code>POST /api/v1/pipelines/mbr-kunye-batch</code> - Normal mod (hızlı)</p>
                        <p><code>POST /api/v1/pipelines/mbr-kunye-batch-hybrid</code> - Batch API modu (ucuz, yavaş)</p>
                    </div>
                </div>
            )}
            {showDocs && <div onClick={() => setShowDocs(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1999 }} />}
            <div style={{ marginBottom: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                {apps.map((app) => (
                    <div
                        key={app.id}
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            cursor: app.disabled ? 'not-allowed' : 'pointer',
                            opacity: app.disabled ? 0.6 : 1,
                            transition: 'all 0.2s'
                        }}
                        onClick={() => !app.disabled && onViewChange(app.id)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'var(--surface-color)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                                {app.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.25rem' }}>{app.name}</h3>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '1rem',
                                    background: app.status === 'Aktif' ? 'rgba(16, 185, 129, 0.1)' : app.status === 'Beta' ? 'rgba(245, 158, 11, 0.1)' : app.status === 'Yeni' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: app.status === 'Aktif' ? '#10b981' : app.status === 'Beta' ? '#f59e0b' : app.status === 'Yeni' ? '#ec4899' : '#ef4444',
                                    fontWeight: 600
                                }}>
                                    {app.status}
                                </span>
                            </div>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{app.description}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function OCRInterface() {
    const [selectedFile, setSelectedFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [showHelp, setShowHelp] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file)
            setResult(null)
            setError(null)
        } else {
            setError('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, vb.)')
        }
    }

    const handleProcess = async () => {
        if (!selectedFile) return

        setLoading(true)
        setError(null)
        setResult(null)

        const formData = new FormData()
        formData.append('files', selectedFile)

        try {
            const response = await fetch('/api/v1/ocr', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }

            const data = await response.json()
            setResult(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Help button */}
            <button
                onClick={() => setShowHelp(!showHelp)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#6366f1',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500
                }}
            >
                <HelpCircle size={18} /> Nasıl Kullanırım?
            </button>

            {/* Help Modal */}
            {showHelp && (
                <>
                    <div onClick={() => setShowHelp(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1999 }} />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 2000
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>📖 DeepSeek OCR Kullanım Kılavuzu</h2>
                            <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#6366f1' }}>×</button>
                        </div>
                        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <h3 style={{ color: '#6366f1', marginBottom: '0.5rem' }}>🎯 Ne İşe Yarar?</h3>
                            <p>DeepSeek-V2 modeli ile görsellerdeki <strong>metinleri yüksek doğrulukla</strong> çıkarır. Türkçe dahil çok dilli destek sunar.</p>

                            <h3 style={{ color: '#6366f1', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📋 Adım Adım Kullanım:</h3>
                            <ol style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>Görsel dosyası</strong> seçin (JPG, PNG, WebP vb.)</li>
                                <li><strong>"OCR İşle"</strong> butonuna tıklayın</li>
                                <li>Sonuçları görüntüleyin</li>
                            </ol>

                            <h3 style={{ color: '#6366f1', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📥 Girdi Formatı:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Desteklenen: JPG, PNG, WebP, GIF</li>
                                <li>Maksimum boyut: 10MB</li>
                                <li>En iyi sonuç: Yüksek çözünürlük, net metin</li>
                            </ul>

                            <h3 style={{ color: '#6366f1', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📤 Çıktı Formatı:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li><code>text</code>: Çıkarılan metin (string)</li>
                                <li><code>confidence</code>: Güven skoru (0-1 arası)</li>
                                <li>JSON formatında döner</li>
                            </ul>

                            <h3 style={{ color: '#6366f1', marginTop: '1.5rem', marginBottom: '0.5rem' }}>💡 İpuçları:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Daha net görseller = Daha iyi sonuç</li>
                                <li>Karmaşık fontlar doğruluğu azaltabilir</li>
                                <li>Türkçe karakter desteği mükemmeldir</li>
                            </ul>
                        </div>
                    </div>
                </>
            )}

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <ScanText size={32} color="#6366f1" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>DeepSeek OCR</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>DeepSeek-V2 destekli gelişmiş optik karakter tanıma</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left */}
                <div>
                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                        onClick={() => fileInputRef.current?.click()}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <Upload size={48} color="#6366f1" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                            {selectedFile ? selectedFile.name : 'Görsel Yükle'}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Tıklayın veya sürükleyin
                        </p>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleProcess}
                        disabled={!selectedFile || loading}
                    >
                        {loading ? <Loader2 className="loading-spinner" size={18} /> : <ScanText size={18} />}
                        {loading ? 'İşleniyor...' : 'OCR İşle'}
                    </button>
                </div>

                {/* Right */}
                <div className="glass-panel" style={{ padding: '2rem', maxHeight: '600px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuç</h3>

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <Loader2 className="loading-spinner" size={32} />
                            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>OCR işleniyor...</p>
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {result && (
                        <div>
                            <div style={{ background: 'var(--surface-color)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Çıkarılan Metin:</h4>
                                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{result[0]?.text || 'Metin bulunamadı'}</p>
                            </div>
                            {result[0]?.confidence && (
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Güven Skoru: <strong>{(result[0].confidence * 100).toFixed(1)}%</strong>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function KunyeInterface() {
    const [excelFile, setExcelFile] = useState(null)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const [showDocs, setShowDocs] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setExcelFile(file)
            setResults(null)
            setError(null)
        }
    }

    const handleProcess = async () => {
        if (!excelFile) return
        if (!apiKey || apiKey.trim() === '') {
            setError('Lütfen OpenAI API Key giriniz')
            return
        }

        setLoading(true)
        setError(null)
        setResults(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('openai_api_key', apiKey)
        formData.append('id_column', 'A')

        try {
            const response = await fetch('/api/v1/pipelines/mbr-kunye-batch', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Server hatası: ${response.status}`)
            }

            const data = await response.json()
            setResults(data)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const exportToExcel = () => {
        if (!results || !results.results) return

        const headers = [
            'Satır No', 'Clip ID', 'Durum',
            'Yayın Adı', 'Yayın Grubu', 'Adres', 'Telefon', 'Faks', 'Email', 'Web Sitesi',
            'Kişi Adı', 'Görevi', 'Kişi Telefon', 'Kişi Email',
            'Notlar', 'Ham OCR Metni', 'Hata'
        ]

        const rows = []

        results.results.forEach(r => {
            const commonData = [
                r.row,
                r.clip_id,
                r.status === 'success' ? 'Başarılı' : 'Hata',
                r.data?.yayin_adi || '',
                r.data?.yayin_grubu || '',
                r.data?.adres || '',
                r.data?.telefon || '',
                r.data?.faks || '',
                r.data?.email || '',
                r.data?.web_sitesi || ''
            ]

            const extraData = [
                r.data?.notlar || '',
                r.raw_ocr_text || '',
                r.error || ''
            ]

            if (r.data?.kisiler && r.data.kisiler.length > 0) {
                // Create a row for each person
                r.data.kisiler.forEach(kisi => {
                    rows.push([
                        ...commonData,
                        kisi.ad_soyad || '',
                        kisi.gorev || '',
                        kisi.telefon || '',
                        kisi.email || '',
                        ...extraData
                    ])
                })
            } else {
                // No people found, just add one row with empty person fields
                rows.push([
                    ...commonData,
                    '', '', '', '', // Empty person fields
                    ...extraData
                ])
            }
        })

        const ws_data = [headers, ...rows]
        const ws = window.XLSX.utils.aoa_to_sheet(ws_data)
        const wb = window.XLSX.utils.book_new()
        window.XLSX.utils.book_append_sheet(wb, ws, 'Künye Sonuçları')
        window.XLSX.writeFile(wb, `mbr_kunye_sonuclari_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Help button - top right */}
            <button
                onClick={() => setShowDocs(!showDocs)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#ec4899',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500
                }}
            >
                <HelpCircle size={18} /> Nasıl Kullanırım?
            </button>

            {/* Help Modal */}
            {showDocs && (
                <>
                    <div onClick={() => setShowDocs(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1999 }} />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 2000
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ec4899' }}>📖 MBR Künye Pipeline Kullanım Kılavuzu</h2>
                            <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#ec4899' }}>×</button>
                        </div>
                        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <h3 style={{ color: '#ec4899', marginBottom: '0.5rem' }}>🎯 Ne İşe Yarar?</h3>
                            <p>Gazete ve dergi künye sayfalarından <strong>yayın bilgilerini ve çalışan listesini</strong> otomatik olarak çıkarır.</p>

                            <h3 style={{ color: '#ec4899', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📋 Adım Adım Kullanım:</h3>
                            <ol style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>OpenAI API Key</strong> girin (sk-proj- ile başlar)</li>
                                <li><strong>Excel dosyanızı</strong> yükleyin (A sütununda Clip ID'ler olmalı)</li>
                                <li><strong>Batch API seçeneğini</strong> belirleyin:
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                        <li>✅ <strong>Kapalı:</strong> Hızlı sonuç (pahalı, anında)</li>
                                        <li>💰 <strong>Açık:</strong> %50 daha ucuz (5-30 dk bekleme)</li>
                                    </ul>
                                </li>
                                <li><strong>"İşlemi Başlat"</strong> butonuna tıklayın</li>
                                <li>Sonuçları <strong>Excel olarak indirin</strong></li>
                            </ol>

                            <h3 style={{ color: '#ec4899', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📊 Çıktı Bilgileri:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Yayın Adı, Yayın Grubu</li>
                                <li>Adres, Telefon, Faks, Email, Web Sitesi</li>
                                <li>Kişiler (Ad Soyad, Görevi, Telefon, Email)</li>
                                <li>Notlar, Ham OCR Metni</li>
                            </ul>

                            <h3 style={{ color: '#ec4899', marginTop: '1.5rem', marginBottom: '0.5rem' }}>💡 İpuçları:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Büyük işler için <strong>Batch API</strong> kullanın (geceleyin çalıştırın)</li>
                                <li>Her kişi için <strong>ayrı satır</strong> oluşturulur</li>
                                <li>OCR kalitesi kötükse sonuçlar eksik olabilir</li>
                            </ul>
                        </div>
                    </div>
                </>
            )}

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Users size={32} color="#ec4899" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>MBR Künye Pipeline</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gazete/Dergi künyelerinden yayın ve çalışan bilgilerini ayrıştırır.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column */}
                <div>
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#ec4899' }}>
                            OpenAI API Key *
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                        />

                        {excelFile ? (
                            <div>
                                <FileText size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{excelFile.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dosya yüklendi</p>
                            </div>
                        ) : (
                            <>
                                <FileText size={48} color="#ec4899" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Excel dosyası yükleyin</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>İlk kolondan clip ID'leri okunacak</p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: '1rem', background: '#ec4899', borderColor: '#ec4899' }}
                        disabled={!excelFile || loading || !apiKey}
                        onClick={handleProcess}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Toplu İşle'}
                    </button>

                    {results && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', background: '#10b981', color: 'white' }}
                            onClick={exportToExcel}
                        >
                            <FileText size={18} /> Excel Olarak İndir
                        </button>
                    )}
                </div>

                {/* Right Column - Results */}
                <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                    {loading && (
                        <div style={{ padding: '2rem' }}>
                            {/* Progress bar and current status */}
                            {results?._progress && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 600, color: '#ec4899' }}>
                                                {results._progress.current} / {results._progress.total}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                {Math.round((results._progress.current / results._progress.total) * 100)}%
                                            </span>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-color)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${(results._progress.current / results._progress.total) * 100}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #ec4899, #f472b6)',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                    </div>

                                    {/* Current item being processed */}
                                    <div style={{
                                        padding: '1rem',
                                        background: 'rgba(236, 72, 153, 0.05)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(236, 72, 153, 0.2)'
                                    }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                            Clip ID: <strong>{results._progress.clip_id}</strong>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Loader2 className="loading-spinner" size={16} />
                                            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                                {results._progress.step === 'url' && '🔗 URL Oluşturuluyor'}
                                                {results._progress.step === 'download' && '⬇️ Görsel İndiriliyor'}
                                                {results._progress.step === 'ocr' && '🔍 OCR İşleniyor'}
                                                {results._progress.step === 'ai' && '🤖 AI Analiz Ediyor'}
                                            </span>
                                        </div>
                                        {results._progress.message && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                {results._progress.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Spinner if no progress yet */}
                            {!results?._progress && (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <Loader2 className="loading-spinner" size={32} />
                                    <p style={{ marginTop: '1rem' }}>Başlatılıyor...</p>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {results && !loading && (
                        <div>
                            {/* Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{results.total}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Toplam</div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{results.successful}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Başarılı</div>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{results.failed}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hata</div>
                                </div>
                                <div style={{ background: 'rgba(236, 72, 153, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ec4899' }}>{results.processed}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İşlenen</div>
                                </div>
                            </div>

                            {/* Results Preview - only for normal mode */}
                            {results.results && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {results.results.slice(0, 10).map((result, idx) => (
                                        <div key={idx} style={{
                                            background: result.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            border: `1px solid ${result.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600 }}>#{result.row} - {result.clip_id}</span>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    background: result.status === 'success' ? '#10b981' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {result.status === 'success' ? 'Başarılı' : 'Hata'}
                                                </span>
                                            </div>
                                            {result.status === 'success' ? (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.data?.yayin_adi}</div>
                                                    {result.data?.kisiler && (
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            {result.data.kisiler.length} kişi bulundu:
                                                            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                                                                {result.data.kisiler.slice(0, 3).map((k, i) => (
                                                                    <li key={i}>{k.ad_soyad} ({k.gorev})</li>
                                                                ))}
                                                                {result.data.kisiler.length > 3 && <li>...</li>}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                                                    {result.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function IflasOCRInterface() {
    const [activeTab, setActiveTab] = useState('image')
    const [showHelp, setShowHelp] = useState(false)

    // Image upload states
    const [files, setFiles] = useState([])
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const fileInputRef = useRef(null)

    // Excel batch states
    const [excelFile, setExcelFile] = useState(null)
    const [excelLoading, setExcelLoading] = useState(false)
    const [excelResults, setExcelResults] = useState(null)
    const [excelError, setExcelError] = useState(null)
    const excelInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles)
            setPreviews(selectedFiles.map(f => URL.createObjectURL(f)))
            setResults(null)
            setError(null)
        }
    }

    const handleProcess = async () => {
        if (files.length === 0) return
        if (!apiKey || apiKey.trim() === '') {
            setError('Lütfen OpenAI API Key giriniz')
            return
        }

        setLoading(true)
        setError(null)

        const formData = new FormData()
        files.forEach(file => {
            formData.append('files', file)
        })
        formData.append('openai_api_key', apiKey)

        try {
            const response = await fetch('/api/v1/pipelines/iflas-ocr', {
                method: 'POST',
                body: formData,
            })

            const responseText = await response.text()
            let data

            try {
                data = JSON.parse(responseText)
            } catch (e) {
                console.error('Non-JSON response:', responseText)
                throw new Error(`Sunucu hatası (${response.status}): ${responseText.substring(0, 100)}...`)
            }

            if (!response.ok) {
                throw new Error(data.detail || 'İşlem başarısız oldu')
            }

            setResults(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleExcelChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setExcelFile(file)
            setExcelResults(null)
            setExcelError(null)
        }
    }

    const handleExcelProcess = async () => {
        if (!excelFile) return
        if (!apiKey || apiKey.trim() === '') {
            setExcelError('Lütfen OpenAI API Key giriniz')
            return
        }

        setExcelLoading(true)
        setExcelError(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('openai_api_key', apiKey)
        formData.append('id_column', 'A')

        try {
            const response = await fetch('/api/v1/pipelines/iflas-ocr-batch', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                // Try to get error message from response
                let errorMsg = 'İşlem başarısız oldu'
                try {
                    const errorData = await response.json()
                    errorMsg = errorData.detail || errorMsg
                } catch {
                    // If JSON parse fails, use status text
                    errorMsg = `Server hatası: ${response.status} ${response.statusText}`
                }
                throw new Error(errorMsg)
            }

            const data = await response.json()
            setExcelResults(data)
        } catch (err) {
            setExcelError(err.message)
        } finally {
            setExcelLoading(false)
        }
    }

    const exportToExcel = () => {
        if (!excelResults || !excelResults.results) return

        // Match columns exactly as requested by user
        const headers = [
            "AD SOYAD / UNVAN", "TCKN / YKN", "VKN", "ADRES",
            "İCRA/İFLAS MÜDÜRLÜĞÜ", "İLAN TÜRÜ", "DOSYA YILI", "TARİH",
            "1. DAVACI", "2. DAVACI", "3. DAVACI", "4. DAVACI", "5. DAVACI", "6. DAVACI", "7. DAVACI",
            "DOSYA NO", "BİLGİ KAYNAĞI"
        ]

        const rows = excelResults.results.map(r => [
            r.data?.ad_soyad_unvan || '',
            r.data?.tckn || '',
            r.data?.vkn || '',
            r.data?.adres || '',
            r.data?.icra_iflas_mudurlugu || '',
            r.data?.ilan_turu || '',
            r.data?.dosya_yili || '',
            r.data?.ilan_tarihi || '',
            r.data?.davaci_1 || '',
            r.data?.davaci_2 || '',
            r.data?.davaci_3 || '',
            r.data?.davaci_4 || '',
            r.data?.davaci_5 || '',
            r.data?.davaci_6 || '',
            r.data?.davaci_7 || '',
            r.data?.dosya_no || '',
            r.data?.kaynak || ''
        ])

        // Create Excel file using SheetJS (XLSX)
        const ws_data = [headers, ...rows]
        const ws = window.XLSX.utils.aoa_to_sheet(ws_data)
        const wb = window.XLSX.utils.book_new()
        window.XLSX.utils.book_append_sheet(wb, ws, 'İflas OCR Sonuçları')

        // Generate Excel file
        window.XLSX.writeFile(wb, `iflas_ocr_sonuclari_${new Date().toISOString().split('T')[0]}.xlsx`)
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Help button */}
            <button
                onClick={() => setShowHelp(!showHelp)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#f59e0b',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500
                }}
            >
                <HelpCircle size={18} /> Nasıl Kullanırım?
            </button>

            {/* Help Modal */}
            {showHelp && (
                <>
                    <div onClick={() => setShowHelp(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1999 }} />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 2000
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>📖 İflas OCR Pipeline Kullanım Kılavuzu</h2>
                            <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#f59e0b' }}>×</button>
                        </div>
                        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <h3 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>🎯 Ne İşe Yarar?</h3>
                            <p>Gazete ilanlarından <strong>iflas ve icra duyurularını</strong> analiz edip <strong>17 sütunlu yapılandırılmış veri</strong> çıkarır (davacılar, borçlular, TCN/VKN, adres vb.)</p>

                            <h3 style={{ color: '#f59e0b', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📋 Adım Adım Kullanım:</h3>
                            <h4 style={{ color: '#f59e0b', fontSize: '0.95rem', marginTop: '1rem' }}>İmaj Upload Modu:</h4>
                            <ol style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>OpenAI API Key</strong> girin (sk-proj- ile başlar)</li>
                                <li><strong>Görsel(ler)</strong> yükleyin (ilan fotoğrafları)</li>
                                <li><strong>"İşlemi Başlat"</strong> butonuna tıklayın</li>
                                <li>Sonuçları <strong>Excel olarak indirin</strong></li>
                            </ol>

                            <h4 style={{ color: '#f59e0b', fontSize: '0.95rem', marginTop: '1rem' }}>Excel Toplu İşleme Modu:</h4>
                            <ol style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>Excel dosyası</strong> yükleyin (A sütununda Clip ID'ler)</li>
                                <li><strong>OpenAI API Key</strong> girin</li>
                                <li><strong>"Toplu İşle"</strong> butonuna tıklayın</li>
                                <li>Excel sonuçları indirin</li>
                            </ol>

                            <h3 style={{ color: '#f59e0b', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📥 Girdi Formatı:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>İmaj:</strong> JPG, PNG (ilan görselleri)</li>
                                <li><strong>Excel:</strong> .xlsx/.xls (A sütunu: Clip ID)</li>
                            </ul>

                            <h3 style={{ color: '#f59e0b', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📤 Çıktı (17 Sütun):</h3>
                            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.85rem' }}>
                                <li>Ad/Soyad/Ünvan, TCKN, VKN, Adres</li>
                                <li>İcra/İflas Müdürlüğü, Dosya Yılı, Dosya No</li>
                                <li>İlan Türü, İlan Tarihi</li>
                                <li>7 Davacı Sütunu (davaci_1 - davaci_7)</li>
                                <li>Kaynak, Ham OCR Metni</li>
                            </ul>

                            <h3 style={{ color: '#f59e0b', marginTop: '1.5rem', marginBottom: '0.5rem' }}>💡 İpuçları:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Tüm metinler <strong>Title Case</strong> (Her Kelime Baş Harf Büyük)</li>
                                <li>Bulunamayan alanlar <code>null</code> döner</li>
                                <li>Büyük işler için Excel toplu modu kullanın</li>
                            </ul>
                        </div>
                    </div>
                </>
            )}

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Code size={32} color="#f59e0b" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>OpenAI İflas OCR Pipeline</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarın - GPT-4 destekli</p>
                </div>
            </div>

            {/* Tab Selector */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)' }}>
                <button
                    className={`btn ${activeTab === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('image')}
                    style={{
                        borderRadius: '0.5rem 0.5rem 0 0',
                        borderBottom: activeTab === 'image' ? '2px solid #f59e0b' : 'none',
                        marginBottom: '-2px'
                    }}
                >
                    <Upload size={18} /> Görsel Yükleme
                </button>
                <button
                    className={`btn ${activeTab === 'excel' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('excel')}
                    style={{
                        borderRadius: '0.5rem 0.5rem 0 0',
                        borderBottom: activeTab === 'excel' ? '2px solid #f59e0b' : 'none',
                        marginBottom: '-2px'
                    }}
                >
                    <FileText size={18} /> Excel Toplu İşleme
                </button>
            </div>

            {/* Image Upload Tab */}
            {activeTab === 'image' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>
                                OpenAI API Key *
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-proj-..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                API key'iniz sadece bu istek için kullanılır. <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: '#f59e0b' }}>Buradan alabilirsiniz</a>
                            </p>
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                            />

                            {previews.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                    {previews.map((preview, idx) => (
                                        <img key={idx} src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem' }} />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <Upload size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gazete ilanı görsellerini yükleyin</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Birden fazla dosya seçebilirsiniz</p>
                                </>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%' }}
                            disabled={files.length === 0 || loading || !apiKey}
                            onClick={handleProcess}
                        >
                            {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Verileri Çıkart'}
                        </button>
                    </div>

                    {/* Right Column - Results */}
                    <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                        {loading && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p style={{ marginTop: '1rem' }}>Veriler analiz ediliyor...</p>
                            </div>
                        )}

                        {error && (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {results && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {results.map((result, idx) => (
                                    <div key={idx} style={{ background: 'var(--surface-color)', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                            <div><strong>Ad/Soyad/Ünvan:</strong> {result.ad_soyad_unvan || 'N/A'}</div>
                                            <div><strong>TCKN:</strong> {result.tckn || 'N/A'}</div>
                                            <div><strong>VKN:</strong> {result.vkn || 'N/A'}</div>
                                            <div><strong>İlan Türü:</strong> {result.ilan_turu || 'N/A'}</div>
                                            <div style={{ gridColumn: '1 / -1' }}><strong>Adres:</strong> {result.adres || 'N/A'}</div>
                                            <div style={{ gridColumn: '1 / -1' }}><strong>İcra/İflas Müdürlüğü:</strong> {result.icra_iflas_mudurlugu || 'N/A'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Excel Batch Tab */}
            {activeTab === 'excel' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Left Column */}
                    <div>
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>
                                OpenAI API Key *
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-proj-..."
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                            onClick={() => excelInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={excelInputRef}
                                onChange={handleExcelChange}
                                accept=".xlsx,.xls"
                                style={{ display: 'none' }}
                            />

                            {excelFile ? (
                                <div>
                                    <FileText size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{excelFile.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dosya yüklendi</p>
                                </div>
                            ) : (
                                <>
                                    <FileText size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Excel dosyası yükleyin</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>İlk kolondan clip ID'leri okunacak</p>
                                </>
                            )}
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginBottom: '1rem' }}
                            disabled={!excelFile || excelLoading || !apiKey}
                            onClick={handleExcelProcess}
                        >
                            {excelLoading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Toplu İşle'}
                        </button>

                        {excelResults && (
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', background: '#10b981', color: 'white' }}
                                onClick={exportToExcel}
                            >
                                <FileText size={18} /> Excel Olarak İndir
                            </button>
                        )}
                    </div>

                    {/* Right Column - Results */}
                    <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                        {excelLoading && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p style={{ marginTop: '1rem' }}>Clip'ler işleniyor...</p>
                            </div>
                        )}

                        {excelError && (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {excelError}
                            </div>
                        )}

                        {excelResults && (
                            <div>
                                {/* Summary */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{excelResults.total}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Toplam</div>
                                    </div>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{excelResults.successful}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Başarılı</div>
                                    </div>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{excelResults.failed}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hata</div>
                                    </div>
                                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{excelResults.processed}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İşlenen</div>
                                    </div>
                                </div>

                                {/* Results Preview */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {excelResults.results.slice(0, 10).map((result, idx) => (
                                        <div key={idx} style={{
                                            background: result.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            border: `1px solid ${result.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600 }}>#{result.row} - {result.clip_id}</span>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    background: result.status === 'success' ? '#10b981' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {result.status === 'success' ? 'Başarılı' : 'Hata'}
                                                </span>
                                            </div>
                                            {result.status === 'success' ? (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {result.data?.ad_soyad_unvan && <div>• {result.data.ad_soyad_unvan}</div>}
                                                    {result.data?.ilan_turu && <div>• {result.data.ilan_turu}</div>}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                                                    {result.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {excelResults.results.length > 10 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            ... ve {excelResults.results.length - 10} sonuç daha (Excel'i indirin)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function ChatInterface() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Merhaba! Ben Turkish-Gemma asistanıyım. Size nasıl yardımcı olabilirim?'
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    return (
        <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(148, 163, 184, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <MessageSquare size={32} color="#94a3b8" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Local Turkish-Gemma LLM</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Türkçe'ye özel eğitilmiş akıllı asistan (Hizmet Dışı)</p>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '2rem' }}>
                    <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '3rem' }}>
                        Bu servis şu anda aktif değil.
                    </div>
                </div>
            </div>
        </div>
    )
}

function KunyeWebInterface() {
    const [mode, setMode] = useState('excel') // 'excel' or 'single'
    const [excelFile, setExcelFile] = useState(null)
    const [singleLink, setSingleLink] = useState('')
    const [yayinAdi, setYayinAdi] = useState('')
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const [showDocs, setShowDocs] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setExcelFile(file)
            setResults(null)
            setError(null)
        }
    }

    const handleProcessSingle = async () => {
        if (!singleLink || !singleLink.trim()) {
            setError('Lütfen bir link giriniz')
            return
        }
        if (!apiKey || apiKey.trim() === '') {
            setError('Lütfen OpenAI API Key giriniz')
            return
        }

        setLoading(true)
        setError(null)
        setResults(null)

        const formData = new FormData()
        formData.append('link', singleLink.trim())
        formData.append('yayin_adi', yayinAdi.trim() || '')
        formData.append('openai_api_key', apiKey)

        try {
            const response = await fetch('/api/v1/pipelines/mbr-kunye-web-single', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Server hatası: ${response.status}`)
            }

            const data = await response.json()
            setResults({ single: data })
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleProcessExcel = async () => {
        if (!excelFile) return
        if (!apiKey || apiKey.trim() === '') {
            setError('Lütfen OpenAI API Key giriniz')
            return
        }

        setLoading(true)
        setError(null)
        setResults(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('openai_api_key', apiKey)
        formData.append('yayin_column', 'A')
        formData.append('link_column', 'B')

        try {
            const response = await fetch('/api/v1/pipelines/mbr-kunye-web-batch', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Server hatası: ${response.status}`)
            }

            const data = await response.json()
            setResults(data)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const downloadExcel = async () => {
        // If we already have results, convert them to Excel on client side
        if (results && results.results) {
            try {
                const headers = [
                    'Satır No', 'Yayın Adı', 'Link', 'Durum',
                    'Yayın Grubu', 'Adres', 'Telefon', 'Faks', 'Email', 'Web Sitesi',
                    'Kişi Adı', 'Görevi', 'Kişi Telefon', 'Kişi Email',
                    'Notlar', 'Ham Metin', 'Hata'
                ]

                const rows = []

                results.results.forEach(r => {
                    const commonData = [
                        r.row,
                        r.yayin_adi,
                        r.link,
                        r.status === 'success' ? 'Başarılı' : 'Hata',
                        r.data?.yayin_grubu || '',
                        r.data?.adres || '',
                        r.data?.telefon || '',
                        r.data?.faks || '',
                        r.data?.email || '',
                        r.data?.web_sitesi || ''
                    ]

                    const extraData = [
                        r.data?.notlar || '',
                        r.raw_html_text || '',
                        r.error || ''
                    ]

                    if (r.data?.kisiler && r.data.kisiler.length > 0) {
                        // Create a row for each person (like mbr-kunye-pipeline)
                        r.data.kisiler.forEach(kisi => {
                            rows.push([
                                ...commonData,
                                kisi.ad_soyad || '',
                                kisi.gorev || '',
                                kisi.telefon || '',
                                kisi.email || '',
                                ...extraData
                            ])
                        })
                    } else {
                        // No people found, just add one row with empty person fields
                        rows.push([
                            ...commonData,
                            '', '', '', '', // Empty person fields
                            ...extraData
                        ])
                    }
                })

                const ws_data = [headers, ...rows]
                const ws = window.XLSX.utils.aoa_to_sheet(ws_data)
                const wb = window.XLSX.utils.book_new()
                window.XLSX.utils.book_append_sheet(wb, ws, 'Künye Sonuçları')
                window.XLSX.writeFile(wb, `kunye_web_sonuclari_${new Date().toISOString().split('T')[0]}.xlsx`)
            } catch (err) {
                setError('Excel oluşturma hatası: ' + err.message)
            }
            return
        }

        // No results yet, so process from scratch
        if (!excelFile || !apiKey) return

        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', excelFile)
        formData.append('openai_api_key', apiKey)
        formData.append('yayin_column', 'A')
        formData.append('link_column', 'B')

        try {
            const response = await fetch('/api/v1/pipelines/mbr-kunye-web-batch-excel', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Server hatası: ${response.status}`)
            }

            // Download the Excel file
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `kunye_web_sonuclari_${new Date().toISOString().split('T')[0]}.xlsx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative' }}>
            {/* Help button */}
            <button
                onClick={() => setShowDocs(!showDocs)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'rgba(20, 184, 166, 0.1)',
                    border: '1px solid rgba(20, 184, 166, 0.3)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    color: '#14b8a6',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 500
                }}
            >
                <HelpCircle size={18} /> Nasıl Kullanırım?
            </button>

            {/* Help Modal */}
            {showDocs && (
                <>
                    <div onClick={() => setShowDocs(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1999 }} />
                    <div style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        width: '90%',
                        maxWidth: '700px',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 2000
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#14b8a6' }}>📖 MBR Künye Web Pipeline Kullanım Kılavuzu</h2>
                            <button onClick={() => setShowDocs(false)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer', color: '#14b8a6' }}>×</button>
                        </div>
                        <div style={{ lineHeight: '1.8', fontSize: '0.95rem' }}>
                            <h3 style={{ color: '#14b8a6', marginBottom: '0.5rem' }}>🎯 Ne İşe Yarar?</h3>
                            <p>Web linkleri üzerinden künye sayfalarını analiz eder. <strong>OCR kullanmadan</strong> direkt web scraping ile çalışır.</p>

                            <h3 style={{ color: '#14b8a6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📋 Adım Adım Kullanım:</h3>
                            <ol style={{ paddingLeft: '1.5rem' }}>
                                <li><strong>OpenAI API Key</strong> girin (sk-proj- ile başlar)</li>
                                <li><strong>Excel dosyanızı</strong> yükleyin:
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                        <li>A sütunu: Yayın adı</li>
                                        <li>B sütunu: Künye sayfası linki</li>
                                    </ul>
                                </li>
                                <li><strong>"Toplu İşle"</strong> veya <strong>"Excel İndir"</strong> butonuna tıklayın</li>
                            </ol>

                            <h3 style={{ color: '#14b8a6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>✨ Avantajlar:</h3>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>✅ OCR gerekmez (daha hızlı)</li>
                                <li>✅ JavaScript destekli sayfalar (Playwright)</li>
                                <li>✅ Dinamik içerik rendering</li>
                                <li>✅ Excel export</li>
                            </ul>

                            <h3 style={{ color: '#14b8a6', marginTop: '1.5rem', marginBottom: '0.5rem' }}>📊 Çıktı:</h3>
                            <p>Yayın bilgileri, çalışanlar, iletişim detayları - mbr-kunye-pipeline ile <strong>aynı format</strong></p>
                        </div>
                    </div>
                </>
            )}

            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(20, 184, 166, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Globe size={32} color="#14b8a6" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>MBR Künye Web Pipeline</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Web linkleri üzerinden künye analizi (OCR kullanmadan)</p>
                </div>
            </div>

            {/* Mode Toggle */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', padding: '0.5rem', background: 'var(--surface-color)', borderRadius: '0.75rem' }}>
                <button
                    onClick={() => { setMode('excel'); setResults(null); setError(null); }}
                    style={{
                        flex: 1,
                        padding: '0.75rem 1.5rem',
                        background: mode === 'excel' ? '#14b8a6' : 'transparent',
                        color: mode === 'excel' ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    📊 Excel Yükle (Toplu İşlem)
                </button>
                <button
                    onClick={() => { setMode('single'); setResults(null); setError(null); }}
                    style={{
                        flex: 1,
                        padding: '0.75rem 1.5rem',
                        background: mode === 'single' ? '#14b8a6' : 'transparent',
                        color: mode === 'single' ? 'white' : 'var(--text-secondary)',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    🔗 Tek Link (Hızlı Test)
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column */}
                <div>
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#14b8a6' }}>
                            OpenAI API Key *
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    {mode === 'single' ? (
                        <>
                            {/* Single Link Mode */}
                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#14b8a6' }}>
                                    Künye Sayfası Linki *
                                </label>
                                <input
                                    type="url"
                                    value={singleLink}
                                    onChange={(e) => setSingleLink(e.target.value)}
                                    placeholder="https://www.example.com/kunye"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>

                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                                    Yayın Adı (Opsiyonel)
                                </label>
                                <input
                                    type="text"
                                    value={yayinAdi}
                                    onChange={(e) => setYayinAdi(e.target.value)}
                                    placeholder="Örn: Hürriyet"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem',
                                        color: 'var(--text-primary)',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Boş bırakılırsa otomatik tespit edilir
                                </p>
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', background: '#14b8a6', borderColor: '#14b8a6' }}
                                disabled={!singleLink || loading || !apiKey}
                                onClick={handleProcessSingle}
                            >
                                {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : '🚀 Analiz Et'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Excel Batch Mode */}
                            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem' }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls"
                                    style={{ display: 'none' }}
                                />

                                {excelFile ? (
                                    <div>
                                        <FileText size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{excelFile.name}</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Dosya yüklendi</p>
                                    </div>
                                ) : (
                                    <>
                                        <FileText size={48} color="#14b8a6" style={{ margin: '0 auto 1rem' }} />
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Excel dosyası yükleyin</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>A: Yayın adı, B: Link</p>
                                    </>
                                )}
                            </div>

                            <button
                                className="btn btn-primary"
                                style={{ width: '100%', marginBottom: '1rem', background: '#14b8a6', borderColor: '#14b8a6' }}
                                disabled={!excelFile || loading || !apiKey}
                                onClick={handleProcessExcel}
                            >
                                {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Toplu İşle'}
                            </button>

                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%', background: '#10b981', color: 'white' }}
                                disabled={!excelFile || loading || !apiKey}
                                onClick={downloadExcel}
                            >
                                <FileText size={18} /> Excel İndir
                            </button>
                        </>
                    )}
                </div>

                {/* Right Column - Results */}
                <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <Loader2 className="loading-spinner" size={32} />
                            <p style={{ marginTop: '1rem' }}>Web sayfaları analiz ediliyor...</p>
                        </div>
                    )}

                    {error && (
                        <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {results && !loading && (
                        <div>
                            {/* Summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1' }}>{results.total}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Toplam</div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{results.successful}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Başarılı</div>
                                </div>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{results.failed}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hata</div>
                                </div>
                                <div style={{ background: 'rgba(20, 184, 166, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#14b8a6' }}>{results.processed}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>İşlenen</div>
                                </div>
                            </div>

                            {/* Results Preview */}
                            {results.results && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {results.results.slice(0, 10).map((result, idx) => (
                                        <div key={idx} style={{
                                            background: result.status === 'success' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            border: `1px solid ${result.status === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: 600 }}>#{result.row} - {result.yayin_adi}</span>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    background: result.status === 'success' ? '#10b981' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {result.status === 'success' ? 'Başarılı' : 'Hata'}
                                                </span>
                                            </div>
                                            {result.status === 'success' ? (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.data?.yayin_adi}</div>
                                                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>🔗 {result.link}</div>
                                                    {result.data?.kisiler && (
                                                        <div style={{ marginTop: '0.5rem' }}>
                                                            {result.data.kisiler.length} kişi bulundu
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#ef4444' }}>
                                                    Hata: {result.error}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {results.results.length > 10 && (
                                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                            ...ve {results.results.length - 10} kayıt daha
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div >
        </div >
    )
}

function RadyoNewsInterface() {
    const [audioFile, setAudioFile] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(null)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const hrs = Math.floor(mins / 60)
        const remainMins = mins % 60

        if (hrs > 0) {
            return `${hrs}s ${remainMins}dk`
        }
        return `${mins}dk`
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file && (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|mpg|ogg|flac)$/i))) {
            setAudioFile(file)
            setResult(null)
            setError(null)
            setProgress(null)
        } else {
            setError('Lütfen geçerli bir ses dosyası seçin (MP3, WAV, M4A, MPG, vb.)')
        }
    }

    const handleProcess = async () => {
        if (!audioFile || !apiKey) return

        setLoading(true)
        setError(null)
        setResult(null)
        setProgress(null)

        const formData = new FormData()
        formData.append('file', audioFile)
        formData.append('openai_api_key', apiKey)

        try {
            const response = await fetch('/api/v1/pipelines/radyo-news-stream', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error(`Server hatası: ${response.status}`)
            }

            const reader = response.body.getReader()
            const decoder = new TextDecoder()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.substring(6))

                            if (data.type === 'init') {
                                setProgress({ message: data.message, step: 'init' })
                            } else if (data.type === 'progress') {
                                setProgress(data)
                            } else if (data.type === 'news_found') {
                                setProgress({ ...data, isNews: true })
                            } else if (data.type === 'complete') {
                                setResult(data.result)
                                setProgress(null)
                                setLoading(false)
                            } else if (data.type === 'error') {
                                setError(data.message)
                                setLoading(false)
                            }
                        } catch (e) {
                            console.error('Parse error:', e)
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
            setLoading(false)
        }
    }

    const exportJSON = () => {
        if (!result) return

        const dataStr = JSON.stringify(result, null, 2)
        const dataBlob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = `radyo_news_${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Radio size={32} color="#8b5cf6" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Radyo News Analyzer</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Radyo kayıtlarından otomatik haber segmentlerini tespit eder</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#8b5cf6' }}>
                            OpenAI API Key *
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    <div
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            marginBottom: '1.5rem',
                            border: audioFile ? '2px solid #10b981' : '2px dashed var(--border-color)'
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="audio/*,.mp3,.wav,.m4a,.mpg,.ogg,.flac"
                            style={{ display: 'none' }}
                        />

                        {audioFile ? (
                            <>
                                <Radio size={48} color="#10b981" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{audioFile.name}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Boyut: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </>
                        ) : (
                            <>
                                <Upload size={48} color="#8b5cf6" style={{ margin: '0 auto 1rem' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Ses Dosyası Yükle</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    MP3, WAV, M4A, MPG formatları desteklenir
                                </p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', background: '#8b5cf6', borderColor: '#8b5cf6' }}
                        disabled={!audioFile || !apiKey || loading}
                        onClick={handleProcess}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> Analiz Ediliyor...</> : <><Radio size={18} /> Analiz Et</>}
                    </button>

                    {result && (
                        <button
                            className="btn btn-secondary"
                            style={{ width: '100%', marginTop: '1rem', background: '#10b981', color: 'white' }}
                            onClick={exportJSON}
                        >
                            <FileText size={18} /> JSON İndir
                        </button>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '2rem', maxHeight: '800px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Sonuçlar</h3>

                    {loading && progress && (
                        <div style={{ padding: '2rem' }}>
                            <div style={{
                                padding: '1.5rem',
                                background: 'rgba(139, 92, 246, 0.05)',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <Loader2 className="loading-spinner" size={24} color="#8b5cf6" />
                                    <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#8b5cf6' }}>
                                        {progress.step === 'uploaded' && '✓ Yüklendi'}
                                        {progress.step === 'transcription' && '🎤 Whisper Transkript Alıyor...'}
                                        {progress.step === 'transcribed' && '✓ Transkript Tamamlandı'}
                                        {progress.step === 'analysis' && '🤖 GPT Haber Analizi Yapıyor...'}
                                        {progress.step === 'analyzed' && '✓ Analiz Tamamlandı'}
                                    </span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                                    {progress.message}
                                </p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div style={{
                            color: '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '0.5rem'
                        }}>
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {result && !loading && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{result.total_news_count}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Toplam Haber</div>
                                </div>
                                <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6' }}>{Object.keys(result.categories || {}).length}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Kategori</div>
                                </div>
                            </div>

                            {result.categories && Object.keys(result.categories).length > 0 && (
                                <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Kategori Dağılımı:</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
                                        {Object.entries(result.categories).map(([cat, count]) => (
                                            <span key={cat} style={{
                                                padding: '0.25rem 0.75rem',
                                                background: 'rgba(99, 102, 241, 0.1)',
                                                borderRadius: '1rem',
                                                color: '#6366f1',
                                                fontWeight: 600
                                            }}>
                                                {cat}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {result.news_items && result.news_items.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {result.news_items.map((news, idx) => (
                                        <div key={idx} style={{
                                            background: 'rgba(16, 185, 129, 0.05)',
                                            borderRadius: '0.75rem',
                                            padding: '1.5rem',
                                            border: '1px solid rgba(16, 185, 129, 0.2)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#10b981', margin: 0, flex: 1 }}>
                                                    {news.baslik}
                                                </h4>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '1rem',
                                                    background: '#8b5cf6',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    marginLeft: '1rem',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {news.kategori}
                                                </span>
                                            </div>

                                            {news.ozet && (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem', fontStyle: 'italic' }}>
                                                    {news.ozet}
                                                </p>
                                            )}

                                            <p style={{ lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                                {news.tam_metin}
                                            </p>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                {news.tarih && <span style={{ color: 'var(--text-secondary)' }}>📅 {news.tarih}</span>}
                                                {news.kisiler && news.kisiler.length > 0 && <span style={{ color: 'var(--text-secondary)' }}>👤 {news.kisiler.join(', ')}</span>}
                                                {news.kurumlar && news.kurumlar.length > 0 && <span style={{ color: 'var(--text-secondary)' }}>🏢 {news.kurumlar.join(', ')}</span>}
                                                {news.yerler && news.yerler.length > 0 && <span style={{ color: 'var(--text-secondary)' }}>📍 {news.yerler.join(', ')}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                    <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                                    <p>Hiç haber segmenti bulunamadı</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && !result && !error && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                            <Radio size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>Ses dosyası yükleyin ve analizi başlatın</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default App
