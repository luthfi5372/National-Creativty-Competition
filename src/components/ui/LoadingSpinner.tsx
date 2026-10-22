import React from "react";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "indigo" | "white" | "slate" | "emerald";
  className?: string;
}

export function Spinner({ size = "md", color = "indigo", className = "" }: SpinnerProps) {
  const sizeClasses = {
    xs: "w-3.5 h-3.5 border-2",
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4",
  }[size];

  const colorClasses = {
    indigo: "border-indigo-100 border-t-indigo-600 text-indigo-600",
    white: "border-white/30 border-t-white text-white",
    slate: "border-slate-200 border-t-slate-700 text-slate-700",
    emerald: "border-emerald-100 border-t-emerald-600 text-emerald-600",
  }[color];

  return (
    <div
      className={`rounded-full animate-spin shrink-0 ${sizeClasses} ${colorClasses} ${className}`}
      style={{ borderStyle: "solid" }}
      role="status"
      aria-label="Loading"
    />
  );
}

interface FullPageLoaderProps {
  message?: string;
  subMessage?: string;
}

export function FullPageLoader({
  message = "Memuat Halaman...",
  subMessage = "Menyiapkan data terbaik untuk Anda",
}: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-md transition-all duration-300">
      <div className="relative flex flex-col items-center justify-center p-8 text-center max-w-sm">
        {/* Glow backdrop */}
        <div className="absolute w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -top-10" />
        <div className="absolute w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none -bottom-10" />

        {/* Outer Ring & Spinner */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin shadow-lg shadow-indigo-100" />
          <div className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-90 flex items-center justify-center shadow-md shadow-indigo-200">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          </div>
        </div>

        {/* Typography */}
        <h3 className="text-base font-black text-slate-800 tracking-wide mb-1.5 animate-pulse">
          {message}
        </h3>
        {subMessage && (
          <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-[260px]">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
}

interface SectionLoaderProps {
  title?: string;
  subtitle?: string;
  minHeight?: string;
  className?: string;
}

export function SectionLoader({
  title = "Memuat Konten...",
  subtitle,
  minHeight = "min-h-[280px]",
  className = "",
}: SectionLoaderProps) {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center p-8 text-center ${minHeight} ${className}`}
    >
      <div className="relative flex items-center justify-center w-12 h-12 mb-3">
        <div className="w-10 h-10 rounded-full border-[3.5px] border-indigo-100 border-t-indigo-600 animate-spin" />
      </div>
      <p className="text-xs font-bold text-slate-700 tracking-wide mb-0.5">
        {title}
      </p>
      {subtitle && (
        <p className="text-[11px] text-slate-400 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default Spinner;
