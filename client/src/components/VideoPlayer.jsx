import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize,
  FiSkipBack, FiSkipForward, FiSettings, FiDownload, FiFilm, FiCast, FiRotateCw
} from 'react-icons/fi';

/**
 * Beautiful compact video player with advanced controls
 * Supports streaming with transcoding and quality selection
 */

// CSS for rotated video in fullscreen
const rotateStyles = `
  .rotate-container {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  .rotated-video {
    transform: rotate(90deg);
    transform-origin: center center;
    object-fit: contain;
  }
`;

// Reusable control button component
const ControlButton = ({ onClick, icon: Icon, title, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`w-9 h-9 flex items-center justify-center hover:bg-white/15 rounded-md transition-all active:scale-95 text-white ${className}`}
    title={title}
  >
    {children || <Icon className="text-sm" />}
  </button>
);

export const VideoPlayer = ({ 
  src,
  filename,
  onDownload,
  enableStreaming = true,
  apiBase = '',
  token // Firebase auth token (required for streaming)
}) => {
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
  const [currentStreamUrl, setCurrentStreamUrl] = useState(null);
  const [useFallbackSrc, setUseFallbackSrc] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState('unknown');
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const [isRotated, setIsRotated] = useState(false);

  const controlTimeoutRef = useRef(null);

  // Fetch available qualities when src changes
  useEffect(() => {
    if (src && enableStreaming && filename && apiBase && token) {
      fetchQualities();
    } else if (enableStreaming) {
      // Set default qualities if streaming enabled but no fetch
      setAvailableQualities([
        { quality: 'original', label: 'Original', available: true, cached: false },
        { quality: '480p', label: '480p', available: true, cached: false },
        { quality: '720p', label: '720p', available: true, cached: false },
        { quality: '1080p', label: '1080p', available: true, cached: false }
      ]);
    }
  }, [src, filename, apiBase, enableStreaming, token]);

  // Generate stream URL when src, quality, or token changes (not on every render)
  useEffect(() => {
    if (!enableStreaming || !filename) {
      setCurrentStreamUrl(src || null);
      return;
    }

    // If no token, can't stream - show error
    if (!token) {
      console.error('[VideoPlayer] No token provided for streaming');
      setHasError(true);
      setCurrentStreamUrl(null);
      return;
    }

    // If fallback mode (metadata not found), use original src
    if (useFallbackSrc) {
      console.log('[VideoPlayer] Using fallback src (metadata not found)');
      setCurrentStreamUrl(src || null);
      return;
    }

    const cleanFilename = filename.split('/').pop();

    // Build query parameters
    const queryParams = [];
    if (selectedQuality !== 'auto') {
      queryParams.push(`quality=${selectedQuality}`);
    }
    queryParams.push(`token=${encodeURIComponent(token)}`);

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // Build stream URL
    const streamUrl = `${apiBase}/api/stream/${encodeURIComponent(cleanFilename)}${queryString}`;

    console.log('[VideoPlayer] Stream URL:', streamUrl.substring(0, 120) + '...');
    setCurrentStreamUrl(streamUrl);
    
    // Reset state for new video
    setIsLoading(true);
    setHasError(false);
    setErrorCount(0);
  }, [enableStreaming, filename, selectedQuality, apiBase, token, src, useFallbackSrc]);

  // Fetch available streaming qualities
  const fetchQualities = async () => {
    try {
      // Extract just the filename from the full URL if needed
      const cleanFilename = filename.split('/').pop();
      console.log('[VideoPlayer] Fetching qualities:', { 
        url: `${apiBase}/api/stream/${encodeURIComponent(cleanFilename)}/qualities`,
        hasToken: !!token,
        tokenLength: token?.length
      });

      const response = await fetch(`${apiBase}/api/stream/${encodeURIComponent(cleanFilename)}/qualities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('[VideoPlayer] Qualities response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const qualities = [{ quality: 'original', label: 'Original', available: true }];

        data.transcoded?.forEach((q) => {
          if (q.available) {
            qualities.push({
              quality: q.quality,
              label: q.quality,
              available: true,
              cached: q.cached // Track if already cached
            });
          }
        });

        console.log('[VideoPlayer] Available qualities:', qualities);
        setAvailableQualities(qualities);
        // Show transcoding indicator only if nothing is cached yet
        setIsTranscoding(qualities.length === 1 || !qualities.some(q => q.cached));
      } else {
        // Response not OK, set default qualities
        console.warn('[VideoPlayer] Qualities fetch returned non-OK status, using defaults');
        setDefaultQualities();
      }
    } catch (error) {
      console.warn('[VideoPlayer] Failed to fetch qualities:', error.message);
      // Set default qualities on error
      setDefaultQualities();
    }
  };

  // Set default qualities for fallback
  const setDefaultQualities = () => {
    const defaults = [
      { quality: 'original', label: 'Original', available: true, cached: false },
      { quality: '480p', label: '480p', available: true, cached: false },
      { quality: '720p', label: '720p', available: true, cached: false },
      { quality: '1080p', label: '1080p', available: true, cached: false }
    ];
    setAvailableQualities(defaults);
    setIsTranscoding(true);
  };

  // Get streaming URL (memoized, no longer regenerated on every render)
  const getStreamUrl = useCallback(() => {
    return currentStreamUrl || src || null;
  }, [currentStreamUrl, src]);

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
    const video = videoRef.current;
    setDuration(video?.duration || 0);
    setIsLoading(false);
    
    // Detect video orientation and aspect ratio
    const width = video?.videoWidth || 0;
    const height = video?.videoHeight || 0;
    const orientation = height > width ? 'portrait' : 'landscape';
    const aspectRatio = width / height;
    setVideoOrientation(orientation);
    setVideoAspectRatio(aspectRatio);
    
    console.log('[VideoPlayer] Metadata loaded:', {
      readyState: video?.readyState,
      networkState: video?.networkState,
      duration: video?.duration,
      videoWidth: width,
      videoHeight: height,
      orientation,
      aspectRatio,
      src: video?.src?.substring(0, 100),
      canPlayType: video?.canPlayType?.('video/mp4')
    });

    // Don't call load() here - it causes infinite loop!
    // Video will continue loading automatically
  };

  const handleCanPlay = () => {
    // Video has enough data to start playing
    console.log('[VideoPlayer] Can play, readyState:', videoRef.current?.readyState);
    setIsLoading(false);
  };

  const handleCanPlayThrough = () => {
    // Video has enough data to play through without buffering
    console.log('[VideoPlayer] Can play through');
    setIsLoading(false);
    // Auto-play if user tried to play while buffering
    if (videoRef.current?.paused && !hasError) {
      videoRef.current.play().catch(err => {
        console.warn('[VideoPlayer] Auto-play failed:', err.message);
      });
    }
  };

  const handleWaiting = () => {
    // Only show loading if video is not ready yet (initial load)
    // Don't show on every buffer/wait event to prevent flickering
    if (duration === 0 || videoRef.current?.readyState < 3) {
      setIsLoading(true);
    }
  };
  const handlePlaying = () => {
    setIsPlaying(true);
    setIsLoading(false);
    console.log('[VideoPlayer] Started playing, currentTime:', videoRef.current?.currentTime);
  };
  const handlePause = () => {
    setIsPlaying(false);
    console.log('[VideoPlayer] Paused at:', videoRef.current?.currentTime);
  };
  const handleError = (e) => {
    const video = videoRef.current;
    const error = video?.error;
    
    const errorNames = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK',
      3: 'MEDIA_ERR_DECODE',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };

    console.error('=== Video Error Details ===');
    console.error('Error event:', e);
    console.error('Error code:', error?.code, '-', errorNames[error?.code] || 'UNKNOWN');
    console.error('Error message:', error?.message);
    console.error('Network state:', video?.networkState, {
      0: 'NETWORK_EMPTY',
      1: 'NETWORK_IDLE',
      2: 'NETWORK_LOADING',
      3: 'NETWORK_NO_SOURCE'
    }[video?.networkState]);
    console.error('Ready state:', video?.readyState, {
      0: 'HAVE_NOTHING',
      1: 'HAVE_METADATA',
      2: 'HAVE_CURRENT_DATA',
      3: 'HAVE_FUTURE_DATA',
      4: 'HAVE_ENOUGH_DATA'
    }[video?.readyState]);
    console.error('Current src:', video?.src);
    console.error('========================');

    setErrorCount(prev => prev + 1);
    
    // Auto-fallback to direct src on network error
    if (error?.code === 2 && !useFallbackSrc) { // MEDIA_ERR_NETWORK
      console.log('[VideoPlayer] Network error, attempting fallback...');
      setUseFallbackSrc(true);
      setHasError(false);
      return;
    }
    
    // Show error after multiple failures
    if (errorCount >= 2) {
      setHasError(true);
      setIsLoading(false);
    }
  };

  // Check if there's a streaming error (404 from server)
  useEffect(() => {
    if (currentStreamUrl && enableStreaming && token && !useFallbackSrc) {
      // Check if stream URL returns 404
      const checkStreamUrl = async () => {
        try {
          console.log('[VideoPlayer] Checking stream URL status...');
          const response = await fetch(currentStreamUrl, {
            method: 'HEAD',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log('[VideoPlayer] Stream URL status:', response.status);
          
          if (response.status === 404) {
            console.error('[VideoPlayer] Stream URL returned 404 - file metadata not found in Firestore');
            // Fallback to direct src instead of showing error
            setUseFallbackSrc(true);
            setIsLoading(false);
          } else if (response.status === 200) {
            console.log('[VideoPlayer] Stream URL is valid, content-length:', response.headers.get('content-length'));
          }
        } catch (err) {
          console.warn('[VideoPlayer] Failed to check stream URL:', err.message);
        }
      };
      checkStreamUrl();
    }
  }, [currentStreamUrl, enableStreaming, token, useFallbackSrc]);

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
    
    const video = videoRef.current;
    console.log('[VideoPlayer] togglePlay called:', {
      paused: video.paused,
      readyState: video.readyState,
      networkState: video.networkState,
      currentTime: video.currentTime,
      buffered: video.buffered?.length > 0 ? video.buffered.end(0) : 0,
      src: video.src?.substring(0, 80)
    });
    
    // Use video element's actual state, not React state (which can be stale)
    if (video.paused) {
      // Force load if needed
      if (video.readyState < 2) {
        console.log('[VideoPlayer] ReadyState too low, calling load() first');
        video.load();
      }
      
      video.play().then(() => {
        console.log('[VideoPlayer] Play succeeded!');
        setIsPlaying(true);
      }).catch(err => {
        console.error('[VideoPlayer] Play failed:', err.name, '-', err.message);
        // Auto-fallback might have issues, try reloading
        if (err.name === 'NotAllowedError') {
          console.log('[VideoPlayer] Autoplay blocked - user interaction needed');
        } else if (err.name === 'NotSupportedError') {
          console.log('[VideoPlayer] Format not supported');
        }
      });
    } else {
      video.pause();
      console.log('[VideoPlayer] Paused manually');
    }
  }, []);

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
      setIsRotated(false); // Reset rotation when exiting fullscreen
    }
  }, []);

  // Rotate toggle for portrait videos
  const toggleRotate = useCallback(() => {
    setIsRotated(prev => !prev);
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
        case 'r':
          e.preventDefault();
          if (isFullscreen) {
            toggleRotate();
          }
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

  // Watch video element readyState and auto-play when buffer is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if video can play but hasn't started yet
    const checkReadyState = () => {
      console.log('[VideoPlayer] ReadyState check:', {
        readyState: video.readyState,
        paused: video.paused,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        buffered: video.buffered?.length > 0 ? video.buffered.end(0) : 0
      });

      // ReadyState: 0=EMPTY, 1=METADATA, 2=CURRENT_DATA, 3=FUTURE_DATA, 4=ENOUGH_DATA
      // If video has enough data (readyState >= 2) but is paused, try to play
      if (video.readyState >= 2 && video.paused && video.duration > 0 && !hasError && !isLoading) {
        console.log('[VideoPlayer] Video ready but paused (readyState=' + video.readyState + '), attempting play...');
        video.play().then(() => {
          console.log('[VideoPlayer] Play succeeded!');
        }).catch(err => {
          console.warn('[VideoPlayer] Play failed:', err.name, err.message);
          // Don't set error - user can manually play
        });
      }
    };

    // Check after metadata is loaded
    if (duration > 0) {
      const timer = setTimeout(checkReadyState, 300);
      return () => clearTimeout(timer);
    }
  }, [duration, hasError, isLoading]);

  // Progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    const format = filename?.split('.').pop()?.toUpperCase() || 'Unknown';
    const isVideoFormat = ['MP4', 'WEBM', 'OGG', 'MOV', 'AVI', 'MKV', 'FLV', 'WMV'].includes(format);
    
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

          {/* Additional info for videos */}
          {isVideoFormat && (
            <>
              <div className="w-8 h-px bg-slate-700/50 mx-auto my-3" />
              <p className="text-red-400 text-xs mt-1">
                ⚠ File metadata not found in database
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                File has <span className="text-red-400">red dot</span> in file list
              </p>
              <p className="text-slate-500 text-[10px] mt-1">
                Server will auto-fallback to direct file access
              </p>
            </>
          )}

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
    <>
      <style>{rotateStyles}</style>
      <div
        ref={containerRef}
        className={`relative group bg-black overflow-hidden flex items-center justify-center ${
          isFullscreen
            ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none'
            : videoOrientation === 'portrait'
              ? 'w-full max-w-[90vw] h-[70vh] rounded-lg'
              : 'w-full max-w-[90vw] aspect-video rounded-lg'
        }`}
      onMouseMove={(e) => { e.stopPropagation(); resetControlTimeout(); }}
      onClick={(e) => {
        e.stopPropagation();
        if (!e.target.closest('button') && !e.target.closest('[role="button"]')) {
          togglePlay();
        }
        resetControlTimeout();
      }}
    >
      {/* Video wrapper - rotated when needed */}
      <div className={`w-full h-full flex items-center justify-center ${
        isFullscreen && isRotated ? 'rotate-container' : ''
      }`}>
        {/* Video element with thumbnail poster */}
        <video
          ref={videoRef}
          key={currentStreamUrl || src || 'no-src'}
          src={getStreamUrl()}
          poster={thumbnailDataUrl || undefined}
          className={`w-full h-full object-contain relative z-20 ${
            isFullscreen && isRotated ? 'rotated-video' : ''
          }`}
          style={isFullscreen && isRotated && videoAspectRatio ? {
            width: videoAspectRatio < 1 
              ? `${100 / videoAspectRatio}vh`  // portrait: width based on screen height
              : `${100 * videoAspectRatio}vw`, // landscape: width based on screen width
            height: videoAspectRatio < 1
              ? `${100 * videoAspectRatio}vw`  // portrait: height based on screen width  
              : `${100 / videoAspectRatio}vh`, // landscape: height based on screen height
          } : undefined}
          preload="auto"
          muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onCanPlayThrough={handleCanPlayThrough}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onError={handleError}
        onStalled={(e) => {
          console.log('[VideoPlayer] Stalled event:', e);
          setIsLoading(true);
        }}
        onSuspend={(e) => {
          console.log('[VideoPlayer] Suspend event - browser blocked autoplay');
        }}
        onProgress={(e) => {
          const buffered = videoRef.current?.buffered;
          if (buffered?.length > 0) {
            console.log('[VideoPlayer] Progress, buffered:', buffered.end(buffered.length - 1));
          }
        }}
        onLoadedData={() => {
          console.log('[VideoPlayer] Loaded data event!');
        }}
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        playsInline
      />
      </div>

      {/* Loading state with spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 pointer-events-none z-10">
          <div className="text-center">
            <div className="w-14 h-14 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/80 text-sm font-medium">Loading video...</p>
            <p className="text-white/50 text-xs mt-1">{filename?.split('/').pop()?.substring(0, 30) || 'video'}</p>
            {isTranscoding && (
              <p className="text-indigo-400 text-xs mt-2 flex items-center justify-center gap-1">
                <FiCast className="animate-spin" /> Transcoding...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dynamic placeholder based on state */}
      {!src && !isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-0">
          <div className="text-center px-6">
            <div className="w-24 h-24 bg-white/5 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
              <FiFilm className="text-5xl text-white/40" />
            </div>
            <p className="text-white/60 text-sm font-medium">
              {hasError ? 'Video Unavailable' : 'No Video Selected'}
            </p>
            {hasError && (
              <p className="text-red-400/70 text-xs mt-1">Failed to load video</p>
            )}
          </div>
        </div>
      )}

      {/* Gradient overlay for controls */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-300 z-20 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress bar - Compact & Precise */}
        <div
          className="relative h-1 bg-white/20 rounded-full cursor-pointer group/progress mb-3 hover:h-1.5 transition-all"
          onClick={(e) => { e.stopPropagation(); handleSeek(e); }}
        >
          {/* Play progress */}
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Playhead - always visible on hover */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md scale-0 group-hover/progress:scale-100 transition-transform" />
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between gap-1 flex-nowrap">
          {/* Left controls - Playback & Volume */}
          <div className="flex items-center gap-0.5 flex-nowrap">
            <ControlButton
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              icon={isPlaying ? FiPause : FiPlay}
              title={isPlaying ? 'Pause (K)' : 'Play (K)'}
              className="text-base w-8 h-8"
            >
              {isPlaying ? <FiPause className="text-base" /> : <FiPlay className="text-base ml-0.5" />}
            </ControlButton>

            <ControlButton
              onClick={(e) => { e.stopPropagation(); toggleMute(); }}
              icon={isMuted || volume === 0 ? FiVolumeX : FiVolume2}
              title="Mute (M)"
              className="w-8 h-8"
            />

            {/* Time display */}
            <span className="text-white/90 text-xs font-medium tabular-nums ml-1 bg-black/20 px-1.5 py-0.5 rounded whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls - Quality, Download, Speed, Fullscreen */}
          <div className="flex items-center gap-0.5 relative flex-nowrap">
            {/* Quality selector - always show for video when streaming enabled */}
            {enableStreaming && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQualityMenu(!showQualityMenu);
                  }}
                  className={`w-8 h-8 flex items-center justify-center hover:bg-white/15 rounded-md transition-all active:scale-95 text-white text-xs font-medium flex-nowrap ${
                    isTranscoding ? 'text-indigo-400' : ''
                  }`}
                  title="Quality"
                >
                  <FiCast className={`text-xs ${isTranscoding ? 'animate-spin' : ''}`} />
                </button>

                {/* Quality menu dropdown */}
                {showQualityMenu && (
                  <div
                    className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-lg py-1 min-w-[120px] z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuality('auto');
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center justify-between whitespace-nowrap ${
                        selectedQuality === 'auto' ? 'text-indigo-400' : 'text-white'
                      }`}
                    >
                      <span>Auto</span>
                      {selectedQuality === 'auto' && <span className="text-indigo-400">✓</span>}
                    </button>

                    {availableQualities.length > 0 ? availableQualities.map((q) => (
                      <button
                        key={q.quality}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuality(q.quality);
                          setShowQualityMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center justify-between whitespace-nowrap ${
                          selectedQuality === q.quality ? 'text-indigo-400' : 'text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {q.label}
                          {q.cached && (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded">
                              ✓
                            </span>
                          )}
                        </span>
                        {selectedQuality === q.quality && <span className="text-indigo-400">✓</span>}
                      </button>
                    )) : (
                      // Default qualities if not fetched
                      ['original', '480p', '720p', '1080p'].map((q) => (
                        <button
                          key={q}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuality(q);
                            setShowQualityMenu(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors flex items-center justify-between whitespace-nowrap ${
                            selectedQuality === q ? 'text-indigo-400' : 'text-white'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {q === 'original' ? 'Original' : q}
                            <span className="text-[8px] bg-amber-500/20 text-amber-400 px-1 rounded">
                              ⚡
                            </span>
                          </span>
                          {selectedQuality === q && <span className="text-indigo-400">✓</span>}
                        </button>
                      ))
                    )}

                    <div className="px-3 py-2 text-xs text-slate-400 border-t border-white/10 mt-1 pt-2 flex items-center gap-1 whitespace-nowrap">
                      <FiCast className={`text-xs ${isTranscoding ? 'animate-spin' : ''}`} />
                      <span>{isTranscoding ? 'Transcoding...' : 'Ready'}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <ControlButton
              onClick={(e) => { e.stopPropagation(); onDownload(); }}
              icon={FiDownload}
              title="Download"
              className={!onDownload ? 'hidden' : 'w-8 h-8'}
            />

            <ControlButton
              onClick={(e) => { e.stopPropagation(); togglePlaybackSpeed(); }}
              title="Playback speed"
              className="text-xs font-semibold w-8 h-8"
            >
              <span>{playbackRate}x</span>
            </ControlButton>

            {isFullscreen && (
              <ControlButton
                onClick={(e) => { e.stopPropagation(); toggleRotate(); }}
                icon={FiRotateCw}
                title="Rotate (video portrait)"
                className={`w-8 h-8 ${videoOrientation === 'portrait' ? 'text-indigo-400' : 'text-white/50'}`}
              />
            )}

            <ControlButton
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              icon={isFullscreen ? FiMinimize : FiMaximize}
              title={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
              className="w-8 h-8"
            />
          </div>
        </div>
      </div>

      {/* Center play button (when paused) - Compact & Precise */}
      {!isPlaying && !isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors cursor-pointer z-20"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            togglePlay();
          }}
        >
          <div className="w-14 h-14 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-all duration-200">
            <FiPlay className="text-2xl text-slate-900 ml-0.5" />
          </div>
        </div>
      )}

      {/* Filename overlay (top-right corner, compact) */}
      <div
        className={`absolute top-3 right-3 transition-opacity duration-300 pointer-events-none z-20 ${
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
    </>
  );
};

export default VideoPlayer;
