/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { track } from '../data/track';

interface TrackMeta {
  title: string;
  artist: string;
  label: string;
  src: string;
  missing: string;
  legal: string;
}

interface AudioContextValue {
  available: boolean;
  playing: boolean;
  loading: boolean;
  error: string | null;
  volume: number;
  muted: boolean;
  progress: number;
  started: boolean;
  meta: TrackMeta;
  toggle: () => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextValue | null>(null);

const STORAGE_KEY = 'love-universe:volume';
const DEFAULT_VOLUME = 0.65;

function readVolume(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_VOLUME;
  const raw = localStorage.getItem(STORAGE_KEY);
  const value = raw ? Number.parseFloat(raw) : Number.NaN;
  if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
  return DEFAULT_VOLUME;
}

function describeMediaError(audio: HTMLAudioElement): string {
  // Числовые коды MediaError одинаковы во всех браузерах, но сам конструктор
  // MediaError доступен не всегда, поэтому не ссылаемся на него напрямую.
  switch (audio.error?.code) {
    case 1: // MEDIA_ERR_ABORTED
      return 'Загрузка аудио была прервана. Нажмите Play, чтобы попробовать снова.';
    case 2: // MEDIA_ERR_NETWORK
      return 'Не удалось загрузить аудиофайл. Проверьте соединение и перезагрузите страницу.';
    case 3: // MEDIA_ERR_DECODE
      return 'Аудиофайл повреждён или имеет неподдерживаемый формат.';
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return 'Браузер не поддерживает этот MP3 или файл недоступен.';
    default:
      return 'Не удалось воспроизвести аудио. Проверьте, что ufo-luv.mp3 существует и не повреждён.';
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const available = __AUDIO_AVAILABLE__;
  const audioRef = useRef<HTMLAudioElement>(null);
  const previousVolume = useRef(readVolume() || DEFAULT_VOLUME);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(readVolume);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!available) return;
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted;

    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
      setError(null);
    };
    const onPause = () => {
      setPlaying(false);
      setLoading(false);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setError(null);
    };
    const onCanPlay = () => {
      setLoading(false);
      setError(null);
    };
    const onEnded = () => {
      setPlaying(false);
      setStarted(false);
      setProgress(0);
      try {
        audio.currentTime = 0;
      } catch {
        // Некоторые браузеры не позволяют менять позицию до загрузки метаданных.
      }
    };
    const onError = () => {
      setLoading(false);
      setPlaying(false);
      setError(describeMediaError(audio));
    };
    const onTime = () => {
      if (!audio.duration || !Number.isFinite(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audio.addEventListener('timeupdate', onTime);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('timeupdate', onTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  useEffect(() => {
    if (!available) return;
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;

    const removeUnlockListeners = () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    };

    const unlock = (event: Event) => {
      const target = event.target;
      // Клики по самому плееру обрабатывают его кнопки, иначе автозапуск
      // успел бы стартовать и следующий клик поставил бы трек на паузу.
      if (target instanceof Element && target.closest('[data-testid="audio-player"]')) return;
      removeUnlockListeners();
      if (audio.paused) void audio.play().catch(() => undefined);
    };

    const addUnlockListeners = () => {
      window.addEventListener('pointerdown', unlock, true);
      window.addEventListener('keydown', unlock, true);
      window.addEventListener('touchstart', unlock, { capture: true, passive: true });
    };

    const attemptAutoplay = () => {
      if (cancelled || !audio.paused) return;
      void audio.play().catch(() => {
        // Браузер запретил автозапуск — включаем при первом действии
        // пользователя в любом месте страницы.
        if (!cancelled) addUnlockListeners();
      });
    };

    const timer = window.setTimeout(attemptAutoplay, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      removeUnlockListeners();
    };
  }, [available]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
      audio.muted = muted;
    }
    if (volume > 0) previousVolume.current = volume;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(volume));
    }
  }, [volume, muted]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!available || !audio) return;
    setError(null);
    if (audio.paused) {
      // После завершения трека возвращаемся к началу, иначе play() может
      // остаться на последней секунде в зависимости от браузера.
      if (audio.ended || (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration)) {
        try {
          audio.currentTime = 0;
        } catch {
          // Позицией можно управлять только после загрузки метаданных.
        }
        setProgress(0);
      }
      if (audio.error) audio.load();
      setLoading(true);
      void audio
        .play()
        .then(() => setLoading(false))
        .catch((reason: unknown) => {
          setLoading(false);
          setPlaying(false);
          const name = reason instanceof DOMException ? reason.name : '';
          setError(
            audio.error
              ? describeMediaError(audio)
              : name === 'NotAllowedError'
                ? 'Браузер заблокировал воспроизведение. Нажмите Play ещё раз.'
                : 'Не удалось начать воспроизведение. Попробуйте ещё раз.',
          );
        });
    } else {
      audio.pause();
    }
  }, [available]);

  const setVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value));
    setVolumeState(next);
    if (next > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      setMuted(false);
      // Если громкость была выкручена в ноль, возвращаем последнее
      // слышимое значение, иначе «включение звука» останется беззвучным.
      if (volume === 0) setVolumeState(previousVolume.current);
      return;
    }
    if (volume > 0) previousVolume.current = volume;
    setMuted(true);
  }, [muted, volume]);

  const value = useMemo<AudioContextValue>(
    () => ({
      available,
      playing,
      loading,
      error,
      volume,
      muted,
      progress,
      started,
      meta: track,
      toggle,
      setVolume,
      toggleMute,
    }),
    [
      available,
      playing,
      loading,
      error,
      volume,
      muted,
      progress,
      started,
      toggle,
      setVolume,
      toggleMute,
    ],
  );

  return (
    <AudioContext.Provider value={value}>
      {children}
      {available ? (
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          playsInline
          data-testid="universe-audio"
        />
      ) : null}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used inside AudioProvider');
  return context;
}
