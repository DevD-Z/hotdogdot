import React from 'react';
import { Activity, Headphones, Radio, ShieldCheck, Smartphone } from 'lucide-react';

const features = [
  { icon: Radio, title: 'Lavalink v4', text: 'Fast search and reliable audio playback through your configured node.' },
  { icon: Smartphone, title: 'Desktop, Android & PWA', text: 'Responsive controls, safe-area support, and an installable web experience.' },
  { icon: Activity, title: 'Discord Rich Presence', text: 'Native desktop activity updates with graceful fallback when Discord is unavailable.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Deployment credentials remain outside the frontend bundle and source control.' },
];

export const AboutView: React.FC = () => (
  <div className="page-container max-w-5xl mx-auto animate-page-enter">
    <section className="surface-card relative overflow-hidden p-5 sm:p-8">
      <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7 text-center sm:text-left">
        <img src="/app-logo.png" alt="hotdogdot logo" className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] object-cover ring-1 ring-sky-400/30 shadow-2xl shadow-sky-500/15" />
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20"><Headphones className="w-3.5 h-3.5" /> Music player</span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">hotdogdot</h1>
          <p className="mt-2 max-w-xl text-sm sm:text-base leading-relaxed text-slate-400">A clean, focused music experience for desktop, web, and mobile. Built with React, Tauri, and Lavalink.</p>
          <p className="mt-4 text-xs text-slate-500">Created and maintained by hotdogdot · Version 0.1.0</p>
        </div>
      </div>
    </section>

    <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {features.map(({ icon: Icon, title, text }) => (
        <article key={title} className="surface-card p-5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
          <h2 className="mt-4 font-bold text-white">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{text}</p>
        </article>
      ))}
    </section>
  </div>
);
