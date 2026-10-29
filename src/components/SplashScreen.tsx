import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { getStoredLavalinkServers } from '../services/lavalinkPresets';
import { LavalinkServerPreset } from '../types/music';
import { customFetch } from '../services/http';
import { logger } from '../services/logger';
import { getLavalinkBaseUrl } from '../services/lavalinkUrl';

interface SplashScreenProps {
  onComplete: (bestServer?: LavalinkServerPreset) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    logger.addLog('info', 'System', 'Startup sequence initiated...');
    let completed = false;

    const finish = (server?: LavalinkServerPreset) => {
      if (completed) return;
      completed = true;
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete(server);
      }, 500);
    };

    // Hard fallback timeout: splash NEVER blocks for more than 1.5 seconds
    const fallbackTimer = setTimeout(() => {
      const servers = getStoredLavalinkServers();
      finish(servers[0]);
    }, 1500);

    const runStartupChecks = async () => {
      try {
        const serversToTest = getStoredLavalinkServers();
        if (serversToTest.length === 0) {
          finish();
          return;
        }

        const quickCheck = serversToTest.map(async (server) => {
          const url = `${getLavalinkBaseUrl(server)}/version`;
          const start = Date.now();
          try {
            const res = await customFetch(url, {
              headers: { 'Authorization': server.password },
            });
            const latency = Date.now() - start;
            return { server, latency: res.ok ? latency : null, isOnline: res.ok };
          } catch {
            return { server, latency: null, isOnline: false };
          }
        });

        // Wait max 800ms for quick version ping
        const results = await Promise.race([
          Promise.all(quickCheck),
          new Promise<Array<{ server: LavalinkServerPreset; latency: number | null; isOnline: boolean }>>(r =>
            setTimeout(() => r([]), 800)
          ),
        ]);

        const onlineServers = results.filter(r => r.isOnline && r.latency !== null).sort((a, b) => (a.latency || 9999) - (b.latency || 9999));
        const chosen = onlineServers.length > 0 ? onlineServers[0].server : serversToTest[0];
        
        clearTimeout(fallbackTimer);
        finish(chosen);
      } catch {
        clearTimeout(fallbackTimer);
        const servers = getStoredLavalinkServers();
        finish(servers[0]);
      }
    };

    runStartupChecks();

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl text-white flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-all duration-700 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-950/40 via-slate-950 to-slate-950 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        {/* App Icon */}
        <div className="relative">
          <img
            src="/znight.png"
            alt="hotdogdot logo"
            className="w-24 h-24 rounded-3xl object-cover shadow-2xl shadow-sky-500/40 border-2 border-sky-500/30"
          />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-4 border-slate-950 flex items-center justify-center shadow-lg">
            <Sparkles className="w-3 h-3 text-sky-600" />
          </span>
        </div>

        {/* Title & Version */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            hotdogdot
          </h1>
          <p className="text-xs text-sky-400 font-mono tracking-wider font-semibold">
            v0.1.0
          </p>
        </div>

        {/* Minimal Loading Indicator */}
        <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 font-medium animate-pulse">
          <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
          <span>กำลังเริ่มต้นแอป...</span>
        </div>
      </div>
    </div>
  );
};
