import { useState, useRef, useEffect } from 'react'
import { ScanText, LayoutGrid, ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle, MessageSquare, Send, Bot, Code, Book, ChevronDown, ChevronUp } from 'lucide-react'
import Documentation from './Documentation'

function App() {
    const [currentView, setCurrentView] = useState('dashboard')

    return (
        <div className="app-wrapper">
            <header style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0', background: 'var(--glass-bg)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
                        <img src="/logo.png" alt="MTM Logo" style={{ height: '40px', width: 'auto' }} />
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Medya Takip Merkezi (MTM)</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button
                            className="btn"
                            onClick={() => setCurrentView('documentation')}
                            style={{
                                background: currentView === 'documentation' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: currentView === 'documentation' ? '#6366f1' : 'var(--text-secondary)',
                                border: '1px solid ' + (currentView === 'documentation' ? 'rgba(99, 102, 241, 0.2)' : 'transparent')
                            }}
                        >
                            <Book size={18} /> Dokümantasyon
                        </button>
                        {currentView !== 'dashboard' && (
                            <button className="btn btn-secondary" onClick={() => setCurrentView('dashboard')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                                <ArrowLeft size={16} /> Uygulamalara Dön
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container" style={{ flex: 1, padding: '2rem' }}>
                {currentView === 'dashboard' ? (
                    <Dashboard onViewChange={setCurrentView} />
                ) : currentView === 'ocr' ? (
                    <OCRInterface />
                ) : currentView === 'hunyuan' ? (
                    <HunyuanOCRInterface />
                ) : currentView === 'pipelines' ? (
                    <IflasOCRInterface />
                ) : currentView === 'documentation' ? (
                    <Documentation />
                ) : (
                    <ChatInterface />
                )}
            </main>
        </div>
    )
}

function Dashboard({ onViewChange }) {
    const apps = [
        {
            id: 'ocr',
            name: 'DeepSeek OCR',
            description: 'DeepSeek-V2 ve vLLM destekli gelişmiş optik karakter tanıma servisi.',
            icon: <ScanText size={32} color="#6366f1" />,
            status: 'Aktif'
        },
        {
            id: 'hunyuan',
            name: 'Hunyuan OCR',
            description: 'Tencent Hunyuan OCR modeli - Yüksek performanslı metin tanıma servisi.',
            icon: <ScanText size={32} color="#10b981" />,
            status: 'Aktif'
        },
        {
            id: 'chat',
            name: 'Local Turkish-Gemma LLM',
            description: 'YTÜ COSMOS Turkish-Gemma-9b-T1 modeli - Türkçe\'ye özel eğitilmiş, akıllı reasoning asistanı.',
            icon: <MessageSquare size={32} color="#94a3b8" />,
            status: 'Hizmet Dışı',
            disabled: true
        },
        {
            id: 'pipelines',
            name: 'OpenAI İflas OCR',
            description: 'Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarımı - OpenAI GPT-4 destekli.',
            icon: <Code size={32} color="#f59e0b" />,
            status: 'Beta'
        },
    ]

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Yapay Zeka Servisleri
                </h2>

            </div>

            <div className="grid-layout">
                {apps.map(app => (
                    <div key={app.id}
                        className="glass-panel"
                        style={{
                            padding: '2rem',
                            transition: 'transform 0.2s',
                            cursor: app.disabled ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            opacity: app.disabled ? 0.6 : 1
                        }}
                        onClick={() => !app.disabled && onViewChange(app.id)}
                        onMouseEnter={(e) => !app.disabled && (e.currentTarget.style.transform = 'translateY(-5px)')}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: app.disabled ? 'rgba(148, 163, 184, 0.1)' : (app.id === 'ocr' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)'), padding: '1rem', borderRadius: '1rem' }}>
                                {app.icon}
                            </div>
                            <span style={{
                                background: app.disabled ? 'rgba(148, 163, 184, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: app.disabled ? '#94a3b8' : '#10b981',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                            }}>
                                {app.status}
                            </span>
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{app.name}</h3>
                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{app.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function OCRInterface() {
    const [files, setFiles] = useState([])
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [format, setFormat] = useState('json')
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles)
            const newPreviews = selectedFiles.map(file => URL.createObjectURL(file))
            setPreviews(newPreviews)
            setResults(null)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (files.length === 0) return

        setLoading(true)
        setError(null)

        const formData = new FormData()
        files.forEach(file => {
            formData.append('files', file)
        })
        formData.append('response_format', format)

        try {
            const response = await fetch('/api/v1/ocr', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('OCR işlemi başarısız oldu')
            }

            const data = await response.json()
            setResults(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <ScanText size={32} color="#6366f1" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>DeepSeek OCR</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>DeepSeek-V2 modelini kullanarak görselden metin çıkarın.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Upload Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '1rem',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: files.length > 0 ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                        }}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault()
                            const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                            if (droppedFiles.length > 0) {
                                setFiles(droppedFiles)
                                setPreviews(droppedFiles.map(f => URL.createObjectURL(f)))
                                setResults(null)
                                setError(null)
                            }
                        }}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                        />

                        {files.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                {previews.map((preview, idx) => (
                                    <div key={idx} style={{ position: 'relative' }}>
                                        <img src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                    </div>
                                ))}
                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{files.length} dosya seçildi</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Değiştirmek için tıklayın</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: 'var(--surface-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <Upload size={32} color="var(--text-secondary)" />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Resim yüklemek için tıklayın</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Birden fazla dosya seçebilirsiniz (JPG, PNG, WEBP)</p>
                            </>
                        )}
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Çıktı Formatı</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className={`btn ${format === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormat('json')}
                                style={{ flex: 1 }}
                            >
                                JSON
                            </button>
                            <button
                                className={`btn ${format === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormat('text')}
                                style={{ flex: 1 }}
                            >
                                Text
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        disabled={files.length === 0 || loading}
                        onClick={handleUpload}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Metni Çıkar'}
                    </button>
                </div>

                {/* Results Section */}
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', maxHeight: '800px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Sonuçlar
                        </h3>
                        {results && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#10b981' }}>
                                <CheckCircle size={14} /> Tamamlandı
                            </span>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '1rem', minHeight: '200px' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p>Dokümanlar analiz ediliyor...</p>
                            </div>
                        ) : error ? (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        ) : results ? (
                            results.map((res, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-color)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        {res.filename}
                                    </div>
                                    <pre style={{
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.6,
                                        margin: 0,
                                        color: 'var(--text-primary)'
                                    }}>
                                        {res.text}
                                    </pre>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                Çıkarılan metinler burada görünecek...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function HunyuanOCRInterface() {
    const [files, setFiles] = useState([])
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [format, setFormat] = useState('json')
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files)
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles)
            const newPreviews = selectedFiles.map(file => URL.createObjectURL(file))
            setPreviews(newPreviews)
            setResults(null)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (files.length === 0) return

        setLoading(true)
        setError(null)

        const formData = new FormData()
        files.forEach(file => {
            formData.append('files', file)
        })
        formData.append('response_format', format)

        try {
            const response = await fetch('/api/v1/hunyuan-ocr', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('OCR işlemi başarısız oldu')
            }

            const data = await response.json()
            setResults(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <ScanText size={32} color="#10b981" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Hunyuan OCR</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Tencent Hunyuan modelini kullanarak görselden metin çıkarın.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Upload Section */}
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '1rem',
                            padding: '3rem 2rem',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: files.length > 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                        }}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault()
                            const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
                            if (droppedFiles.length > 0) {
                                setFiles(droppedFiles)
                                setPreviews(droppedFiles.map(f => URL.createObjectURL(f)))
                                setResults(null)
                                setError(null)
                            }
                        }}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                        />

                        {files.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                {previews.map((preview, idx) => (
                                    <div key={idx} style={{ position: 'relative' }}>
                                        <img src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                    </div>
                                ))}
                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{files.length} dosya seçildi</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Değiştirmek için tıklayın</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: 'var(--surface-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <Upload size={32} color="var(--text-secondary)" />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Resim yüklemek için tıklayın</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Birden fazla dosya seçebilirsiniz (JPG, PNG, WEBP)</p>
                            </>
                        )}
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Çıktı Formatı</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                className={`btn ${format === 'json' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormat('json')}
                                style={{ flex: 1 }}
                            >
                                JSON
                            </button>
                            <button
                                className={`btn ${format === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormat('text')}
                                style={{ flex: 1 }}
                            >
                                Text
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        disabled={files.length === 0 || loading}
                        onClick={handleUpload}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Metni Çıkar'}
                    </button>
                </div>

                {/* Results Section */}
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', maxHeight: '800px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#10b981" /> Sonuçlar
                        </h3>
                        {results && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#10b981' }}>
                                <CheckCircle size={14} /> Tamamlandı
                            </span>
                        )}
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '1rem', minHeight: '200px' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p>Dokümanlar analiz ediliyor...</p>
                            </div>
                        ) : error ? (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        ) : results ? (
                            results.map((res, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-color)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                                        {res.filename}
                                    </div>
                                    <pre style={{
                                        fontFamily: 'monospace',
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '0.85rem',
                                        lineHeight: 1.6,
                                        margin: 0,
                                        color: 'var(--text-primary)'
                                    }}>
                                        {res.text}
                                    </pre>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                                Çıkarılan metinler burada görünecek...
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}


function ChatInterface() {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Merhaba! Ben MTM yapay zeka asistanıyım. Size nasıl yardımcı olabilirim?' }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSend = async (e) => {
        e.preventDefault()
        if (!input.trim() || loading) return

        const userMessage = { role: 'user', content: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)

        try {
            // Prepare messages for API (exclude initial greeting as models expect User first)
            const apiMessages = [...messages, userMessage]
                .filter((m, i) => !(i === 0 && m.role === 'assistant'))
                .map(m => ({ role: m.role, content: m.content }))

            const response = await fetch('/api/v1/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages })
            })

            if (!response.ok) throw new Error('Failed to fetch response')

            const data = await response.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' }])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', height: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <MessageSquare size={32} color="#10b981" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Qwen LLM Sohbet</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Yapay zeka asistanı ile sohbet edin.</p>
                </div>
            </div>

            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Messages Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                                maxWidth: '80%',
                                padding: '1rem',
                                borderRadius: '1rem',
                                borderTopLeftRadius: msg.role === 'user' ? '1rem' : '0',
                                borderTopRightRadius: msg.role === 'user' ? '0' : '1rem',
                                background: msg.role === 'user' ? 'var(--primary-color)' : 'var(--surface-color)',
                                color: 'var(--text-primary)',
                                lineHeight: 1.5
                            }}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '1rem', borderTopLeftRadius: 0 }}>
                                <Loader2 className="loading-spinner" size={20} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        style={{
                            flex: 1,
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            color: 'white',
                            outline: 'none'
                        }}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    )
}

function IflasOCRInterface() {
    const [files, setFiles] = useState([])
    const [previews, setPreviews] = useState([])
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [error, setError] = useState(null)
    const [apiKey, setApiKey] = useState('')
    const [ocrService, setOcrService] = useState('deepseek')
    const fileInputRef = useRef(null)

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
        formData.append('ocr_service', ocrService)

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

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                    <Code size={32} color="#f59e0b" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>OpenAI İflas OCR Pipeline</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarın - GPT-4 destekli</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Interaction */}
                <div>
                    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#f59e0b' }}>
                            OCR Servisi Seçin
                        </label>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button
                                className={`btn ${ocrService === 'deepseek' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setOcrService('deepseek')}
                                style={{ flex: 1 }}
                            >
                                DeepSeek OCR
                            </button>
                            <button
                                className={`btn ${ocrService === 'hunyuan' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setOcrService('hunyuan')}
                                style={{ flex: 1 }}
                            >
                                Hunyuan OCR
                            </button>
                        </div>

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
                            API key'iniz sadece bu istek için kullanılır ve saklanmaz. <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: '#f59e0b' }}>Buradan alabilirsiniz</a>
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

                        {files.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem' }}>
                                {previews.map((preview, idx) => (
                                    <div key={idx} style={{ position: 'relative' }}>
                                        <img src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '0.5rem' }} />
                                    </div>
                                ))}
                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{files.length} dosya seçildi</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Değiştirmek için tıklayın</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Upload size={48} color="var(--text-secondary)" />
                                <h3 style={{ marginTop: '1rem' }}>Gazete ilanı yükleyin</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Birden fazla dosya seçebilirsiniz (JPG, PNG, WEBP)</p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: '1.5rem' }}
                        disabled={files.length === 0 || !apiKey || loading}
                        onClick={handleProcess}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Verileri Çıkar'}
                    </button>

                    {(results || error) && (
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                                <FileText size={20} color="#f59e0b" /> Sonuçlar
                            </h3>

                            {error ? (
                                <div style={{ color: '#ef4444', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem' }}>
                                    <AlertCircle size={20} /> {error}
                                </div>
                            ) : results && (
                                <div style={{ display: 'grid', gap: '2rem' }}>
                                    {results.map((result, idx) => (
                                        <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                            <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                Sonuç #{idx + 1}
                                            </div>
                                            <div style={{ display: 'grid', gap: '1rem' }}>
                                                {Object.entries(result).map(([key, value]) => {
                                                    if (key === 'raw_ocr_text' || key === 'confidence') return null
                                                    const labels = {
                                                        'ad_soyad_unvan': 'Ad Soyad/Unvan',
                                                        'tckn': 'TCKN',
                                                        'vkn': 'VKN',
                                                        'adres': 'Adres',
                                                        'icra_iflas_mudurlugu': 'İcra Müdürlüğü',
                                                        'dosya_yili': 'Yıl',
                                                        'ilan_turu': 'Tür',
                                                        'ilan_tarihi': 'Tarih',
                                                        'davacilar': 'Davacılar',
                                                        'kaynak': 'Kaynak'
                                                    }
                                                    return (
                                                        <div key={key} style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: '0.5rem' }}>
                                                            <div style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 600 }}>{labels[key] || key}</div>
                                                            <div style={{ marginTop: '0.25rem' }}>
                                                                {Array.isArray(value) ? value.join(', ') : (value || 'Bulunamadı')}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Column: API Documentation */}
                <div>
                    <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Code size={20} color="#f59e0b" /> API Kullanımı
                        </h3>

                        <div style={{ marginBottom: '2rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
                                Bu pipeline'ı kendi uygulamalarınıza entegre etmek için aşağıdaki Python örneğini kullanabilirsiniz.
                            </p>

                            <div style={{ background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>python</span>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>requests</span>
                                </div>
                                <pre style={{ margin: 0, padding: '1rem', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace', color: '#e2e8f0' }}>
                                    {`import requests

url = "http://localhost/api/v1/pipelines/iflas-ocr"
api_key = "sk-proj-..." # OpenAI API Key

# Görsel dosyasını yükle
files = {
    'file': ('gazete_ilani.jpg', open('gazete_ilani.jpg', 'rb'), 'image/jpeg')
}

# API key'i form verisi olarak gönder
data = {
    'openai_api_key': api_key
}

response = requests.post(url, files=files, data=data)

if response.status_code == 200:
    result = response.json()
    print("Ad/Unvan:", result['ad_soyad_unvan'])
    print("TCKN:", result['tckn'])
    print("İlan Türü:", result['ilan_turu'])
else:
    print("Hata:", response.text)`}
                                </pre>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                                <strong style={{ color: '#f59e0b' }}>Endpoint:</strong> POST /api/v1/pipelines/iflas-ocr<br />
                                <strong style={{ color: '#f59e0b' }}>Response:</strong> JSON (Yapılandırılmış Veri)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App


