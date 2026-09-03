import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";
import { BsDisc, BsMusicNoteBeamed } from "react-icons/bs";
import useWidgetAPI from "utils/proxy/use-widget-api";

function formatDuration(ms) {
  if (!ms || typeof ms !== "number" || ms <= 0) return "";
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

  const { stats, nowPlaying } = data;

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
              {/* 第一行：歌曲名与歌手（带主题色脉冲音符） */}
              <div className="relative mt-1 flex h-5 w-full items-center rounded-md bg-theme-200/50 text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
                <div className="relative mx-2 flex h-4 w-full items-center gap-1.5 overflow-hidden text-xs">
                  <BsMusicNoteBeamed className="shrink-0 animate-pulse text-theme-500" />
                  <span className="truncate font-medium" title={nowPlaying.title}>
                    {nowPlaying.title}
                  </span>
                  {nowPlaying.artist && (
                    <span className="truncate opacity-75" title={nowPlaying.artist}>
                      - {nowPlaying.artist}
                    </span>
                  )}
                </div>
              </div>

              {/* 第二行：专辑信息与歌曲总时长 */}
              <div className="relative mt-1 flex h-5 w-full items-center justify-between rounded-md bg-theme-200/50 px-2 text-xs text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
                <div className="flex min-w-0 items-center gap-1 overflow-hidden text-[11px] opacity-80">
                  <BsDisc className="shrink-0 text-[10px] opacity-60" />
                  <span className="truncate" title={nowPlaying.album || ""}>
                    {nowPlaying.album || t("fnosmusic.now_playing")}
                  </span>
                </div>
                {nowPlaying.duration > 0 && (
                  <span className="ml-2 shrink-0 font-mono text-[10px] opacity-75">
                    {formatDuration(nowPlaying.duration)}
                  </span>
                )}
              </div>
            </>
          ) : (
            /* 单行紧凑模式 */
            <div className="relative mt-1 flex h-5 w-full items-center justify-between rounded-md bg-theme-200/50 px-2 text-xs text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                <BsMusicNoteBeamed className="shrink-0 animate-pulse text-theme-500" />
                <span className="truncate font-medium" title={nowPlaying.title}>
                  {nowPlaying.title}
                </span>
                {nowPlaying.artist && (
                  <span className="truncate opacity-75" title={nowPlaying.artist}>
                    - {nowPlaying.artist}
                  </span>
                )}
              </div>
              {nowPlaying.duration > 0 && (
                <span className="ml-2 shrink-0 font-mono text-[10px] opacity-75">
                  {formatDuration(nowPlaying.duration)}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
