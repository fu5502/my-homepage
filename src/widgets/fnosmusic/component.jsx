import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";
import { useEffect, useState } from "react";
import { BsMusicNoteBeamed } from "react-icons/bs";
import useWidgetAPI from "utils/proxy/use-widget-api";

function formatDuration(ms) {
  if (!ms || typeof ms !== "number" || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "unified", {
    refreshInterval: 10000,
  });

  const nowPlaying = data?.nowPlaying;
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    if (!nowPlaying?.playedAt || !nowPlaying?.duration) {
      setCurrentPosition(0);
      return;
    }

    const playedAtMs = nowPlaying.playedAt > 1e12 ? nowPlaying.playedAt : nowPlaying.playedAt * 1000;

    const updatePosition = () => {
      const now = Date.now();
      const elapsed = now - playedAtMs;
      if (elapsed >= 0 && elapsed <= nowPlaying.duration) {
        setCurrentPosition(elapsed);
      } else if (elapsed > nowPlaying.duration) {
        setCurrentPosition(nowPlaying.duration);
      } else {
        setCurrentPosition(0);
      }
    };

    updatePosition();
    const interval = setInterval(updatePosition, 1000);
    return () => clearInterval(interval);
  }, [nowPlaying?.playedAt, nowPlaying?.duration]);

  if (error || data?.error) {
    return <Container service={service} error={error ?? data?.error} />;
  }

  const enableBlocks = widget?.enableBlocks !== false;
  const enableNowPlaying = widget?.enableNowPlaying !== false;

  if (!data) {
    return (
      <>
        {enableBlocks && (
          <Container service={service}>
            <Block label="fnosmusic.songs" />
            <Block label="fnosmusic.albums" />
            <Block label="fnosmusic.artists" />
          </Container>
        )}
      </>
    );
  }

  const { stats } = data;
  const percent =
    nowPlaying?.duration > 0
      ? Math.min(100, Math.max(0, Math.round((currentPosition / nowPlaying.duration) * 100)))
      : 0;

  const isActivelyPlaying = nowPlaying && currentPosition > 0 && currentPosition < nowPlaying.duration;

  return (
    <>
      {enableBlocks && (
        <Container service={service}>
          <Block label="fnosmusic.songs" value={t("common.number", { value: stats?.songs ?? 0 })} />
          <Block label="fnosmusic.albums" value={t("common.number", { value: stats?.albums ?? 0 })} />
          <Block label="fnosmusic.artists" value={t("common.number", { value: stats?.artists ?? 0 })} />
        </Container>
      )}

      {enableNowPlaying && nowPlaying && (
        <div className="relative mt-1.5 flex h-6 w-full items-center justify-between overflow-hidden rounded-md bg-theme-200/50 px-2 text-xs text-theme-700 dark:bg-theme-900/30 dark:text-theme-200">
          {percent > 0 && (
            <div
              className="absolute left-0 top-0 h-full rounded-md bg-theme-300/50 transition-all duration-300 ease-linear dark:bg-theme-700/50"
              style={{ width: `${percent}%` }}
            />
          )}

          <div className="relative z-10 flex min-w-0 items-center gap-1.5 overflow-hidden">
            <BsMusicNoteBeamed
              className={`shrink-0 text-theme-500 ${isActivelyPlaying ? "animate-pulse" : "opacity-75"}`}
            />
            <span className="truncate font-medium" title={nowPlaying.title}>
              {nowPlaying.title}
            </span>
            {nowPlaying.artist && (
              <span className="truncate opacity-75" title={nowPlaying.artist}>
                - {nowPlaying.artist}
              </span>
            )}
          </div>

          <div className="relative z-10 ml-2 shrink-0 font-mono text-[10px] opacity-75">
            {isActivelyPlaying
              ? `${formatDuration(currentPosition)} / ${formatDuration(nowPlaying.duration)}`
              : formatDuration(nowPlaying.duration)}
          </div>
        </div>
      )}
    </>
  );
}
