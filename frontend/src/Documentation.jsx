import { useState } from 'react'
import { ScanText, Code, Book, ChevronDown, ChevronUp, FileText } from 'lucide-react'

function APIDocSection({ title, icon, color, children, defaultOpen = false }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <section className="glass-panel" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    marginBottom: isOpen ? '1.5rem' : '0',
                    transition: 'all 0.2s'
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: `rgba(${color}, 0.1)`, padding: '0.75rem', borderRadius: '0.75rem' }}>
                        {icon}
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{title}</h3>
                </div>
                {isOpen ? <ChevronUp size={24} color="var(--text-secondary)" /> : <ChevronDown size={24} color="var(--text-secondary)" />}
            </div>

            {isOpen && (
                <div style={{ marginTop: '1rem' }}>
                    {children}
                </div>
            )}
        </section>
    )
}

export default function Documentation() {
    return (
        <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                    <Book size={32} color="#6366f1" />
                </div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>API Dokümantasyonu</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    MTM Yapay Zeka servislerini kendi uygulamalarınıza entegre edin.
                </p>
            </div>

            <div style={{ display: 'grid', gap: '0' }}>
                {/* DeepSeek OCR Docs */}
                <APIDocSection
                    title="DeepSeek OCR API"
                    icon={<ScanText size={24} color="#6366f1" />}
                    color="99, 102, 241"
                    defaultOpen={true}
                >
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Görsellerden yüksek doğrulukla metin çıkarımı yapar. Toplu işlem (batch processing) ve format seçimi destekler.
                    </p>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>POST</span>
                            <code style={{ background: 'var(--surface-color)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', color: 'var(--text-primary)' }}>/api/v1/ocr</code>
                        </div>

                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Parametreler</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>files</code>
                                <span style={{ color: 'var(--text-secondary)' }}>Görsel dosyaları listesi (Multipart Form Data)</span>
                            </li>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>response_format</code>
                                <span style={{ color: 'var(--text-secondary)' }}>'json' veya 'text' (Varsayılan: 'json')</span>
                            </li>
                        </ul>
                    </div>

                    <div style={{ background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.8rem' }}>Python Example</div>
                        <pre style={{ margin: 0, padding: '1.5rem', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace', color: '#e2e8f0', lineHeight: '1.6' }}>
                            {`import requests

response = requests.post(
    "http://your-server/api/v1/ocr",
    files=[
        ('files', ('image1.jpg', open('image1.jpg', 'rb'), 'image/jpeg')),
        ('files', ('image2.jpg', open('image2.jpg', 'rb'), 'image/jpeg'))
    ],
    data={'response_format': 'json'}
)

if response.status_code == 200:
    results = response.json()
    for result in results:
        print(f"{result['filename']}: {result['text']}")`}
                        </pre>
                    </div>
                </APIDocSection>

                {/* İflas OCR Pipeline Docs (Görsel) */}
                <APIDocSection
                    title="İflas OCR Pipeline API (Görsel)"
                    icon={<Code size={24} color="#f59e0b" />}
                    color="245, 158, 11"
                >
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Gazete ilanlarından yapılandırılmış iflas/icra verisi çıkarır. DeepSeek OCR + OpenAI GPT-4 kullanır.
                    </p>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>POST</span>
                            <code style={{ background: 'var(--surface-color)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', color: 'var(--text-primary)' }}>/api/v1/pipelines/iflas-ocr</code>
                        </div>

                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Parametreler</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>files</code>
                                <span style={{ color: 'var(--text-secondary)' }}>Gazete ilanı görsel listesi (Multipart Form Data)</span>
                            </li>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>openai_api_key</code>
                                <span style={{ color: 'var(--text-secondary)' }}>OpenAI API Anahtarı (Form Data)</span>
                            </li>
                        </ul>

                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Response</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <li style={{ padding: '0.5rem 0' }}>• ad_soyad_unvan, tckn, vkn</li>
                            <li style={{ padding: '0.5rem 0' }}>• adres, icra_iflas_mudurlugu</li>
                            <li style={{ padding: '0.5rem 0' }}>• dosya_yili, ilan_turu, ilan_tarihi</li>
                            <li style={{ padding: '0.5rem 0' }}>• davacilar[], raw_ocr_text</li>
                        </ul>
                    </div>

                    <div style={{ background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.8rem' }}>Python Example</div>
                        <pre style={{ margin: 0, padding: '1.5rem', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace', color: '#e2e8f0', lineHeight: '1.6' }}>
                            {`import requests

response = requests.post(
    "http://your-server/api/v1/pipelines/iflas-ocr",
    files=[
        ('files', ('ilan1.jpg', open('ilan1.jpg', 'rb'), 'image/jpeg'))
    ],
    data={
        'openai_api_key': 'sk-proj-...'
    }
)

if response.status_code == 200:
    results = response.json()
    for result in results:
        print(f"Ad/Unvan: {result['ad_soyad_unvan']}")
        print(f"TCKN: {result['tckn']}")
        print(f"İlan Türü: {result['ilan_turu']}")`}
                        </pre>
                    </div>
                </APIDocSection>

                {/* İflas OCR Pipeline Batch (Excel) */}
                <APIDocSection
                    title="İflas OCR Pipeline API (Excel Toplu İşleme)"
                    icon={<FileText size={24} color="#10b981" />}
                    color="16, 185, 129"
                >
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                        Excel dosyasındaki medyatakip clip ID'lerini okur, görselleri indirir, OCR yapar ve yapılandırılmış veri çıkarır. Toplu işlem için optimize edilmiş.
                    </p>

                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                            <span style={{ background: '#10b981', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }}>POST</span>
                            <code style={{ background: 'var(--surface-color)', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', color: 'var(--text-primary)' }}>/api/v1/pipelines/iflas-ocr-batch</code>
                        </div>

                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Parametreler</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>file</code>
                                <span style={{ color: 'var(--text-secondary)' }}>Excel dosyası (.xlsx, .xls) - İlk kolonda clip ID'leri</span>
                            </li>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>openai_api_key</code>
                                <span style={{ color: 'var(--text-secondary)' }}>OpenAI API Anahtarı</span>
                            </li>
                            <li style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
                                <code style={{ color: '#f59e0b' }}>id_column</code>
                                <span style={{ color: 'var(--text-secondary)' }}>Excel kolonu (Varsayılan: 'A')</span>
                            </li>
                        </ul>

                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Response</h4>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <li style={{ padding: '0.5rem 0' }}>• total, processed, successful, failed</li>
                            <li style={{ padding: '0.5rem 0' }}>• results[]: row, clip_id, status, data, error</li>
                            <li style={{ padding: '0.5rem 0' }}>• Her result için: tüm iflas verileri + raw_ocr_text</li>
                        </ul>
                    </div>

                    <div style={{ background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{ padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', color: '#94a3b8', fontSize: '0.8rem' }}>Python Example</div>
                        <pre style={{ margin: 0, padding: '1.5rem', overflowX: 'auto', fontSize: '0.85rem', fontFamily: 'monospace', color: '#e2e8f0', lineHeight: '1.6' }}>
                            {`import requests

# Excel hazırla: A kolonunda clip ID'ler
# A1: 2025110000041301
# A2: 2025110000041302
# ...

response = requests.post(
    "http://your-server/api/v1/pipelines/iflas-ocr-batch",
    files={
        'file': ('clips.xlsx', open('clips.xlsx', 'rb'))
    },
    data={
        'openai_api_key': 'sk-proj-...',
        'id_column': 'A'
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"Toplam: {data['total']}")
    print(f"Başarılı: {data['successful']}")
    print(f"Hatalı: {data['failed']}")
    
    for result in data['results']:
        if result['status'] == 'success':
            print(f"#{result['row']}: {result['data']['ad_soyad_unvan']}")
        else:
            print(f"#{result['row']} HATA: {result['error']}")`}
                        </pre>
                    </div>
                </APIDocSection>
            </div>
        </div>
    )
}
