'use client'

import { useState } from 'react'
import { useAuth } from '../app/providers'
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth'
import { User, LogOut, Settings, Mic, MicOff } from 'lucide-react'

interface HeaderProps {
  isRecording?: boolean
  onToggleRecording?: () => void
}

export function Header({ isRecording = false, onToggleRecording }: HeaderProps) {
  const { user, auth } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setShowUserMenu(false)
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">VD</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg">VoiceDev Partner</h1>
              <p className="text-slate-400 text-xs">AI Development Companion</p>
            </div>
          </div>

          {/* Center - Recording Controls */}
          <div className="flex items-center space-x-4">
            {user && onToggleRecording && (
              <button
                onClick={onToggleRecording}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all duration-200
                  ${isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white recording-pulse' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }
                `}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span>Start Voice Chat</span>
                  </>
                )}
              </button>
            )}

            {isRecording && (
              <div className="voice-wave text-red-400">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>

          {/* Right - User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg transition-colors"
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User className="w-5 h-5 text-slate-300" />
                  )}
                  <span className="text-white text-sm font-medium">
                    {user.displayName || user.email}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-1">
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <hr className="border-slate-700 my-1" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-left text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
