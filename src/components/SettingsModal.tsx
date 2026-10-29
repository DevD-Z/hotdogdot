import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Moon, Sun, Settings, Radio, ShieldCheck, Palette, Pipette, Check } from 'lucide-react';
import { LavalinkConfig } from '../types/music';
import { PRESET_ACCENT_COLORS, ThemeMode } from '../services/theme';

interface SettingsModalProps {
  config: LavalinkConfig;
  onSave?: (config: LavalinkConfig) => void;
  onClose: () => void;
  onTest: () => Promise<{ success: boolean; message: string }>;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  config,
  onClose,
  onTest,
  theme,
  onThemeChange,
  accentColor,
  onAccentColorChange,
}) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [customHex, setCustomHex] = useState(accentColor);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await onTest();
    setTestResult(res);
    setTesting(false);
  };

  const handleCustomHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('#') && val.length > 0) {
      val = '#' + val;
    }
    setCustomHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onAccentColorChange(val);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 animate-fade-in">
      <div className="modal-panel bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">ตั้งค่า (Settings)</h3>
              <p className="text-xs text-slate-400">ปรับแต่งธีม สีสัน และการทำงานของแอป</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Appearance: Dark / Light Mode */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">โหมดการแสดงผล (Theme Mode)</span>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="เลือกโหมดมืดหรือสว่าง">
            <button
              type="button"
              aria-pressed={theme === 'dark'}
              onClick={() => onThemeChange('dark')}
              className={`touch-target rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
                theme === 'dark'
                  ? 'border-sky-500 bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20 shadow-md shadow-sky-500/10'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>🌙 โหมดมืด (Dark)</span>
            </button>

            <button
              type="button"
              aria-pressed={theme === 'light'}
              onClick={() => onThemeChange('light')}
              className={`touch-target rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition ${
                theme === 'light'
                  ? 'border-sky-500 bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20 shadow-md shadow-sky-500/10'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>☀️ โหมดสว่าง (Light)</span>
            </button>
          </div>
        </div>

        {/* Accent Color Customization */}
        <div className="space-y-3 pt-1 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              <span>ปรับธีมสีตามใจชอบ (Accent Color)</span>
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
              <span>{accentColor.toUpperCase()}</span>
            </div>
          </div>

          {/* Preset Color Swatches */}
          <div className="grid grid-cols-5 gap-2">
            {PRESET_ACCENT_COLORS.map((preset) => {
              const isSelected = accentColor.toLowerCase() === preset.color.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.name}
                  onClick={() => {
                    onAccentColorChange(preset.color);
                    setCustomHex(preset.color);
                  }}
                  className={`h-10 rounded-xl flex items-center justify-center transition relative overflow-hidden active:scale-95 ${
                    isSelected
                      ? 'ring-2 ring-white scale-105 shadow-lg'
                      : 'opacity-85 hover:opacity-100 hover:scale-102 border border-black/20'
                  }`}
                  style={{ backgroundColor: preset.color }}
                >
                  {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                </button>
              );
            })}
          </div>

          {/* Custom Color Picker & Hex Input */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-700 shadow-inner flex items-center justify-center cursor-pointer group">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => {
                  onAccentColorChange(e.target.value);
                  setCustomHex(e.target.value);
                }}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                title="เลือกเฉดสีตามใจชอบ"
              />
              <div
                className="w-full h-full flex items-center justify-center transition group-hover:scale-110"
                style={{ backgroundColor: accentColor }}
              >
                <Pipette className="w-4 h-4 text-white drop-shadow" />
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 font-medium mb-0.5">
                เลือกสีเอง (Custom Color / Hex Code)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customHex}
                  onChange={handleCustomHexChange}
                  placeholder="#0EA5E9"
                  maxLength={7}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 uppercase focus:border-sky-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Server Status (Automated Node) */}
        <div className="space-y-3 pt-1 border-t border-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>Lavalink Server</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              <ShieldCheck className="w-3 h-3" />
              <span>คลาวด์เซิร์ฟเวอร์หลัก</span>
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-bold text-xs text-white">{config.name || 'hotdogdot Lavalink'}</p>
              <span className="text-[10px] text-sky-400 font-medium">Render Cloud</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              https://{config.host || 'hotdogdot-lavalink.onrender.com'}
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-sky-400' : ''}`} />
            <span>{testing ? 'กำลังทดสอบสัญญาณ...' : 'ทดสอบการเชื่อมต่อเซิร์ฟเวอร์'}</span>
          </button>
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? 'เชื่อมต่อสำเร็จ!' : 'เชื่อมต่อไม่สำเร็จ'}</p>
              <p className="mt-0.5 opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition active:scale-95"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
