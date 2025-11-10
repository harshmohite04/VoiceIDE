'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, Auth, onAuthStateChanged, User } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { io, Socket } from 'socket.io-client'

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Context types
interface AuthContextType {
  user: User | null
  loading: boolean
  auth: Auth
}

interface SocketContextType {
  socket: Socket | null
  connected: boolean
}

interface FirebaseContextType {
  auth: Auth
  db: Firestore
}

// Create contexts
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  auth,
})

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
})

const FirebaseContext = createContext<FirebaseContextType>({
  auth,
  db,
})

// Auth Provider
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, auth }}>
      {children}
    </AuthContext.Provider>
  )
}

// Socket Provider
function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001', {
        auth: {
          userId: user.uid,
        },
      })

      newSocket.on('connect', () => {
        setConnected(true)
        console.log('Connected to server')
      })

      newSocket.on('disconnect', () => {
        setConnected(false)
        console.log('Disconnected from server')
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
        setSocket(null)
        setConnected(false)
      }
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}

// Firebase Provider
function FirebaseProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseContext.Provider value={{ auth, db }}>
      {children}
    </FirebaseContext.Provider>
  )
}

// Combined Providers
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider>
      <AuthProvider>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
    </FirebaseProvider>
  )
}

// Custom hooks
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}

export function useFirebase() {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider')
  }
  return context
}
