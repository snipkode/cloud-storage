import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize,
  FiSkipBack, FiSkipForward, FiSettings, FiDownload, FiFilm, FiCast
} from 'react-icons/fi';
import { useAuthStore } from '@store/authStore';

/**
 * Beautiful compact video player with advanced controls
 * Supports streaming with transcoding and quality selection
 */
export const VideoPlayer = ({ 
  src, 
  filename, 
  onDownload,
  enableStreaming = true,
  apiBase = '' 
}) => {
  const { token } = useAuthStore();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState(null);
  const [errorCount, setErrorCount] = useState(0);
  
  // Streaming & quality state
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isTranscoding, setIsTranscoding] = useState(false);

  const controlTimeoutRef = useRef(null);

  // Fetch available qualities when src changes
  useEffect(() => {
    if (src && enableStreaming && filename && apiBase && token) {
      fetchQualities();
    }
  }, [src, filename, apiBase, enableStreaming, token]);

  // Fetch available streaming qualities
  const fetchQualities = async () => {
    try {
      // Extract just the filename from the full URL if needed
      const cleanFilename = filename.split('/').pop();
      const response = await fetch(`${apiBase}/api/stream/${encodeURIComponent(cleanFilename)}/qualities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const qualities = [{ quality: 'original', label: 'Original', available: true }];
        
        data.transcoded?.forEach((q) => {
          if (q.available) {
            qualities.push({ 
              quality: q.quality, 
              label: q.quality,
              available: true,
              cached: q.cached
            });
          }
        });
        
        setAvailableQualities(qualities);
        setIsTranscoding(qualities.length === 1); // Only original = still transcoding
      }
    } catch (error) {
      console.debug('[VideoPlayer] Failed to fetch qualities:', error.message);
    }
  };

  // Get streaming URL based on selected quality
  const getStreamUrl = useCallback(() => {
    if (!enableStreaming || !filename) return src;
    
    const cleanFilename = filename.split('/').pop();
    const qualityParam = selectedQuality !== 'auto' ? `&quality=${selectedQuality}` : '';
    return `${apiBase}/api/stream/${encodeURIComponent(cleanFilename)}?t=${Date.now()}${qualityParam}`;
  }, [enableStreaming, filename, selectedQuality, apiBase, src]);

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Hide controls after inactivity
  const resetControlTimeout = useCallback(() => {
    setShowControls(true);
    if (controlTimeoutRef.current) {
      clearTimeout(controlTimeoutRef.current);
    }
    if (isPlaying) {
      controlTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlTimeout();
    return () => {
      if (controlTimeoutRef.current) {
        clearTimeout(controlTimeoutRef.current);
      }
    };
  }, [resetControlTimeout]);

  // Generate thumbnail when src changes
  useEffect(() => {
    if (src) {
      // Reset states for new video
      setHasError(false);
      setErrorCount(0);
      setIsLoading(true);
      setThumbnailDataUrl(null);
      // Generate thumbnail after a short delay to ensure video is ready
      const timer = setTimeout(() => {
        generateThumbnail();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [src]);

  // Video event handlers
  const handleTimeUpdate = () => {
    setCurrentTime(videoRef.current?.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current?.duration || 0);
    setIsLoading(false);
  };

  const handleWaiting = () => setIsLoading(true);
  const handlePlaying = () => {
    setIsPlaying(true);
    setIsLoading(false);
  };
  const handlePause = () => setIsPlaying(false);
  const handleError = (e) => {
    console.error('Video error:', e);
    setErrorCount(prev => prev + 1);
    // Only show error after multiple failures (transient errors are common)
    if (errorCount >= 2) {
      setHasError(true);
      setIsLoading(false);
    }
  };

  // Generate thumbnail from video and display as poster
  const generateThumbnail = () => {
    if (!videoRef.current) return;
    
    // Create a video element to extract frame
    const tempVideo = document.createElement('video');
    tempVideo.src = src;
    tempVideo.crossOrigin = 'anonymous';
    tempVideo.muted = true;
    
    tempVideo.addEventListener('loadeddata', () => {
      // Seek to 10% of duration or 5 seconds, whichever is smaller
      const thumbnailTime = Math.min(tempVideo.duration * 0.1, 5);
      tempVideo.currentTime = thumbnailTime;
    });
    
    tempVideo.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setThumbnailDataUrl(dataUrl);
      setIsLoading(false);
    });
    
    tempVideo.addEventListener('error', () => {
      // Thumbnail generation failed, but video might still work
      setIsLoading(false);
    });
  };

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  // Seek handler
  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Playback speed toggle
  const togglePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextRate = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!containerRef.current) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, currentTime - 5);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(duration, currentTime + 5);
          }
          break;
        case 'arrowup':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.min(1, volume + 0.1);
            setVolume(newVol);
            videoRef.current.volume = newVol;
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          if (videoRef.current) {
            const newVol = Math.max(0, volume - 0.1);
            setVolume(newVol);
            videoRef.current.volume = newVol;
          }
          break;
        default:
          break;
      }
      resetControlTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, volume, togglePlay, toggleFullscreen, resetControlTimeout]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Close quality menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowQualityMenu(false);
    if (showQualityMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showQualityMenu]);

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    const format = filename?.split('.').pop()?.toUpperCase() || 'Unknown';
    return (
      <div className="relative flex items-center justify-center h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-lg overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        
        {/* Subtle glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 text-center px-6 py-5 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl">
          {/* Error icon */}
          <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl flex items-center justify-center border border-red-500/20 shadow-inner">
            <FiSettings className="text-xl text-red-400" />
          </div>
          
          {/* Error message */}
          <h3 className="text-white font-semibold text-sm tracking-tight">Playback Error</h3>
          <p className="text-slate-500 text-xs mt-0.5 font-mono">{format}</p>
          
          {/* Divider */}
          <div className="w-8 h-px bg-slate-700/50 mx-auto my-3" />
          
          {/* Retry button */}
          <button
            onClick={() => { setHasError(false); setErrorCount(0); setIsLoading(true); }}
            className="w-full px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold transition-all duration-200 shadow-lg shadow-white/10 hover:shadow-white/20 active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative group bg-black rounded-lg overflow-hidden w-full max-w-[90vw] aspect-video"
      onMouseMove={(e) => { e.stopPropagation(); resetControlTimeout(); }}
      onClick={(e) => { e.stopPropagation(); resetControlTimeout(); }}
    >
      {/* Video element with thumbnail poster */}
      <video
        ref={videoRef}
        src={getStreamUrl()}
        poster={thumbnailDataUrl || undefined}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onError={handleError}
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        autoPlay
      />

      {/* Default placeholder when no video loaded */}
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center">
            <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <FiFilm className="text-5xl text-white/40" />
            </div>
            <p className="text-white/60 text-sm font-medium">No video loaded</p>
          </div>
        </div>
      )}

      {/* Loading state with spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 pointer-events-none">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/80 text-sm font-medium">Loading video...</p>
            <p className="text-white/50 text-xs mt-1">{filename}</p>
            {isTranscoding && (
              <p className="text-indigo-400 text-xs mt-2 flex items-center justify-center gap-1">
                <FiCast className="animate-pulse" /> Transcoding...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gradient overlay for controls */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Progress bar */}
        <div
          className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/progress mb-4 hover:h-2 transition-all"
          onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
        >
          {/* Buffer progress */}
          <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/20 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Play progress */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Playhead */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between gap-3">
          {/* Left controls */}
          <div className="flex items-center gap-1">
            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              title={isPlaying ? 'Pause (K)' : 'Play (K)'}
            >
              {isPlaying ? (
                <FiPause className="text-lg" />
              ) : (
                <FiPlay className="text-lg" />
              )}
            </button>

            {/* Volume - mute toggle only */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              title="Mute (M)"
            >
              {isMuted || volume === 0 ? (
                <FiVolumeX className="text-base" />
              ) : (
                <FiVolume2 className="text-base" />
              )}
            </button>

            {/* Time display */}
            <span className="text-white text-xs font-medium tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 relative">
            {/* Quality selector - only show if streaming enabled and qualities available */}
            {enableStreaming && availableQualities.length > 0 && (
              <div className="relative">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowQualityMenu(!showQualityMenu);
                  }}
                  className="px-2 py-1 hover:bg-white/10 rounded-lg transition-colors text-white text-xs font-medium min-w-[40px] flex items-center gap-1"
                  title="Quality"
                >
                  <FiCast className="text-xs" />
                  {selectedQuality === 'auto' ? 'AUTO' : selectedQuality.toUpperCase()}
                </button>
                
                {/* Quality menu dropdown */}
                {showQualityMenu && (
                  <div 
                    className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg py-1 min-w-[100px] z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Auto quality option */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuality('auto');
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center justify-between ${
                        selectedQuality === 'auto' ? 'text-indigo-400' : 'text-white'
                      }`}
                    >
                      Auto
                      {selectedQuality === 'auto' && <span className="text-indigo-400">✓</span>}
                    </button>
                    
                    {/* Available qualities */}
                    {availableQualities.map((q) => (
                      <button
                        key={q.quality}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuality(q.quality);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center justify-between ${
                          selectedQuality === q.quality ? 'text-indigo-400' : 'text-white'
                        }`}
                      >
                        {q.label}
                        {selectedQuality === q.quality && <span className="text-indigo-400">✓</span>}
                      </button>
                    ))}
                    
                    {isTranscoding && (
                      <div className="px-3 py-2 text-xs text-slate-400 border-t border-white/10 mt-1 pt-2">
                        <FiCast className="inline animate-spin mr-1" />
                        Transcoding...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Download */}
            {onDownload && (
              <button
                onClick={(e) => { e.stopPropagation(); onDownload(); }}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
                title="Download"
              >
                <FiDownload className="text-base" />
              </button>
            )}

            {/* Playback speed */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlaybackSpeed(); }}
              className="px-2 py-1 hover:bg-white/10 rounded-lg transition-colors text-white text-xs font-medium min-w-[40px]"
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {isFullscreen ? (
                <FiMinimize className="text-base" />
              ) : (
                <FiMaximize className="text-base" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Center play button (when paused) */}
      {!isPlaying && !isLoading && (
        <button
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform">
            <FiPlay className="text-4xl text-white ml-1" />
          </div>
        </button>
      )}

      {/* Filename overlay (top-right corner, compact) */}
      <div
        className={`absolute top-3 right-3 transition-opacity duration-300 pointer-events-none ${
          showControls && !isFullscreen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 max-w-xs">
          <p className="text-white text-xs font-medium truncate">
            {filename}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
