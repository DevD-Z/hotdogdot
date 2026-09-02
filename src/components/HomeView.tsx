import React from 'react';
import { Track } from '../types/music';
import { ArrowRight, Clock3, Disc3, FolderOpen, Play, Radio, Sparkles } from 'lucide-react';

interface HomeViewProps {
  onPlayTrack: (track: Track) => void;
  onSearchQuery: (query: string) => void;
  recentlyPlayed: Track[];
  onOpenLocalFiles?: () => void;
}

const stations = [
  { title: 'เพลงไทยวันนี้', caption: 'เพลงฮิตที่กำลังมาแรง', query: 'เพลงไทยฮิต 2026', tone: 'station-violet' },
  { title: 'K-Pop Now', caption: 'ไอดอลและซิงเกิลใหม่', query: 'kpop top hits', tone: 'station-rose' },
  { title: 'Focus Flow', caption: 'Lofi สำหรับวันสบาย ๆ', query: 'lofi hip hop beats to relax', tone: 'station-blue' },
  { title: 'Global 50', caption: 'เพลงยอดนิยมทั่วโลก', query: 'global top hits 2026', tone: 'station-amber' },
];

export const HomeView: React.FC<HomeViewProps> = ({ onPlayTrack, onSearchQuery, recentlyPlayed, onOpenLocalFiles }) => (
  <div className="mobile-home page-container">
    <section className="home-greeting">
      <div>
        <p className="eyebrow">GOOD MUSIC, ALL DAY</p>
        <h1>ฟังอะไรดีวันนี้?</h1>
        <p>เลือกเพลงที่ชอบ แล้วให้ Auto Mix ดูแลเพลงถัดไป</p>
      </div>
      <button className="avatar-action" onClick={onOpenLocalFiles} aria-label="เปิดเพลงในเครื่อง"><FolderOpen size={20} /></button>
    </section>

    <section className="daily-mix-card">
      <div className="daily-mix-copy">
        <span className="mix-pill"><Sparkles size={14} /> MADE FOR YOU</span>
        <h2>Daily Discovery</h2>
        <p>เพลงใหม่ เพลงคุ้นเคย และบรรยากาศที่เข้ากับคุณ</p>
        <button onClick={() => onSearchQuery('เพลงใหม่มาแรง mix')}><Play size={18} fill="currentColor" /> เริ่มฟัง</button>
      </div>
      <div className="daily-mix-art"><img src="/app-logo.png" alt="Daily Discovery" /><span className="vinyl-ring" /></div>
    </section>

    <section className="content-section">
      <div className="section-heading"><div><Radio size={19} /><h2>เลือกตามอารมณ์</h2></div><span>แตะเพื่อค้นหา</span></div>
      <div className="station-rail">
        {stations.map((station) => (
          <button key={station.title} className={`station-card ${station.tone}`} onClick={() => onSearchQuery(station.query)}>
            <span className="station-icon"><Disc3 size={22} /></span><strong>{station.title}</strong><small>{station.caption}</small><ArrowRight className="station-arrow" size={18} />
          </button>
        ))}
      </div>
    </section>

    <section className="content-section">
      <div className="section-heading"><div><Clock3 size={19} /><h2>ฟังล่าสุด</h2></div><span>{recentlyPlayed.length ? `${recentlyPlayed.length} เพลง` : 'ยังไม่มีเพลง'}</span></div>
      {recentlyPlayed.length ? (
        <div className="recent-rail">
          {recentlyPlayed.slice(0, 10).map((track) => (
            <button key={track.identifier} className="recent-card" onClick={() => onPlayTrack(track)}>
              <span className="recent-art"><img src={track.artworkUrl || '/app-logo.png'} alt="" /><i><Play size={17} fill="currentColor" /></i></span>
              <strong>{track.title}</strong><small>{track.author}</small>
            </button>
          ))}
        </div>
      ) : (
        <button className="empty-library" onClick={() => onSearchQuery('เพลงใหม่มาแรง')}>
          <span><Disc3 size={26} /></span><div><strong>เริ่มสร้างประวัติการฟัง</strong><small>ค้นหาและเปิดเพลงแรกของคุณ</small></div><ArrowRight size={20} />
        </button>
      )}
    </section>
  </div>
);
