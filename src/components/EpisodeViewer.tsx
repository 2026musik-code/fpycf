import React, { useEffect, useState, useRef } from "react";
import { ArrowLeft, Loader2, List } from "lucide-react";
import VideoPlayer from "./VideoPlayer";

interface EpisodeViewerProps {
  seriesId: string;
  seriesTitle: string;
  provider: string;
  apiKey: string;
  onClose: () => void;
}

export default function EpisodeViewer({ seriesId, seriesTitle, provider, apiKey, onClose }: EpisodeViewerProps) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEpisodes = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/proxy?action=detail&id=${seriesId}&provider=${provider}`, {
          headers: { "x-api-key": apiKey }
        });
        const data = await res.json();
        if (data && data.data) {
          let eps: any[] = [];
          const d = data.data;
          
          if (Array.isArray(d)) eps = d;
          else if (d.data && Array.isArray(d.data)) eps = d.data;
          else if (d.data && Array.isArray(d.data.chapters)) eps = d.data.chapters;
          else if (d.data && Array.isArray(d.data.episodes)) eps = d.data.episodes;
          else if (d.data && Array.isArray(d.data.list)) eps = d.data.list;
          else if (Array.isArray(d.chapters)) eps = d.chapters;
          else if (Array.isArray(d.episodes)) eps = d.episodes;
          else if (Array.isArray(d.list)) eps = d.list;

          if (eps.length > 0) {
            setChapters(eps);
          } else {
            throw new Error("No episodes found");
          }
        } else {
          throw new Error("Invalid format from server");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, [seriesId, apiKey]);

  useEffect(() => {
    if (chapters.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!isNaN(index)) {
              setActiveIndex(index);
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.6 }
    );

    const elements = document.querySelectorAll(".episode-container");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [chapters]);

  const scrollToEpisode = (index: number) => {
    const targetElement = document.querySelector(`.episode-container[data-index="${index}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveIndex(index);
    setShowEpisodeList(false);
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-black">
      {/* Navbar overlay mode to not take space from video */}
      <div className="absolute top-0 left-0 right-0 p-4 z-30 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-white hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium text-sm drop-shadow-md truncate max-w-[200px]">
            {seriesTitle}
          </span>
        </div>
        <button 
          onClick={() => setShowEpisodeList(!showEpisodeList)}
          className="p-2 -mr-2 text-white hover:bg-white/10 rounded-full transition-colors relative"
        >
          <List className="w-6 h-6" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950">
          <Loader2 className="w-8 h-8 animate-spin text-gold-500 mb-4" />
          <p className="text-zinc-400">Loading episodes...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="px-6 py-2 bg-zinc-800 text-white rounded-full">Go Back</button>
        </div>
      ) : (
        <>
          <div ref={containerRef} className="flex-1 w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory no-scrollbar relative">
            {chapters.map((chapter, idx) => (
              <div 
                key={chapter.chapter_id || chapter.id || chapter.index || idx} 
                data-index={idx}
                className="episode-container snap-start w-full h-[100dvh] shrink-0 relative bg-zinc-950"
              >
                {Math.abs(idx - activeIndex) <= 2 ? (
                  <VideoPlayer 
                    chapter={chapter} 
                    provider={provider}
                    isActive={idx === activeIndex} 
                    prefetch={Math.abs(idx - activeIndex) <= 1}
                    apiKey={apiKey}
                    onEnded={() => {
                      if (idx + 1 < chapters.length) {
                        scrollToEpisode(idx + 1);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-800" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Episode List Drawer */}
          {showEpisodeList && (
            <div className="absolute inset-x-0 bottom-0 top-20 bg-zinc-950/95 backdrop-blur-xl z-40 rounded-t-3xl border-t border-white/10 shadow-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-medium text-white">Episodes <span className="text-zinc-400 text-sm ml-1">({chapters.length})</span></h3>
                <button onClick={() => setShowEpisodeList(false)} className="text-gold-400 text-sm font-medium">Close</button>
              </div>
              <div className="grid grid-cols-5 gap-2 p-4 overflow-y-auto no-scrollbar">
                {chapters.map((ch, idx) => (
                  <button
                    key={ch.chapter_id || ch.id || ch.index || idx}
                    onClick={() => scrollToEpisode(idx)}
                    className={`aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                      idx === activeIndex 
                        ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/20' 
                        : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    {ch.episode || ch.episodeNo || ch.episodeNumber || ch.index || (idx + 1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
