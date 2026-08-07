// scripts/crawl.mjs
//
// Periodic crawler for the Hong-DB trending search feature.
//
// What it does
// ------------
// Every run (triggered by .github/workflows/crawl.yml on cron + manual dispatch)
// fetches the current hot list from six sources, normalises each to a uniform
// `{ title, url, hot?, desc? }` shape, and writes one JSON file per source to:
//
//     data/<key>/YYYY-MM-DD.json
//
// Plus an index file at data/latest.json that records per-source status and
// the last successful run timestamp. The frontend fetches the daily files via
// jsDelivr (`https://cdn.jsdelivr.net/gh/henryxp/hong-db@main/data/...`).
//
// Notes
// -----
// - The Toutiao endpoint returns an HTML page with the JSON object embedded
//   directly (no script tag wrapper, no `window.__INITIAL_STATE__`), so we
//   find the first `{"data":[...` substring and walk braces to extract it.
// - Zhihu's public hot list API only contains question-type items; the video
//   endpoint requires authentication. The `zhihu-video` source therefore
//   filters the same response for video-related titles as a best-effort
//   approximation. Swap in a real endpoint here when one is available.
// - Each source runs in its own try/catch; one failure does not block others.
// - All sources are fetched concurrently.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

// ---------- helpers ---------------------------------------------------------

function ymd(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function nowIso() {
  return new Date().toISOString()
}

async function fetchJson(url, extraHeaders = {}) {
  const res = await fetch(url, { headers: { ...BROWSER_HEADERS, ...extraHeaders } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.json()
}

async function fetchText(url, extraHeaders = {}) {
  const res = await fetch(url, { headers: { ...BROWSER_HEADERS, ...extraHeaders } })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  return res.text()
}

/** Normalise a Zhihu `https://api.zhihu.com/questions/{id}` link to the
 *  user-facing `https://www.zhihu.com/question/{id}` form. */
function publicZhihuUrl(apiUrl, id) {
  if (apiUrl && apiUrl.startsWith('http')) {
    return apiUrl.replace('api.zhihu.com/questions/', 'www.zhihu.com/question/')
  }
  if (id) return `https://www.zhihu.com/question/${id}`
  return ''
}

// ---------- source: 微博热搜 -------------------------------------------------

async function crawlWeibo() {
  const data = await fetchJson('https://weibo.com/ajax/side/hotSearch', {
    Referer: 'https://weibo.com/',
  })
  const items = data?.data?.realtime ?? []
  return items.map((it) => ({
    title: (it.word || '').replace(/^#/, '').replace(/#$/, ''),
    url:
      it.url ||
      `https://s.weibo.com/weibo?q=${encodeURIComponent((it.word || '').replace(/^#|#$/g, ''))}`,
    hot: typeof it.num === 'number' ? it.num : undefined,
    desc: it.label_name || it.icon_desc || '',
  }))
}

// ---------- source: 知乎 (search / questions / video) ------------------------

const ZHIHU_HOT_URL =
  'https://api.zhihu.com/topstory/hot-lists/total?limit=50'

async function fetchZhihuHot() {
  return fetchJson(ZHIHU_HOT_URL, { Referer: 'https://www.zhihu.com/' })
}

function zhihuItemToRecord(item) {
  const t = item.target || {}
  return {
    title: t.title || t.title_area?.text || '',
    url: publicZhihuUrl(t.url, t.id),
    hot: item.detail_text || '',
    desc: t.excerpt || '',
  }
}

async function crawlZhihuSearch() {
  const data = await fetchZhihuHot()
  return (data?.data ?? []).map(zhihuItemToRecord)
}

async function crawlZhihuQuestions() {
  const data = await fetchZhihuHot()
  // The public hot list is question-only, so this is effectively the same set
  // filtered to exclude any non-question items that may appear later.
  return (data?.data ?? [])
    .filter((it) => {
      const t = it.target || {}
      return t.type === 'question' || !!t.question
    })
    .map(zhihuItemToRecord)
}

async function crawlZhihuVideo() {
  // Zhihu's public video endpoints require auth. Fall back to filtering the
  // public hot list for video-ish titles. To replace with a real endpoint,
  // swap this function body — the rest of the pipeline is unchanged.
  const data = await fetchZhihuHot()
  const VIDEO_KEYWORDS = /视频|vlog|短片|动画|剧透|解说|开箱|实拍/i
  const matched = (data?.data ?? []).filter((it) => {
    const title = (it.target?.title || it.target?.title_area?.text || '') + ' ' + (it.target?.excerpt || '')
    return VIDEO_KEYWORDS.test(title)
  })
  if (matched.length > 0) return matched.map(zhihuItemToRecord)
  // No video keywords at all today; surface the same top items so the
  // dropdown still has something to show.
  return (data?.data ?? []).slice(0, 20).map(zhihuItemToRecord)
}

// ---------- source: 今日头条热搜 --------------------------------------------

async function crawlToutiao() {
  const html = await fetchText(
    'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc',
    { Referer: 'https://www.toutiao.com/' },
  )
  // The page embeds the JSON object directly without a script tag wrapper.
  // Locate the opening `{"data":[` and brace-walk to its end.
  const marker = '"data":[{"'
  const i = html.indexOf(marker)
  if (i < 0) throw new Error('toutiao: embedded JSON not found')
  const start = i - 1 // the `{` before "data"
  let depth = 0
  let end = -1
  for (let j = start; j < html.length; j++) {
    const c = html[j]
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        end = j + 1
        break
      }
    }
  }
  if (end < 0) throw new Error('toutiao: brace walk failed')
  const data = JSON.parse(html.slice(start, end))
  const items = data?.data ?? []
  return items.map((it) => ({
    title: it.Title || it.title || it.QueryWord || '',
    url: it.Url || it.url || '',
    hot: it.HotValue ? Number(it.HotValue) : undefined,
    desc: it.LabelDesc || it.Label || '',
  }))
}

// ---------- source: B站热门 -------------------------------------------------

async function crawlBilibili() {
  const data = await fetchJson(
    'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all',
    { Referer: 'https://www.bilibili.com/' },
  )
  if (data?.code !== 0) throw new Error(`bilibili: code=${data?.code} ${data?.message || ''}`)
  const items = data?.data?.list ?? []
  return items.map((it) => ({
    title: it.title || '',
    url: it.short_link || (it.bvid ? `https://www.bilibili.com/video/${it.bvid}` : ''),
    hot: typeof it.stat?.view === 'number' ? it.stat.view : undefined,
    desc: it.tname || '',
  }))
}

// ---------- source registry --------------------------------------------------

const SOURCES = [
  { key: 'weibo-search', label: '微博热搜', crawl: crawlWeibo },
  { key: 'zhihu-search', label: '知乎热搜榜', crawl: crawlZhihuSearch },
  { key: 'zhihu-questions', label: '知乎热门话题', crawl: crawlZhihuQuestions },
  { key: 'zhihu-video', label: '知乎热门视频', crawl: crawlZhihuVideo },
  { key: 'toutiao-search', label: '今日头条热搜', crawl: crawlToutiao },
  { key: 'bilibili', label: 'B站热门', crawl: crawlBilibili },
]

// ---------- main ------------------------------------------------------------

async function main() {
  const date = ymd()
  const updatedAt = nowIso()
  await fs.mkdir(DATA_DIR, { recursive: true })

  const latest = { updatedAt, date, sources: {} }
  const tasks = SOURCES.map(async (src) => {
    const start = Date.now()
    try {
      const items = await src.crawl()
      if (!Array.isArray(items)) throw new Error('normaliser did not return an array')
      const dir = path.join(DATA_DIR, src.key)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(path.join(dir, `${date}.json`), JSON.stringify(items, null, 2))
      latest.sources[src.key] = {
        ok: true,
        count: items.length,
        label: src.label,
        ms: Date.now() - start,
      }
      console.log(`✓ ${src.key} ${items.length} items (${Date.now() - start}ms)`)
    } catch (e) {
      latest.sources[src.key] = {
        ok: false,
        error: e?.message || String(e),
        label: src.label,
        ms: Date.now() - start,
      }
      console.error(`✗ ${src.key}: ${e?.message || e}`)
    }
  })
  await Promise.all(tasks)

  await fs.writeFile(path.join(DATA_DIR, 'latest.json'), JSON.stringify(latest, null, 2))
  const okCount = Object.values(latest.sources).filter((s) => s.ok).length
  console.log(`done -> ${date}, ${okCount}/${SOURCES.length} sources ok`)
}

main().catch((e) => {
  console.error('crawl failed:', e)
  process.exit(1)
})
