import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";
import { useEffect, useState } from "react";
import { BsFillPlayFill, BsMusicNoteBeamed } from "react-icons/bs";
import useWidgetAPI from "utils/proxy/use-widget-api";

function formatDuration(ms) {
  if (!ms || typeof ms !== "number" || ms < 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function usePlaybackProgress(nowPlaying) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    if (!nowPlaying?.duration) {
      setPosition(0);
      return;
    }

    const guid = nowPlaying.guid || nowPlaying.title;
    const storageKey = `fnos_music_pos_${guid}`;
    let startTime = 0;

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        startTime = parseInt(stored, 10);
      }
    } catch {
      // ignore
    }

    const now = Date.now();
    if (!startTime || now - startTime > nowPlaying.duration + 5000 || now < startTime) {
      startTime = now;
      try {
        sessionStorage.setItem(storageKey, startTime.toString());
      } catch {
        // ignore
      }
    }

    const update = () => {
      const elapsed = Date.now() - startTime;
      const current = Math.min(elapsed, nowPlaying.duration);
      setPosition(current);
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [nowPlaying?.guid, nowPlaying?.title, nowPlaying?.duration]);

  return position;
}

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "unified", {
    refreshInterval: 10000,
  });

  const nowPlaying = data?.nowPlaying;
  const position = usePlaybackProgress(nowPlaying);

  if (error || data?.error) {
    return <Container service={service} error={error ?? data?.error} />;
  }

  const enableBlocks = widget?.enableBlocks !== false;
  const enableNowPlaying = widget?.enableNowPlaying !== false;
  const expandOneStreamToTwoRows = widget?.expandOneStreamToTwoRows !== false;

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
    nowPlaying?.duration > 0 ? Math.min(100, Math.max(0, Math.round((position / nowPlaying.duration) * 100))) : 0;

  const streamTitle = nowPlaying
    ? `${nowPlaying.title}${nowPlaying.artist ? ` - ${nowPlaying.artist}` : ""}${nowPlaying.album ? ` (${nowPlaying.album})` : ""}`
    : "";

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
        <div className="flex flex-col pb-1">
          {expandOneStreamToTwoRows ? (
            <>
              {/* 第一行：曲目与歌手信息（参考 Emby / Jellyfin 样式） */}
              <div className="relative mt-1 flex h-5 w-full rounded-md bg-theme-200/50 text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
                <div className="relative mr-2 flex h-4 w-full grow items-center gap-1.5 overflow-hidden text-xs">
                  <BsMusicNoteBeamed className="ml-2 shrink-0 animate-pulse text-theme-500" />
                  <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap" title={streamTitle}>
                    {nowPlaying.title}
                    {nowPlaying.artist && <span className="opacity-75"> - {nowPlaying.artist}</span>}
                  </div>
                </div>
              </div>

              {/* 第二行：专属播放进度条（参考 Emby 样式） */}
              <div className="relative mt-1 flex h-5 w-full items-center rounded-md bg-theme-200/50 text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
                <div
                  className="absolute z-0 h-5 rounded-md bg-theme-500/35 transition-all duration-300 ease-linear dark:bg-theme-500/40"
                  style={{
                    width: `${percent}%`,
                  }}
                />
                <div className="z-10 ml-1.5 flex items-center text-xs">
                  <BsFillPlayFill className="inline-block h-3.5 w-3.5 text-theme-500" />
                </div>
                <div className="grow" />
                <div className="z-10 mr-2 flex items-center font-mono text-[10px] opacity-90">
                  {formatDuration(position)}
                  <span className="mx-0.5 text-[8px] opacity-60">/</span>
                  {formatDuration(nowPlaying.duration)}
                </div>
              </div>
            </>
          ) : (
            /* 单行紧凑模式 */
            <div className="relative mt-1 flex h-5 w-full items-center rounded-md bg-theme-200/50 text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
              <div
                className="absolute z-0 h-5 rounded-md bg-theme-500/35 transition-all duration-300 ease-linear dark:bg-theme-500/40"
                style={{
                  width: `${percent}%`,
                }}
              />
              <div className="relative z-10 mr-2 flex h-4 w-full grow items-center gap-1.5 overflow-hidden text-xs">
                <BsFillPlayFill className="ml-1.5 shrink-0 text-theme-500" />
                <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap" title={streamTitle}>
                  {nowPlaying.title}
                  {nowPlaying.artist && <span className="opacity-75"> - {nowPlaying.artist}</span>}
                </div>
              </div>
              <div className="z-10 mr-2 shrink-0 font-mono text-[10px] opacity-90">
                {formatDuration(position)}
                <span className="mx-0.5 text-[8px] opacity-60">/</span>
                {formatDuration(nowPlaying.duration)}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
