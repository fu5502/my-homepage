import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";
import { BsMusicNoteBeamed } from "react-icons/bs";
import useWidgetAPI from "utils/proxy/use-widget-api";

function formatDuration(ms) {
  if (!ms || typeof ms !== "number") return "";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "unified");

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
        <div className="relative mt-1 flex w-full items-center justify-between rounded-md bg-theme-200/50 px-2 py-1 text-xs text-theme-700 dark:bg-theme-900/30 dark:text-theme-200">
          <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
            <BsMusicNoteBeamed className="shrink-0 text-theme-500 animate-pulse" />
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
            <span className="ml-2 shrink-0 font-mono text-[10px] opacity-60">
              {formatDuration(nowPlaying.duration)}
            </span>
          )}
        </div>
      )}
    </>
  );
}
