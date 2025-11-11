'use client'

import { useState } from 'react'
import { VoiceChat } from '../components/VoiceChat'
import { RealtimeVoiceChat } from '../components/RealtimeVoiceChat'
import { RealtimeDiagnostics } from '../components/RealtimeDiagnostics'
import { Header } from '../components/Header'
import { VMManager } from '../components/VMManager'

export default function Home() {
  const [voiceMode, setVoiceMode] = useState<'traditional' | 'realtime' | 'diagnostics'>('realtime')

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              🎙️ VoiceDev Partner
            </h1>
            <p className="text-xl text-slate-300 mb-6">
              Your AI-powered development companion. Discuss ideas, build prototypes, and stream outputs in real-time.
            </p>
            
            {/* Voice Mode Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={() => setVoiceMode('traditional')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  voiceMode === 'traditional'
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Traditional Voice
              </button>
              <button
                onClick={() => setVoiceMode('realtime')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  voiceMode === 'realtime'
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Realtime Voice ⚡
              </button>
              <button
                onClick={() => setVoiceMode('diagnostics')}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  voiceMode === 'diagnostics'
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                🔧 Diagnostics
              </button>
            </div>
          </div>
          
          <div className="space-y-8">
            {voiceMode === 'traditional' && <VoiceChat />}
            {voiceMode === 'realtime' && <RealtimeVoiceChat />}
            {voiceMode === 'diagnostics' && <RealtimeDiagnostics />}
            <VMManager />
          </div>
        </div>
      </div>
    </main>
  )
}
