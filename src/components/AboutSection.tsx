import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

export default function AboutSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      className="bg-black pt-32 md:pt-44 pb-10 md:pb-14 px-6 overflow-hidden relative"
    >
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />

      <div className="relative max-w-6xl mx-auto">
        {/* Label */}
        <motion.p
          className="text-white/40 text-sm tracking-widest uppercase mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          About Us
        </motion.p>

        {/* Heading */}
        <motion.h2
          className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.1] tracking-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Pioneering{' '}
          <em
            className="not-italic text-white/60"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}
          >
            ideas
          </em>{' '}
          for
          <br className="hidden md:block" />
          {' '}minds that{' '}
          <em
            className="not-italic text-white/60"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}
          >
            create
          </em>
          ,{' '}
          <em
            className="not-italic text-white/60"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}
          >
            build
          </em>
          , and{' '}
          <em
            className="not-italic text-white/60"
            style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}
          >
            inspire.
          </em>
        </motion.h2>
      </div>
    </section>
  )
}
