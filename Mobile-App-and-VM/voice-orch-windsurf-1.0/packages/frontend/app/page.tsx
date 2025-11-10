'use client'

import { VoiceChat } from '../components/VoiceChat'
import { Header } from '../components/Header'
import { VMManager } from '../components/VMManager'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              🎙️ VoiceDev Partner
            </h1>
            <p className="text-xl text-slate-300">
              Your AI-powered development companion. Discuss ideas, build prototypes, and stream outputs in real-time.
            </p>
          </div>
          <div className="space-y-8">
            <VoiceChat />
            <VMManager />
          </div>
        </div>
      </div>
    </main>
  )
}
