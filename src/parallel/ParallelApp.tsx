import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { profileData } from '../constants/profileData';
import { translations } from '../constants/translations';
import { Language } from '../types/language';
import './Parallel.css';

/* ------------------------------------------------------------------ */
/* Parallel — a totally independent Gen-Z remix of allenbenny.me       */
/* Zero new deps: no framer-motion, no chart.js. CSS does the work.    */
/* ------------------------------------------------------------------ */

type MonthlyData = { month: string; count: number };
const CACHE_KEY = 'parallel-contribs-v1';
const CACHE_MS = 60 * 60 * 1000;

/* Live-preview sources (mirrors the og-site gallery) */
const LIVE_PREVIEWS: Record<string, { url: string; label: string }> = {
  Roamero: { url: 'https://officiallygod.github.io/Roamero/#/map', label: 'LIVE' },
  Deutschway: { url: 'https://officiallygod.github.io/Deutschway/', label: 'LIVE' },
  Recalla: { url: 'https://officiallygod.github.io/Recalla/', label: 'LIVE' },
  CORONAI: {
    url: 'https://www.youtube.com/embed/p3iMV9qt6Qs?autoplay=1&mute=1&controls=0&loop=1&playlist=p3iMV9qt6Qs',
    label: '▶ DEMO',
  },
};

/* Non-embeddable → splashy sticker fallback */
const FALLBACK_STICKERS: Record<string, string> = {
  'Smart Farming IoT System': '📄 RESEARCH',
  'Automating Mouse Movements': '🖱 RESEARCH',
  'Flutter Loading Kit': '📱 PUB.DEV',
};

const ParallelApp: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [dark, setDark] = useState(true);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [techCat, setTechCat] = useState<string>('Language');
  const [contribs, setContribs] = useState<{ data: MonthlyData[]; total: number } | null>(null);
  const [contribState, setContribState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [poked, setPoked] = useState<string | null>(null);
  const [loadedPreviews, setLoadedPreviews] = useState<Set<string>>(new Set());

  /* poke → short fake-load spin, then mount the iframe */
  useEffect(() => {
    if (!poked) return;
    const id = setTimeout(() => {
      setLoadedPreviews(prev => new Set(prev).add(poked));
      setPoked(null);
    }, 650);
    return () => clearTimeout(id);
  }, [poked]);

  const p = profileData[lang];
  const t = translations[lang];

  useEffect(() => {
    document.documentElement.setAttribute('data-parallel-theme', dark ? 'dark' : 'light');
    document.documentElement.lang = lang;
  }, [dark, lang]);

  /* ---- GitHub contributions (same API + cache strategy as main) ---- */
  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (Date.now() - c.timestamp < CACHE_MS) {
            if (!dead) { setContribs({ data: c.data, total: c.total }); setContribState('ok'); }
            return;
          }
        }
        const res = await fetch('https://github-contributions-api.jogruber.de/v4/officiallygod');
        if (!res.ok) throw new Error('fail');
        const json = await res.json();
        const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 3);
        const monthly: Record<string, number> = {};
        let total = 0;
        for (const d of json.contributions ?? []) {
          const date = new Date(d.date);
          if (date >= cutoff) {
            const k = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthly[k] = (monthly[k] || 0) + d.count;
            total += d.count;
          }
        }
        const data = Object.entries(monthly).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
        if (dead) return;
        setContribs({ data, total });
        setContribState('ok');
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data, total, timestamp: Date.now() })); } catch { /* ignore */ }
      } catch {
        if (!dead) setContribState('error');
      }
    };
    load();
    return () => { dead = true; };
  }, []);

  const maxCount = useMemo(() => Math.max(1, ...(contribs?.data.map(d => d.count) ?? [1])), [contribs]);

  const techCats = useMemo(() => Array.from(new Set(p.technologies.map(x => x.category || 'Other'))), [p]);
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const resumePath = lang === 'en' ? '/documents/resume-en.pdf' : '/documents/resume.pdf';

  return (
    <div className={`pz-root ${dark ? 'pz-dark' : 'pz-light'}`}>
      {/* paint splashes */}
      <div className="pz-splash pz-sp1" aria-hidden="true" />
      <div className="pz-splash pz-sp2" aria-hidden="true" />
      <div className="pz-splash pz-sp3" aria-hidden="true" />
      <div className="pz-grain" aria-hidden="true" />

      {/* floating controls */}
      <div className="pz-controls">
        <a className="pz-pill" href="#/game" aria-label="Play Jeep Drift" style={{ textDecoration: 'none' }}>🎮</a>
        <button className="pz-pill" onClick={() => setLang(l => (l === 'en' ? 'de' : 'en'))} aria-label="Language">
          {lang === 'en' ? '🇬🇧 EN' : '🇩🇪 DE'}
        </button>
        <button className="pz-pill" onClick={() => setDark(d => !d)} aria-label="Theme">
          {dark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>

      {/* ============ HERO ============ */}
      <header className="pz-hero">
        <div className="pz-sticker pz-st1">✦ {t.hero.chip1}</div>
        <div className="pz-sticker pz-st2">{t.hero.chip2}</div>
        <div className="pz-sticker pz-st3">{t.hero.chip3}</div>

        <p className="pz-kicker">{t.hero.availability}</p>
        <h1 className="pz-name">
          <span className="pz-name-word">ALLEN</span>{' '}
          <span className="pz-name-word pz-outline">BENNY</span>
        </h1>
        <p className="pz-title">{p.title}</p>
        <p className="pz-tagline">{p.tagline}</p>

        <div className="pz-cta-row">
          <button className="pz-btn pz-btn-main" onClick={() => scrollTo('pz-contact')}>{t.hero.ctaPrimary} ↯</button>
          <button className="pz-btn" onClick={() => scrollTo('pz-projects')}>{t.hero.ctaSecondary}</button>
          <button className="pz-btn" onClick={() => setResumeOpen(true)}>📄 {t.hero.ctaResume}</button>
        </div>

        <div className="pz-stats">
          <div className="pz-stat"><b>{t.hero.statExperienceValue}</b><span>{t.hero.statExperience}</span></div>
          <div className="pz-stat"><b>{t.hero.statProjectsValue}</b><span>{t.hero.statProjects}</span></div>
          <div className="pz-stat"><b>{t.hero.statFocusValue}</b><span>{t.hero.statFocus}</span></div>
        </div>

        <div className="pz-socials">
          {p.socialLinks.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="pz-social">{s.name} ↗</a>
          ))}
        </div>
      </header>

      {/* marquee */}
      <div className="pz-marquee" aria-hidden="true">
        <div className="pz-marquee-track">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i}>FULL STACK ✦ KIT KARLSRUHE ✦ REACT ✦ PHP ✦ TYPESCRIPT ✦ NODE.JS ✦ AI FEATURES ✦ OPEN SOURCE ✦ DSL INTEGRATION ✦ FLUTTER ✦ WORDPRESS ✦&nbsp;</span>
          ))}
        </div>
      </div>

      {/* ============ ABOUT ============ */}
      <section className="pz-section" id="pz-about">
        <h2 className="pz-h2"><span className="pz-h2-blob">{t.sections.about}</span></h2>
        <div className="pz-bio">
          {p.bio.map((b, i) => (
            <p key={i} className={`pz-bio-p ${i % 2 ? 'pz-tilt-r' : 'pz-tilt-l'}`}>{b}</p>
          ))}
        </div>
      </section>

      {/* ============ TECH STACK ============ */}
      <section className="pz-section" id="pz-tech">
        <h2 className="pz-h2"><span className="pz-h2-blob pz-blob-2">{t.sections.technologies}</span></h2>
        <div className="pz-cat-row">
          {techCats.map(c => (
            <button key={c} className={`pz-cat ${techCat === c ? 'pz-cat-on' : ''}`} onClick={() => setTechCat(c)}>{c}</button>
          ))}
        </div>
        <div className="pz-tech-grid">
          {p.technologies.filter(x => (x.category || 'Other') === techCat).map(x => (
            <span key={x.name} className="pz-tech">{x.name}</span>
          ))}
        </div>
      </section>

      {/* ============ EXPERIENCE & EDUCATION ============ */}
      <section className="pz-section" id="pz-exp">
        <h2 className="pz-h2"><span className="pz-h2-blob pz-blob-3">{t.sections.experience}</span></h2>
        <h3 className="pz-h3">{t.sections.education}</h3>
        <div className="pz-edu">
          {p.education.map(e => (
            <a key={e.institution} className="pz-card pz-edu-card" href={e.link} target="_blank" rel="noreferrer">
              <b>{e.degree}</b>
              <span className="pz-where">{e.institution} ↗</span>
              <span className="pz-when">{e.duration}</span>
            </a>
          ))}
        </div>
        <h3 className="pz-h3">{t.sections.professionalExperience}</h3>
        <ol className="pz-timeline">
          {p.experience.map(e => (
            <li key={e.company} className="pz-card">
              <div className="pz-card-top">
                <b>{e.role}</b>
                <span className="pz-when">{e.duration}</span>
              </div>
              {e.link
                ? <a className="pz-where" href={e.link} target="_blank" rel="noreferrer">{e.company} ↗</a>
                : <span className="pz-where">{e.company}</span>}
              <p>{e.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ============ PROJECTS / GALLERY ============ */}
      <section className="pz-section" id="pz-projects">
        <h2 className="pz-h2"><span className="pz-h2-blob pz-blob-4">{t.sections.projects}</span></h2>
        <div className="pz-proj-grid">
          {[...p.projects].reverse().map(pr => {
            const live = LIVE_PREVIEWS[pr.title];
            const sticker = FALLBACK_STICKERS[pr.title];
            return (
              <article key={pr.title} className="pz-proj">
                <div className="pz-browser">
                  <div className="pz-browser-bar" aria-hidden="true">
                    <i /><i /><i />
                    <span className="pz-browser-url">{live ? new URL(live.url, 'https://x').host : pr.title}</span>
                    {live && <span className="pz-live-dot">{live.label}</span>}
                  </div>
                  <div className="pz-browser-view">
                    {live ? (
                      loadedPreviews.has(pr.title) ? (
                        <iframe
                          src={live.url}
                          title={pr.title}
                          sandbox="allow-scripts allow-same-origin"
                          loading="lazy"
                          allow="autoplay; fullscreen"
                          className="pz-preview-frame"
                        />
                      ) : (
                        <button
                          className={`pz-poke ${poked === pr.title ? 'pz-poking' : ''}`}
                          onClick={() => setPoked(pr.title)}
                          aria-label={`${t.projects.viewProject} ${pr.title}`}
                        >
                          {poked === pr.title
                            ? <span className="pz-poke-spin">◌</span>
                            : <>⚡ {live.label}</>}
                          <small>{pr.title}</small>
                        </button>
                      )
                    ) : sticker ? (
                      <div className="pz-sticker-fallback">{sticker}</div>
                    ) : null}
                  </div>
                </div>
                <div className="pz-proj-head">
                  <h3>{pr.title}</h3>
                  <span className="pz-when">{pr.date}</span>
                </div>
                <p>{pr.description}</p>
                <div className="pz-proj-links">
                  {pr.link && <a href={pr.link} target="_blank" rel="noreferrer">{t.projects.viewProject}</a>}
                  {pr.githubLink && <a href={pr.githubLink} target="_blank" rel="noreferrer">GitHub ↗</a>}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============ CONTRIBUTIONS ============ */}
      <section className="pz-section" id="pz-contribs">
        <h2 className="pz-h2"><span className="pz-h2-blob pz-blob-5">{t.sections.contributions}</span></h2>
        <p className="pz-sub">{t.contributions.subtitle}</p>
        {contribState === 'loading' && <p className="pz-sub">{t.contributions.loading}</p>}
        {contribState === 'error' && <p className="pz-sub">{t.contributions.unable}</p>}
        {contribs && contribState === 'ok' && (
          <>
            <p className="pz-total"><b>{contribs.total.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US')}</b> {t.contributions.totalLabel}</p>
            <div className="pz-chart" role="img" aria-label={t.contributions.chartLabel}>
              {contribs.data.map(d => (
                <div key={d.month} className="pz-bar" style={{ height: `${Math.max(4, (d.count / maxCount) * 100)}%` }}
                  title={`${d.month}: ${d.count} ${t.contributions.tooltipLabel}`}>
                  <i />
                </div>
              ))}
            </div>
            <a className="pz-sub pz-link" href={p.githubUrlProfile} target="_blank" rel="noreferrer">{t.contributions.viewProfile} ↗</a>
          </>
        )}
      </section>

      {/* ============ CERTIFICATIONS ============ */}
      <section className="pz-section" id="pz-certs">
        <h2 className="pz-h2"><span className="pz-h2-blob pz-blob-6">{t.sections.certifications}</span></h2>
        <div className="pz-cert-grid">
          {p.certifications.map(c => (
            <a key={c.title} className="pz-cert" href={c.link} target="_blank" rel="noreferrer">
              <span className="pz-cert-badge">✓</span>
              <div>
                <b>{c.title}</b>
                <span>{c.issuer} · {c.date}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section className="pz-section pz-contact" id="pz-contact">
        <h2 className="pz-h2"><span className="pz-h2-blob pz-blob-1">{t.sections.contact}</span></h2>
        <p className="pz-contact-intro">{t.contact.intro}</p>
        <p className="pz-contact-intro pz-big">{t.contact.introEmphasis}</p>
        <div className="pz-contact-grid">
          <a className="pz-contact-card" href={`mailto:${p.contact.email}`}>✉ {p.contact.email}</a>
          <a className="pz-contact-card" href={`tel:${p.contact.phone.replace(/\s/g, '')}`}>☎ {p.contact.phone}</a>
          <span className="pz-contact-card">📍 {p.contact.location}</span>
        </div>
        <div className="pz-cta-row pz-center">
          <a className="pz-btn pz-btn-main" href={p.portfolioUrl} target="_blank" rel="noreferrer">{t.contact.viewPortfolio} ↗</a>
          <a className="pz-btn" href={p.personalSiteUrl} target="_blank" rel="noreferrer">{t.contact.personalSite} ↗</a>
          <a className="pz-btn" href={p.githubUrl} target="_blank" rel="noreferrer">{t.contact.visitGithub} ↗</a>
        </div>
        <p className="pz-sub">{t.contact.githubHighlightPrefix} · <a href={p.githubUrlProfile} target="_blank" rel="noreferrer" className="pz-link">{t.contact.githubHighlightLink}</a></p>
      </section>

      <footer className="pz-footer">
        <span>© {new Date().getFullYear()} Allen Benny — Karlsruhe, Germany</span>
        <span className="pz-fine">/parallel · the funky remix</span>
      </footer>

      {/* ============ RESUME MODAL ============ */}
      {resumeOpen && (
        <div className="pz-modal" role="dialog" aria-modal="true" onClick={() => setResumeOpen(false)}>
          <div className="pz-modal-box" onClick={e => e.stopPropagation()}>
            <div className="pz-modal-head">
              <h3>📄 {t.resume.modalTitle}</h3>
              <div className="pz-modal-actions">
                <a href={resumePath} target="_blank" rel="noreferrer" className="pz-btn pz-btn-sm">↗</a>
                <a href={resumePath} download className="pz-btn pz-btn-sm">⬇ {t.resume.download}</a>
                <button className="pz-btn pz-btn-sm" onClick={() => setResumeOpen(false)}>✕ {t.resume.close}</button>
              </div>
            </div>
            <iframe src={resumePath} title={t.resume.modalTitle} className="pz-modal-frame" />
          </div>
        </div>
      )}
    </div>
  );
};

export default ParallelApp;
