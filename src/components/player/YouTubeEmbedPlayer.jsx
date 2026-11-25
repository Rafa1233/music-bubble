import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function YouTubeEmbedPlayer({ videoId, title, externalUrl }) {
  if (!videoId) return null;

  return (
    <div className="w-full space-y-2">
      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black shadow-2xl">
        <iframe
          className="w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`}
          title={title || 'YouTube Official Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="flex items-center justify-between text-[11px] opacity-75 px-1">
        <span>Pemutar Resmi YouTube (hanya aktif saat layar terbuka)</span>
        {externalUrl && (
          <a
            href={externalUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            Buka di YouTube <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
