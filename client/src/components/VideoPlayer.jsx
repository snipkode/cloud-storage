import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize,
  FiSkipBack, FiSkipForward, FiSettings, FiDownload
} from 'react-icons/fi';

/**
 * Beautiful compact video player with advanced controls
 */
export const VideoPlayer = ({ src, filename, onDownload }) => {
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

  const controlTimeoutRef = useRef(null);

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
        setShowSettings(false);
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

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg">
        <div className="text-center text-slate-400">
          <FiSettings className="text-5xl mb-3 mx-auto opacity-50" />
          <p className="text-sm font-medium">Failed to load video</p>
          <p className="text-xs mt-1 opacity-70">Format: {filename?.split('.').pop()?.toUpperCase() || 'Unknown'}</p>
          <button
            onClick={() => { setHasError(false); setErrorCount(0); setIsLoading(true); }}
            className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors"
          >
            Retry
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
        src={src}
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
          <div className="flex items-center gap-1">
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
