import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  ChevronDown,
  Search,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react'

type PlatformKey =
  | 'toutiao'
  | 'zhihu-search'
  | 'zhihu-questions'
  | 'zhihu-video'
  | 'weibo'
  | 'bilibili'

const PLATFORMS: { key: PlatformKey; label: string; path: string }[] = [
  { key: 'toutiao', label: '今日头条热搜', path: 'toutiao-search' },
  { key: 'zhihu-search', label: '知乎热搜榜', path: 'zhihu-search' },
  { key: 'zhihu-questions', label: '知乎热门话题', path: 'zhihu-questions' },
  { key: 'zhihu-video', label: '知乎热门视频', path: 'zhihu-video' },
  { key: 'weibo', label: '微博热搜', path: 'weibo-search' },
  { key: 'bilibili', label: 'B站热搜', path: 'bilibili' },
]

// Snapshots are committed under data/<platform>/YYYY-MM-DD.json by
// .github/workflows/crawl.yml, then served via jsDelivr from this repo.
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/henryxp/hong-db@main'

// Each platform's JSON array uses a different field for the display title.
// Normalize to a single (title, link) pair so the table renders uniformly.
interface RawItem {
  url?: string
  realurl?: string
  title?: string
  word?: string
  query?: string
  display_query?: string
}

function pickTitle(item: RawItem): string {
  return item.title || item.word || item.display_query || item.query || '(无标题)'
}

function pickLink(item: RawItem): string {
  return item.realurl || item.url || '#'
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayYmd(): string {
  return toYmd(new Date())
}

interface TrendingSearchProps {
  isLoggedIn: boolean
  onRequestLogin: () => void
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

export default function TrendingSearch({ isLoggedIn, onRequestLogin }: TrendingSearchProps) {
  const [platform, setPlatform] = useState<PlatformKey>('toutiao')
  const [date, setDate] = useState<string>(todayYmd)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [resultsOpen, setResultsOpen] = useState(false)
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [items, setItems] = useState<RawItem[]>([])

  const dropdownRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  const platformLabel = useMemo(
    () => PLATFORMS.find((p) => p.key === platform)?.label || '',
    [platform],
  )
  const platformPath = useMemo(
    () => PLATFORMS.find((p) => p.key === platform)?.path || '',
    [platform],
  )

  // Close platform dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  // Escape closes the results dialog
  useEffect(() => {
    if (!resultsOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setResultsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [resultsOpen])

  // Lock body scroll while the results dialog is open
  useEffect(() => {
    if (!resultsOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [resultsOpen])

  const handleSearch = async () => {
    if (!isLoggedIn) {
      onRequestLogin()
      return
    }

    setResultsOpen(true)
    setFetchStatus('loading')
    setErrorMsg('')
    setItems([])

    // Try the picked date first; if it returns 404, walk back one day at a
    // time (up to a few days) so the user gets the freshest snapshot that
    // actually exists for the current run window.
    const candidates: string[] = [date]
    const start = new Date(date)
    for (let i = 1; i <= 3; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() - i)
      candidates.push(toYmd(d))
    }

    let lastError = ''
    for (const tryDate of candidates) {
      const url = `${CDN_BASE}/data/${platformPath}/${tryDate}.json`
      try {
        const res = await fetch(url)
        if (res.status === 404) {
          lastError = `${tryDate}: 无数据`
          continue
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`)
        }
        const data = await res.json()
        if (!Array.isArray(data)) {
          throw new Error('返回数据格式不是数组')
        }
        setItems(data as RawItem[])
        setFetchStatus('success')
        if (tryDate !== date) setDate(tryDate)
        return
      } catch (err) {
        lastError = err instanceof Error ? err.message : '获取数据失败'
      }
    }
    setErrorMsg(lastError || '获取数据失败')
    setFetchStatus('error')
  }

  const handleDateWrapperClick = () => {
    // Native date pickers open on the input itself; try showPicker first,
    // fall back to focusing which most browsers will also open the calendar.
    const el = dateInputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker()
        return
      } catch {
        // showPicker can throw if not triggered by a user gesture — fall through.
      }
    }
    el.focus()
  }

  return (
    <div className="max-w-xl w-full mt-10 flex flex-col gap-3">
      {/* Row 1: platform dropdown */}
      <div ref={dropdownRef} className="relative">
        <div
          className="liquid-glass rounded-full pl-6 pr-3 py-3 flex items-center gap-3 cursor-pointer"
          onClick={() => setDropdownOpen((v) => !v)}
        >
          <span className="flex-1 text-white text-sm truncate">{platformLabel}</span>
          <motion.span
            animate={{ rotate: dropdownOpen ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="text-white/60 flex-shrink-0"
          >
            <ChevronDown size={18} />
          </motion.span>
        </div>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              className="absolute z-30 left-0 right-0 mt-2 liquid-glass rounded-2xl p-1.5 max-h-64 overflow-auto bg-black/70 backdrop-blur-md"
            >
              {PLATFORMS.map((p) => {
                const active = p.key === platform
                return (
                  <li
                    key={p.key}
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setPlatform(p.key)
                      setDropdownOpen(false)
                    }}
                    className={`px-4 py-2.5 rounded-full text-sm cursor-pointer transition-colors ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {p.label}
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* Row 2: date + search button */}
      <div className="liquid-glass rounded-full pl-6 pr-2 py-2 flex items-center gap-3">
        <div
          className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
          onClick={handleDateWrapperClick}
        >
          <Calendar size={16} className="text-white/50 flex-shrink-0" />
          <span className="text-white text-sm tabular-nums">{date}</span>
          {/* Hidden native input — kept accessible and provides the calendar UI */}
          <input
            ref={dateInputRef}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={toYmd(new Date())}
            className="absolute opacity-0 pointer-events-none w-0 h-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          aria-label="Search trending data"
          className="bg-white rounded-full p-3 text-black flex-shrink-0 cursor-pointer hover:bg-white/90 transition-colors"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Results Dialog */}
      <AnimatePresence>
        {resultsOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setResultsOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="trending-results-title"
              className="relative w-full max-w-4xl max-h-[80vh] liquid-glass rounded-3xl p-6 flex flex-col"
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h2
                    id="trending-results-title"
                    className="text-2xl text-white tracking-tight truncate"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {platformLabel}
                  </h2>
                  <p className="text-white/50 text-xs mt-1">{date}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setResultsOpen(false)}
                  aria-label="Close results"
                  className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-auto rounded-2xl">
                {fetchStatus === 'loading' && (
                  <div className="flex items-center justify-center gap-2 py-16 text-white/70 text-sm">
                    <Loader2 size={18} className="animate-spin" />
                    正在获取数据…
                  </div>
                )}

                {fetchStatus === 'error' && (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <AlertCircle size={22} className="text-red-400" />
                    <p className="text-red-400 text-sm">获取失败：{errorMsg}</p>
                    <p className="text-white/40 text-xs">
                      数据每 6 小时由 GitHub Actions 抓取并提交,如刚部署请等待 workflow 首次跑完
                    </p>
                  </div>
                )}

                {fetchStatus === 'success' && items.length === 0 && (
                  <div className="flex items-center justify-center py-16 text-white/60 text-sm">
                    暂无数据
                  </div>
                )}

                {fetchStatus === 'success' && items.length > 0 && (
                  <table className="w-full text-sm text-white/90">
                    <thead className="sticky top-0 bg-black/60 backdrop-blur-sm">
                      <tr className="text-white/50 text-left">
                        <th className="font-medium px-4 py-3 w-14">#</th>
                        <th className="font-medium px-4 py-3">标题</th>
                        <th className="font-medium px-4 py-3 w-16 text-right">链接</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => {
                        const title = pickTitle(item)
                        const link = pickLink(item)
                        return (
                          <tr
                            key={`${link}-${i}`}
                            className="border-t border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-white/40 tabular-nums">{i + 1}</td>
                            <td className="px-4 py-2.5 break-words">{title}</td>
                            <td className="px-4 py-2.5 text-right">
                              {link !== '#' ? (
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-white/70 hover:text-white"
                                  aria-label={`Open ${title}`}
                                >
                                  <ExternalLink size={16} />
                                </a>
                              ) : (
                                <span className="text-white/30">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
