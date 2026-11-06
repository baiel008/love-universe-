import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '../audio/AudioProvider';

export function AudioPlayer() {
  const {
    available,
    playing,
    loading,
    error,
    volume,
    muted,
    progress,
    started,
    meta,
    toggle,
    setVolume,
    toggleMute,
  } = useAudio();

  const status = !available
    ? meta.missing
    : error
      ? error
      : loading
        ? 'Загрузка трека…'
        : playing
          ? muted || volume === 0
            ? `Играет ${meta.label} · без звука`
            : `Играет ${meta.label}`
          : progress > 0 || started
            ? 'Пауза'
            : 'Готов к воспроизведению';

  return (
    <div
      className={`player${available ? '' : ' is-unavailable'}`}
      data-testid="audio-player"
      title={available ? meta.label : `${meta.missing} ${meta.legal}`}
    >
      <div className="player__meta">
        <span className="player__eyebrow">музыка вселенной</span>
        <span className="player__title">
          {meta.artist} <span aria-hidden="true">—</span> {meta.title}
        </span>
        <div className="player__track" aria-hidden="true">
          <span style={{ transform: `scaleX(${available ? Math.max(0.015, progress) : 0})` }} />
        </div>
      </div>

      <div className="player__controls">
        <span
          className={`player__equalizer${playing ? ' is-playing' : ''}`}
          data-testid="audio-equalizer"
          data-playing={playing}
          aria-hidden="true"
        >
          {[0, 1, 2, 3, 4].map((bar) => (
            <span key={bar} />
          ))}
        </span>

        <button
          type="button"
          className="player__button"
          onClick={toggle}
          disabled={!available}
          aria-label={playing ? 'Поставить на паузу' : 'Включить музыку'}
          data-testid="audio-toggle"
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>

        <button
          type="button"
          className="player__button player__button--mute"
          onClick={toggleMute}
          disabled={!available}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          aria-pressed={muted}
        >
          {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        <label className="player__volume">
          <span className="visually-hidden">Громкость</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(event) => setVolume(Number.parseFloat(event.target.value))}
            disabled={!available}
            data-testid="audio-volume"
          />
        </label>
      </div>

      <p
        className={`player__status${available && !error ? ' is-quiet' : ''}`}
        role="status"
        data-testid="audio-status"
      >
        {status}
      </p>
      {!available ? <span className="player__missing-note">{meta.legal}</span> : null}
    </div>
  );
}
