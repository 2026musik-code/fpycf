import React, { useRef, useEffect, useState } from "react";
import { Play, Volume2, VolumeX, Download, Loader2, MoreHorizontal, Subtitles } from "lucide-react";
import Hls from "hls.js";

interface VideoPlayerProps {
  chapter: any;
  isActive: boolean;
  provider: string;
  prefetch?: boolean;
  apiKey: string;
  onEnded?: () => void;
}

export default function VideoPlayer({ chapter, isActive, provider, prefetch = false, apiKey, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<any[]>([]);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hasFetchedStream, setHasFetchedStream] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStep, setDownloadStep] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [showUI, setShowUI] = useState(true);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const resetUITimer = () => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      // Only hide UI if video is playing
      if (videoRef.current && !videoRef.current.paused) {
        setShowUI(false);
      }
    }, 2000);
  };

  useEffect(() => {
    if (isActive) {
      resetUITimer();
    }
    return () => {
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [isActive, isPlaying]);

  const handleVideoTap = () => {
    if (!showUI) {
      resetUITimer();
    } else {
      togglePlay();
      resetUITimer();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newTime = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      resetUITimer();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    resetUITimer();
    if (!streamUrl || isDownloading) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStep('Fetching playlist...');
    
    try {
      const res = await fetch(streamUrl);
      const m3u8Text = await res.text();
      
      let playlistUrl = streamUrl;
      let mediaText = m3u8Text;
      
      if (m3u8Text.includes('.m3u8')) {
        const lines = m3u8Text.split('\n');
        const subM3u8Line = lines.find((l: string) => l.trim() && !l.startsWith('#') && l.includes('.m3u8'));
        if (subM3u8Line) {
          playlistUrl = new URL(subM3u8Line, streamUrl).toString();
          const mediaRes = await fetch(playlistUrl);
          mediaText = await mediaRes.text();
        }
      }

      const lines = mediaText.split('\n');
      const tsUrls = lines
        .filter((l: string) => l.trim() && !l.startsWith('#'))
        .map((l: string) => new URL(l, playlistUrl).toString());
      
      if (tsUrls.length === 0) {
        throw new Error("No video segments found.");
      }

      setDownloadStep('Downloading segments...');
      const segments: Uint8Array[] = [];
      for (let i = 0; i < tsUrls.length; i++) {
          setDownloadProgress(Math.round(((i) / tsUrls.length) * 100));
          const tsRes = await fetch(tsUrls[i]);
          if (!tsRes.ok) throw new Error(`Fetch segment ${i} failed`);
          const buffer = await tsRes.arrayBuffer();
          segments.push(new Uint8Array(buffer));
      }
      
      setDownloadProgress(100);
      setDownloadStep('Converting MP4...');
      
      const muxjs = (await import('mux.js')).default;
      const transmuxer = new muxjs.mp4.Transmuxer();
      
      let initSegment: Uint8Array | null = null;
      const mediaSegments: Uint8Array[] = [];
      
      transmuxer.on('data', (segment: any) => {
        if (!initSegment && segment.initSegment) {
          initSegment = segment.initSegment;
        }
        if (segment.data) {
          mediaSegments.push(segment.data);
        }
      });
      
      for (const segment of segments) {
         transmuxer.push(segment);
      }
      transmuxer.flush();

      // Ensure we have data
      if (!initSegment) throw new Error("Conversion failed to produce init segment.");

      const mp4SegmentsLength = mediaSegments.reduce((acc, m) => acc + m.length, 0);
      const totalLength = initSegment.length + mp4SegmentsLength;
      const mp4Data = new Uint8Array(totalLength);
      
      mp4Data.set(initSegment, 0);
      let offset = initSegment.length;
      for (const m of mediaSegments) {
        mp4Data.set(m, offset);
        offset += m.length;
      }
      
      const blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chapter.chapter_name || chapter.title || chapter.name || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed.");
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadStep('');
    }
  };

  useEffect(() => {
    if ((isActive || prefetch) && !streamUrl && !loading && !hasFetchedStream) {
      // Some providers have the URL inside the chapter object directly
      let directUrl = chapter.videoUrl || chapter.url || chapter.playUrl || chapter._h264 || chapter._h265;
      
      let subs = chapter.subtitles || [];

      if (directUrl) {
        if (provider === 'freereels') {
          directUrl = `/api/cors-proxy?url=${encodeURIComponent(directUrl)}`;
        }
        if (subs && Array.isArray(subs)) setSubtitles(subs);
        setStreamUrl(directUrl);
        setHasFetchedStream(true);
        return;
      }

      setLoading(true);
      setHasFetchedStream(true);
      const videoId = chapter.videoFakeId || chapter.id || chapter.index || chapter.shortPlayId || chapter.videoId || chapter.episode_id;
      
      if (!videoId) {
        console.error("No valid video ID found", chapter);
        setLoading(false);
        return;
      }
      fetch(`/api/proxy?action=stream&id=${encodeURIComponent(videoId)}&provider=${provider}`, {
        headers: { "x-api-key": apiKey }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.data) {
             const d = data.data;
             let url = typeof d === 'string' ? d : (d.url || d.playUrl || d.videoUrl);
             if (url) {
               if (provider === 'freereels') {
                 url = `/api/cors-proxy?url=${encodeURIComponent(url)}`;
               }
               if (typeof d !== 'string' && d.subtitles && Array.isArray(d.subtitles)) {
                 setSubtitles(d.subtitles);
               }
               setStreamUrl(url);
             }
             else console.error("Stream URL not found in API response for chapter:", chapter.chapter_name);
          } else {
             console.error("Invalid stream API response", data);
          }
        })
        .catch(err => console.error("Failed to load stream", err))
        .finally(() => setLoading(false));
    }
  }, [isActive, prefetch, streamUrl, chapter, loading, apiKey, hasFetchedStream, provider]);

  // HLS Setup and Play/Pause logic combined
  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;

    const video = videoRef.current;
    
    let isMounted = true;

    // Play function helper
    const attemptPlay = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (isMounted && isActive) setIsPlaying(true);
          })
          .catch((error) => {
            if (error.name !== "AbortError") {
              console.error("Video play error:", error);
            }
            if (isMounted) setIsPlaying(false);
          });
      } else {
        if (isMounted && isActive) setIsPlaying(true);
      }
    };

    if (isActive) {
      if (Hls.isSupported() && streamUrl.includes(".m3u8")) {
        const hls = new Hls({
          startLevel: -1,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hlsRef.current = hls;
        
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
           attemptPlay();
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        if (video.src !== streamUrl) {
          video.src = streamUrl;
        }
        attemptPlay();
      } else {
        if (video.src !== streamUrl) {
          video.src = streamUrl;
        }
        attemptPlay();
      }
    } else {
      setIsPlaying(false);
      video.pause();
    }

    return () => {
      isMounted = false;
      // Destroys HLS when tearing down the `isActive === true` effect,
      // which happens if unmounted or if `isActive` becomes `false`.
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isActive, streamUrl]);

  const togglePlay = () => {
    if (!videoRef.current || !streamUrl) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((error) => {
            if (error.name !== "AbortError") console.error("Video play error:", error);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <div className="relative w-full h-full bg-zinc-950 snap-start flex justify-center items-center overflow-hidden">
      
      {loading && !streamUrl && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60">
          <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-2" />
          <span className="text-white/60 text-sm font-medium">Loading {chapter.chapter_name || chapter.title || chapter.name || 'episode'}...</span>
        </div>
      )}

      {/* Video Element */}
      {streamUrl ? (
        <video
          ref={videoRef}
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain bg-black"
          onClick={handleVideoTap}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => {
            if (onEnded) onEnded();
          }}
          crossOrigin="anonymous"
        >
          {subtitles.map((sub, idx) => (
             <track 
               key={idx}
               kind="subtitles"
               src={`/api/subtitle-proxy?url=${encodeURIComponent(sub.url)}`}
               srcLang={sub.lang || sub.language || 'en'}
               label={sub.label || sub.name || `Sub ${idx+1}`}
               default={idx === 0}
             />
          ))}
        </video>
      ) : (
         <div className="w-full h-full bg-black/50" />
      )}

      {/* Play/Pause Overlay Indicator (shows momentarily) */}
      {!isPlaying && streamUrl && showUI && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-opacity duration-300">
            <Play className="w-8 h-8 ml-1" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Right Interaction Sidebar */}
      <div className={`absolute right-4 bottom-14 flex flex-col items-center gap-4 z-10 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        {subtitles.length > 0 && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              const video = videoRef.current;
              const newState = !subtitlesEnabled;
              setSubtitlesEnabled(newState);
              if (video && video.textTracks && video.textTracks.length > 0) {
                 for(let i=0; i<video.textTracks.length; i++){
                    video.textTracks[i].mode = (i === 0 && newState) ? 'showing' : 'hidden';
                 }
              }
            }}
            className={`p-3 bg-black/40 backdrop-blur-md rounded-full border transition-colors ${subtitlesEnabled ? 'border-gold-500 text-gold-500 hover:bg-black/60' : 'border-white/20 text-white hover:bg-black/60'}`}
          >
            <Subtitles className="w-5 h-5" />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); toggleMute(e); resetUITimer(); }}
          className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20 hover:bg-black/60 transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6 text-white" />
          ) : (
            <Volume2 className="w-6 h-6 text-white" />
          )}
        </button>
        <div className="flex flex-col items-center gap-1">
          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/20 hover:bg-black/60 transition-colors disabled:opacity-50 flex flex-col items-center justify-center min-w-[50px] min-h-[50px] overflow-hidden relative"
          >
            {isDownloading ? (
               <span className="text-white text-xs font-bold leading-none">{downloadProgress}%</span>
            ) : (
              <Download className="w-6 h-6 text-white" />
            )}
          </button>
          {isDownloading && downloadStep && (
             <span className="text-white/80 text-[10px] whitespace-nowrap drop-shadow-md text-center bg-black/40 px-2 py-1 rounded-full">{downloadStep}</span>
          )}
        </div>
      </div>

      {/* Bottom Info Layout */}
      <div className={`absolute bottom-4 left-4 right-20 z-10 flex flex-col gap-2 transition-opacity duration-300 ${showUI ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <h2 className="text-white font-bold drop-shadow-md text-sm sm:text-base line-clamp-1 pointer-events-none">
          {chapter.chapter_name || chapter.title || chapter.name || `Episode ${chapter.episode || chapter.episodeNo || chapter.episodeNumber || chapter.index || ''}`}
        </h2>
        
        {/* Progress Bar Container */}
        <div 
           className="flex items-center gap-2 mt-1"
           onClick={(e) => { e.stopPropagation(); resetUITimer(); }}
        >
          <span className="text-white/90 text-[10px] sm:text-xs drop-shadow-md w-8 text-right shrink-0">{formatTime(currentTime)}</span>
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeek}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 accent-gold-500 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-white/90 text-[10px] sm:text-xs drop-shadow-md w-8 shrink-0">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Bottom Gradient for Text Legibility */}
      <div className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
