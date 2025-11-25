import { useState, useRef, useEffect } from 'react'
import { ScanText, LayoutGrid, ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle, MessageSquare, Send, Bot } from 'lucide-react'

function App() {
    const [currentView, setCurrentView] = useState('dashboard')

    return (
        <div className="app-wrapper">
            <header style={{ borderBottom: '1px solid var(--border-color)', padding: '1rem 0', background: 'var(--glass-bg)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(10px)' }}>
                <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCurrentView('dashboard')}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex' }}>
                            <LayoutGrid size={24} color="white" />
                        </div>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>Medya Takip Merkezi (MTM)</h1>
                    </div>
                    {currentView !== 'dashboard' && (
                        <button className="btn btn-secondary" onClick={() => setCurrentView('dashboard')} style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                            <ArrowLeft size={16} /> Uygulamalara Dön
                        </button>
                    )}
                </div>
            </header>

            <main className="container" style={{ flex: 1, padding: '2rem' }}>
                {currentView === 'dashboard' ? (
                    <Dashboard onViewChange={setCurrentView} />
                ) : currentView === 'ocr' ? (
                    <OCRInterface />
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
            id: 'chat',
            name: 'Qwen2.5-7B Asistan',
            description: 'Qwen2.5-7B-Instruct modeli ile güçlendirilmiş, Türkçe yapay zeka asistanı.',
            icon: <MessageSquare size={32} color="#10b981" />,
            status: 'Yeni'
        },
    ]

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Yapay Zeka Servisleri
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    MTM'in gelişmiş makine öğrenimi servislerini test etmek ve etkileşime geçmek için merkezi platform.
                </p>
            </div>

            <div className="grid-layout">
                {apps.map(app => (
                    <div key={app.id} className="glass-panel" style={{ padding: '2rem', transition: 'transform 0.2s', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                        onClick={() => onViewChange(app.id)}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: app.id === 'ocr' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '1rem' }}>
                                {app.icon}
                            </div>
                            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
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
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const fileInputRef = useRef(null)

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            setPreview(URL.createObjectURL(selectedFile))
            setResult(null)
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setLoading(true)
        setError(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/v1/ocr', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('OCR işlemi başarısız oldu')
            }

            const data = await response.json()
            setResult(data.text)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
                            background: file ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                        }}
                        onClick={() => fileInputRef.current.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault()
                            const droppedFile = e.dataTransfer.files[0]
                            if (droppedFile && droppedFile.type.startsWith('image/')) {
                                setFile(droppedFile)
                                setPreview(URL.createObjectURL(droppedFile))
                                setResult(null)
                                setError(null)
                            }
                        }}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />

                        {preview ? (
                            <div style={{ position: 'relative' }}>
                                <img src={preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                <div style={{ marginTop: '1rem' }}>
                                    <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>{file.name}</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Değiştirmek için tıklayın</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ background: 'var(--surface-color)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                    <Upload size={32} color="var(--text-secondary)" />
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Resim yüklemek için tıklayın</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>JPG, PNG, WEBP desteklenir</p>
                            </>
                        )}
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1.5rem' }}
                        disabled={!file || loading}
                        onClick={handleUpload}
                    >
                        {loading ? <><Loader2 className="loading-spinner" size={20} /> İşleniyor...</> : 'Metni Çıkar'}
                    </button>
                </div>

                {/* Result Section */}
                <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} color="#6366f1" /> Sonuç
                        </h3>
                        {result && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#10b981' }}>
                                <CheckCircle size={14} /> Tamamlandı
                            </span>
                        )}
                    </div>

                    <div style={{
                        flex: 1,
                        background: 'var(--bg-color)',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        overflowY: 'auto',
                        maxHeight: '500px',
                        border: '1px solid var(--border-color)',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.9rem',
                        lineHeight: 1.6
                    }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: '1rem' }}>
                                <Loader2 className="loading-spinner" size={32} />
                                <p>Doküman analiz ediliyor...</p>
                            </div>
                        ) : error ? (
                            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        ) : result ? (
                            result
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4rem' }}>
                                Sonuç burada görünecek
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

export default App
