"use client";

import React, { useState } from 'react';
import { ExternalLink, Globe, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAK_V1_URL = process.env.NEXT_PUBLIC_MAK_V1_URL || '';

export const MakOSv1App = () => {
  const [url, setUrl] = useState(MAK_V1_URL);
  const [inputUrl, setInputUrl] = useState(MAK_V1_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUrl] = useState(!!MAK_V1_URL);

  const handleNavigate = () => {
    setUrl(inputUrl);
    setIsLoading(true);
  };

  return (
    <div className="flex flex-col h-full bg-bg-surface/20">
      {/* Browser Chrome */}
      <div className="flex items-center space-x-3 px-4 py-2 border-b border-gold/10 bg-white/5">
        <div className="flex items-center space-x-1">
          <button className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors disabled:opacity-30" disabled>
            <ChevronLeft size={14} />
          </button>
          <button className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors disabled:opacity-30" disabled>
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 500); }}
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary transition-colors"
          >
            <RefreshCw size={14} className={cn(isLoading && 'animate-spin')} />
          </button>
        </div>

        <div className="flex-1 flex items-center space-x-2 bg-white/5 border border-gold/10 rounded-lg px-3 py-1.5">
          <Globe size={12} className="text-text-secondary flex-shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            placeholder="Enter MAK OS v1 URL..."
            className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none placeholder:text-text-secondary/40 font-mono"
          />
        </div>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-white/10 text-text-secondary hover:text-gold transition-colors"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Content Area */}
      {hasUrl && url ? (
        <div className="flex-1 relative">
          <iframe
            src={url}
            className="w-full h-full border-0"
            onLoad={() => setIsLoading(false)}
            title="MAK OS v1"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
          {isLoading && (
            <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center space-y-6 p-8">
          <div className="w-20 h-20 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <span className="text-gold text-3xl font-display font-bold">v1</span>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-display font-semibold text-gold">MAK OS v1</h2>
            <p className="text-text-secondary max-w-sm">
              Your existing MAK OS v1 system. Enter the URL above to load it in this integrated view,
              or configure <code className="text-gold/80 text-xs bg-gold/10 px-1 py-0.5 rounded">NEXT_PUBLIC_MAK_V1_URL</code> in your environment.
            </p>
          </div>

          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-white/5 border border-gold/10 rounded-lg px-3 py-2 flex items-center space-x-2">
                <Globe size={14} className="text-text-secondary" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                  placeholder="https://your-mak-v1-url.com"
                  className="flex-1 bg-transparent text-sm text-text-primary focus:outline-none placeholder:text-text-secondary/40"
                />
              </div>
              <button
                onClick={handleNavigate}
                className="px-4 py-2 bg-gold text-bg-primary rounded-lg text-sm font-medium hover:bg-gold-light transition-colors"
              >
                Open
              </button>
            </div>
            <p className="text-[11px] text-text-secondary/50 text-center">
              Press Enter or click Open to load MAK OS v1 in this window
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
