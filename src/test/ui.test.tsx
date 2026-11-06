import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Intro } from '../components/Intro';
import { PlanetDock } from '../components/PlanetDock';
import { LovePanel } from '../components/panels/LovePanel';
import { ForeverPanel } from '../components/panels/ForeverPanel';
import { AudioPlayer } from '../components/AudioPlayer';
import { AudioProvider } from '../audio/AudioProvider';
import { loveText, foreverText } from '../data/content';
import { planets } from '../data/planets';

describe('герой', () => {
  it('показывает заголовок, подзаголовок и CTA', () => {
    const onEnter = vi.fn();
    render(<Intro onEnter={onEnter} reduced />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('LOVEUNIVERSE');
    expect(
      screen.getByText('У каждой Вселенной есть свой центр. У моей — ты.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Войти в нашу Вселенную/i }));
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});

describe('док планет', () => {
  it('показывает все пять планет и сообщает о выборе', () => {
    const onSelect = vi.fn();
    render(<PlanetDock active={null} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(planets.length);
    for (const planet of planets) {
      fireEvent.click(screen.getByText(planet.name));
    }
    expect(onSelect.mock.calls.map(([id]) => id)).toEqual(planets.map((planet) => planet.id));
  });
});

describe('панели', () => {
  it('планета LOVE показывает пять признаний', () => {
    render(<LovePanel onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: loveText.title })).toBeInTheDocument();
    for (const phrase of loveText.phrases) {
      expect(screen.getByText(phrase)).toBeInTheDocument();
    }
  });

  it('финал содержит точную строку и обе кнопки', () => {
    const onClose = vi.fn();
    const onRestart = vi.fn();
    render(<ForeverPanel onClose={onClose} onRestart={onRestart} />);
    expect(screen.getByText(foreverText.quote)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: foreverText.restart }));
    fireEvent.click(screen.getByRole('button', { name: foreverText.overview }));
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('плеер с аудиофайлом', () => {
  function renderPlayer() {
    const view = render(
      <AudioProvider>
        <AudioPlayer />
      </AudioProvider>,
    );
    const audio = view.container.querySelector('audio');
    expect(audio).not.toBeNull();
    const element = audio as HTMLAudioElement;

    let paused = true;
    let allowPlay = false;
    Object.defineProperty(element, 'paused', {
      configurable: true,
      get: () => paused,
    });

    const play = vi.spyOn(element, 'play').mockImplementation(() => {
      if (!allowPlay) {
        return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
      }
      paused = false;
      element.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    const pause = vi.spyOn(element, 'pause').mockImplementation(() => {
      paused = true;
      element.dispatchEvent(new Event('pause'));
    });

    return {
      ...view,
      audio: element,
      play,
      pause,
      enablePlay: () => {
        allowPlay = true;
      },
    };
  }

  it('подключает mp3 и переключает play / pause', async () => {
    const { audio, play, pause, enablePlay } = renderPlayer();
    const toggle = screen.getByTestId('audio-toggle');
    const status = screen.getByTestId('audio-status');
    const equalizer = screen.getByTestId('audio-equalizer');

    expect(audio.getAttribute('src')).toBe('/audio/ufo-luv.mp3');
    expect(audio.getAttribute('preload')).toBe('metadata');
    expect(audio.hasAttribute('playsinline')).toBe(true);
    expect(toggle).toBeEnabled();

    enablePlay();
    fireEvent.click(toggle);
    expect(play).toHaveBeenCalled();
    expect(await screen.findByText('Играет GONE.Fludd — UFO LUV')).toBeInTheDocument();
    expect(equalizer).toHaveAttribute('data-playing', 'true');

    fireEvent.click(toggle);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(status).toHaveTextContent('Пауза');
    expect(equalizer).toHaveAttribute('data-playing', 'false');
  });

  it('меняет громкость и переключает mute', () => {
    const { audio } = renderPlayer();
    const slider = screen.getByTestId('audio-volume');

    expect(audio.volume).toBeCloseTo(0.65, 2);
    fireEvent.change(slider, { target: { value: '0.2' } });
    expect(audio.volume).toBeCloseTo(0.2, 2);

    fireEvent.click(screen.getByRole('button', { name: 'Выключить звук' }));
    expect(audio.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Включить звук' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Включить звук' }));
    expect(audio.muted).toBe(false);
  });

  it('возвращает последнюю слышимую громкость после нуля', () => {
    const { audio } = renderPlayer();
    const slider = screen.getByTestId('audio-volume');

    fireEvent.change(slider, { target: { value: '0.4' } });
    fireEvent.change(slider, { target: { value: '0' } });
    expect(audio.volume).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Выключить звук' }));
    fireEvent.click(screen.getByRole('button', { name: 'Включить звук' }));
    expect(audio.muted).toBe(false);
    expect(audio.volume).toBeCloseTo(0.4, 2);
  });

  it('показывает ошибку вместо тихого сбоя', () => {
    const { audio } = renderPlayer();
    fireEvent(audio, new Event('error'));
    expect(screen.getByTestId('audio-status')).toHaveTextContent('Не удалось воспроизвести аудио');
    expect(screen.getByTestId('audio-toggle')).toBeEnabled();
  });
});
