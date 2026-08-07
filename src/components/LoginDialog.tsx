import { useState, useEffect, useRef, FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { md5 } from 'js-md5'
import { AUTH_CONFIG } from '../config/auth'

type Status = 'idle' | 'loading' | 'error' | 'success'

interface LoginDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function LoginDialog({ open, onClose, onSuccess }: LoginDialogProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const usernameRef = useRef<HTMLInputElement>(null)

  // Focus username on open; reset state on close
  useEffect(() => {
    if (open) {
      setStatus('idle')
      setErrorMsg('')
      // small delay so the animation can play before focus
      const t = setTimeout(() => usernameRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status !== 'loading') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, status, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (status === 'loading') return

    setStatus('loading')
    setErrorMsg('')

    // Simulate network latency so the loading state is visible
    setTimeout(() => {
      const inputMd5 = md5(password)
      const userOk = username === AUTH_CONFIG.username
      const passOk = inputMd5 === AUTH_CONFIG.passwordMd5

      if (userOk && passOk) {
        setStatus('success')
        setTimeout(() => {
          onSuccess()
          onClose()
          // reset fields after closing so reopening is clean
          setUsername('')
          setPassword('')
          setStatus('idle')
        }, 700)
      } else {
        setStatus('error')
        setErrorMsg('Invalid username or password')
      }
    }, 400)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => status !== 'loading' && onClose()}
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            className="relative w-full max-w-md liquid-glass rounded-3xl p-8"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              disabled={status === 'loading'}
              aria-label="Close login dialog"
              className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2
                id="login-title"
                className="text-3xl text-white tracking-tight"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                Welcome back
              </h2>
              <p className="text-white/60 text-sm mt-2">Sign in to your Hong-DB account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
                />
                <input
                  ref={usernameRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-colors disabled:opacity-50"
                />
              </div>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 pointer-events-none"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  disabled={status === 'loading' || status === 'success'}
                  className="w-full bg-white/5 border border-white/10 rounded-full pl-11 pr-4 py-3 text-white placeholder:text-white/40 text-sm outline-none focus:border-white/30 focus:bg-white/10 transition-colors disabled:opacity-50"
                />
              </div>

              {/* Error / success messages */}
              <AnimatePresence mode="wait">
                {status === 'error' && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-red-400 text-sm text-center"
                  >
                    {errorMsg}
                  </motion.div>
                )}
                {status === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-emerald-400 text-sm text-center flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Login successful
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success' || !username || !password}
                className="w-full bg-white text-black rounded-full py-3 text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {status === 'success' ? 'Welcome' : 'Sign in'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
