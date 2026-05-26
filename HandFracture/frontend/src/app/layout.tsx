import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OsteoInsight Enterprise - AI Radiology Fracture Analysis Platform',
  description: 'Production-ready clinical decision support suite for digital radiography, featuring multi-model benchmarking, Fuzzy C-Means, and sub-pixel bone deformity analytics.',
  keywords: ['radiology', 'AI', 'bone fracture', 'digital radiography', 'PACS integration', 'DICOM-SR', 'biomedical AI'],
  authors: [{ name: 'DeepMind Advanced Agentic Systems' }]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased text-slate-100 bg-slate-950 min-h-screen">
        {children}
      </body>
    </html>
  )
}
