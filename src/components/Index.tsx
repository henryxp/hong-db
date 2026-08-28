import { useRef, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, Camera, Send, CheckCircle2 } from 'lucide-react'
import LoginDialog from './LoginDialog'
import TrendingSearch from './TrendingSearch'

const LOGIN_STORAGE_KEY = 'hong-db-logged-in'

// lucide-react 1.28.0 doesn't ship a Github icon, so we inline the standard
// GitHub mark here. The path is the well-known 24×24 viewBox mark.
function GithubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4'

function animateOpacity(
  el: HTMLVideoElement,
  from: number,
  to: number,
  duration: number,
  onDone?: () => void
) {
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    el.style.opacity = String(from + (to - from) * t)
    if (t < 1) {
      requestAnimationFrame(step)
    } else if (onDone) {
      onDone()
    }
  }
  requestAnimationFrame(step)
}

export default function Index() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fadingOut = useRef(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Restore login state from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem(LOGIN_STORAGE_KEY) === '1') setIsLoggedIn(true)
    } catch {
      // localStorage may be unavailable (private mode, etc.) — fail open as logged-out
    }
  }, [])

  const handleCanPlay = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.play()
    animateOpacity(vid, 0, 1, 500)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    if (!vid || fadingOut.current) return
    const remaining = vid.duration - vid.currentTime
    if (remaining <= 0.55) {
      fadingOut.current = true
      const currentOpacity = parseFloat(vid.style.opacity || '1')
      animateOpacity(vid, currentOpacity, 0, 500)
    }
  }, [])

  const handleEnded = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.style.opacity = '0'
    fadingOut.current = false
    setTimeout(() => {
      vid.currentTime = 0
      vid.play()
      animateOpacity(vid, 0, 1, 500)
    }, 100)
  }, [])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.style.opacity = '0'
  }, [])

  return (
    <section className="min-h-screen overflow-hidden relative flex flex-col bg-black">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        src={HERO_VIDEO_URL}
        muted
        autoPlay
        playsInline
        preload="auto"
        style={{ opacity: 0 }}
        onCanPlay={handleCanPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />

      {/* Navbar */}
      <nav className="relative z-20 px-6 pt-6">
        <div className="liquid-glass rounded-full max-w-5xl mx-auto px-6 py-3 flex items-center gap-2">
          {/* Left */}
          <div className="flex items-center gap-2">
            <img src="./logo_small.png" alt="Hong-DB logo" className="h-10 w-auto flex-shrink-0" />
            <span className="text-white font-semibold text-lg">Hong-DB</span>
            <div className="hidden md:flex items-center gap-8 ml-8">
              <a href="#" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                Features
              </a>
              <a href="#" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                Pricing
              </a>
              <a href="#" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                About
              </a>
            </div>
          </div>
          {/* Right */}
          <div className="flex items-center gap-4 ml-auto">
            <button className="text-white text-sm font-medium cursor-pointer">Sign Up</button>
            <button
              onClick={() => setLoginOpen(true)}
              className="liquid-glass rounded-full px-6 py-2 text-white text-sm font-medium cursor-pointer hover:bg-white/5 transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center -translate-y-[20%]">
        <h1
          className="text-7xl md:text-8xl lg:text-9xl text-white tracking-tight whitespace-nowrap"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Know it then <em className="italic">all</em>.
        </h1>

        {/* Trending Search */}
        <TrendingSearch isLoggedIn={isLoggedIn} onRequestLogin={() => setLoginOpen(true)} />

        {/* Subtitle */}
        <p className="text-white text-sm leading-relaxed px-4 mt-5 max-w-lg">
          Stay updated with the latest news and insights. Subscribe to our newsletter today and never
          miss out on exciting updates.
        </p>

        {/* Manifesto Button */}
        <button className="liquid-glass rounded-full px-8 py-3 text-white text-sm font-medium hover:bg-white/5 transition-colors mt-6 cursor-pointer">
          Manifesto
        </button>
      </div>

      {/* Social Icons Footer */}
      <div className="relative z-10 flex justify-center gap-4 pb-12">
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
          <Camera size={20} />
        </button>
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
          <Send size={20} />
        </button>
        <button className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
          <Globe size={20} />
        </button>
        <a
          href="https://github.com/henryxp/hong-db/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub repository"
          className="liquid-glass rounded-full p-4 text-white/80 hover:text-white hover:bg-white/5 transition-all cursor-pointer inline-flex items-center justify-center"
        >
          <GithubIcon size={20} />
        </a>
      </div>

      {/* Login Dialog */}
      <LoginDialog
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => {
          setIsLoggedIn(true)
          try {
            localStorage.setItem(LOGIN_STORAGE_KEY, '1')
          } catch {
            // ignore — non-essential persistence
          }
          setToastVisible(true)
          setTimeout(() => setToastVisible(false), 2400)
        }}
      />

      {/* Success Toast */}
      <AnimatePresence>
        {toastVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 liquid-glass rounded-full px-5 py-3 flex items-center gap-2 text-white text-sm"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            Logged in successfully
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
