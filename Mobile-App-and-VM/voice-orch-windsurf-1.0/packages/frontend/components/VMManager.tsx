'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../app/providers'
import { Play, Square, Trash2, Server, Terminal, Code, Settings } from 'lucide-react'

interface VM {
  id: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  type: 'docker' | 'gcp';
  environment: 'node' | 'python' | 'general';
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  createdAt: string;
  lastActivity: string;
}

interface CodeExecution {
  code: string;
  language: 'javascript' | 'python' | 'bash';
  output?: string;
  error?: string;
  loading?: boolean;
}

export function VMManager() {
  const { user } = useAuth()
  const [vms, setVMs] = useState<VM[]>([])
  const [selectedVM, setSelectedVM] = useState<string | null>(null)
  const [codeExecution, setCodeExecution] = useState<CodeExecution>({
    code: '',
    language: 'javascript'
  })
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newVMEnvironment, setNewVMEnvironment] = useState<'node' | 'python' | 'general'>('node')

  useEffect(() => {
    if (user) {
      fetchVMs()
    }
  }, [user])

  const fetchVMs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vm`, {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setVMs(data.vms || [])
      }
    } catch (error) {
      console.error('Error fetching VMs:', error)
    }
  }

  const createVM = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vm/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          sessionId: `session_${Date.now()}`,
          environment: newVMEnvironment
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('VM created:', data.vm)
        await fetchVMs()
        setShowCreateForm(false)
      } else {
        const error = await response.json()
        console.error('Failed to create VM:', error)
      }
    } catch (error) {
      console.error('Error creating VM:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeCode = async () => {
    if (!selectedVM || !codeExecution.code.trim()) return

    setCodeExecution(prev => ({ ...prev, loading: true, output: '', error: '' }))

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vm/${selectedVM}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({
          code: codeExecution.code,
          language: codeExecution.language,
          timeout: 30000
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCodeExecution(prev => ({
          ...prev,
          output: data.result.output,
          error: data.result.error,
          loading: false
        }))
      } else {
        const error = await response.json()
        setCodeExecution(prev => ({
          ...prev,
          error: error.details || 'Execution failed',
          loading: false
        }))
      }
    } catch (error) {
      setCodeExecution(prev => ({
        ...prev,
        error: 'Network error',
        loading: false
      }))
    }
  }

  const stopVM = async (vmId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vm/${vmId}/stop`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      })

      if (response.ok) {
        await fetchVMs()
      }
    } catch (error) {
      console.error('Error stopping VM:', error)
    }
  }

  const deleteVM = async (vmId: string) => {
    if (!confirm('Are you sure you want to delete this VM?')) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/vm/${vmId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      })

      if (response.ok) {
        await fetchVMs()
        if (selectedVM === vmId) {
          setSelectedVM(null)
        }
      }
    } catch (error) {
      console.error('Error deleting VM:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-400'
      case 'stopped': return 'text-yellow-400'
      case 'creating': return 'text-blue-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getEnvironmentIcon = (environment: string) => {
    switch (environment) {
      case 'node': return '🟢'
      case 'python': return '🐍'
      case 'general': return '⚙️'
      default: return '📦'
    }
  }

  if (!user) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-8 text-center">
        <Server className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h2 className="text-xl font-semibold text-white mb-4">VM Management</h2>
        <p className="text-slate-300">Please sign in to manage virtual machines.</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-700/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Server className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Virtual Machines</h2>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Create VM
        </button>
      </div>

      <div className="p-6">
        {/* Create VM Form */}
        {showCreateForm && (
          <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <h3 className="text-white font-medium mb-4">Create New VM</h3>
            <div className="flex items-center space-x-4">
              <select
                value={newVMEnvironment}
                onChange={(e) => setNewVMEnvironment(e.target.value as any)}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600"
              >
                <option value="node">Node.js</option>
                <option value="python">Python</option>
                <option value="general">General</option>
              </select>
              <button
                onClick={createVM}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* VM List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {vms.map((vm) => (
            <div
              key={vm.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedVM === vm.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
              }`}
              onClick={() => setSelectedVM(vm.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getEnvironmentIcon(vm.environment)}</span>
                  <span className="text-white font-medium">{vm.environment}</span>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(vm.status)}`}>
                  {vm.status}
                </span>
              </div>
              
              <div className="text-sm text-slate-300 space-y-1">
                <div>Type: {vm.type}</div>
                <div>CPU: {vm.resources.cpu}</div>
                <div>Memory: {vm.resources.memory}</div>
              </div>

              <div className="flex items-center space-x-2 mt-3">
                {vm.status === 'running' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      stopVM(vm.id)
                    }}
                    className="p-1 text-yellow-400 hover:text-yellow-300"
                    title="Stop VM"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteVM(vm.id)
                  }}
                  className="p-1 text-red-400 hover:text-red-300"
                  title="Delete VM"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Code Execution */}
        {selectedVM && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Terminal className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Code Execution</h3>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={codeExecution.language}
                onChange={(e) => setCodeExecution(prev => ({ ...prev, language: e.target.value as any }))}
                className="bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="bash">Bash</option>
              </select>
              <button
                onClick={executeCode}
                disabled={codeExecution.loading || !codeExecution.code.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>{codeExecution.loading ? 'Running...' : 'Execute'}</span>
              </button>
            </div>

            <textarea
              value={codeExecution.code}
              onChange={(e) => setCodeExecution(prev => ({ ...prev, code: e.target.value }))}
              placeholder={`Enter ${codeExecution.language} code here...`}
              className="w-full h-32 bg-slate-700 text-white p-3 rounded-lg border border-slate-600 font-mono text-sm"
            />

            {/* Output */}
            {(codeExecution.output || codeExecution.error) && (
              <div className="space-y-2">
                {codeExecution.output && (
                  <div>
                    <h4 className="text-green-400 font-medium mb-2">Output:</h4>
                    <pre className="bg-slate-900 text-green-300 p-3 rounded-lg text-sm overflow-x-auto">
                      {codeExecution.output}
                    </pre>
                  </div>
                )}
                {codeExecution.error && (
                  <div>
                    <h4 className="text-red-400 font-medium mb-2">Error:</h4>
                    <pre className="bg-slate-900 text-red-300 p-3 rounded-lg text-sm overflow-x-auto">
                      {codeExecution.error}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {vms.length === 0 && (
          <div className="text-center py-8">
            <Server className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-300 mb-4">No virtual machines yet</p>
            <p className="text-slate-400 text-sm">Create your first VM to start coding!</p>
          </div>
        )}
      </div>
    </div>
  )
}
