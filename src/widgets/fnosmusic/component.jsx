import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";
import { useEffect, useRef, useState } from "react";
import { BsCheck2Circle, BsFillPlayFill, BsMusicNoteBeamed, BsPauseFill } from "react-icons/bs";
import useWidgetAPI from "utils/proxy/use-widget-api";

function formatDuration(ms) {
  if (!ms || typeof ms !== "number" || ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { data, error } = useWidgetAPI(widget, "unified", {
    refreshInterval: 5000,
  });

  const nowPlaying = data?.nowPlaying;
  const progressBarRef = useRef(null);

  // 核心状态管理
  const [position, setPosition] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);

  // 记录最后一次用户拖动的信息：{ guid, position, timestamp }
  const manualSeekRef = useRef(null);
  const lastGuidRef = useRef(null);

  // 当收到后端数据或切换歌曲时更新
  useEffect(() => {
    if (!nowPlaying?.duration) {
      setPosition(0);
      return;
    }

    // 检测到切歌，重置手动拖拽与暂停状态
    if (nowPlaying.guid && nowPlaying.guid !== lastGuidRef.current) {
      lastGuidRef.current = nowPlaying.guid;
      manualSeekRef.current = null;
      setIsPaused(false);
    }

    // 如果用户在当前歌曲上刚刚手动拖拽过，且距离拖拽不足20秒，优先遵从用户拖拽位置
    if (manualSeekRef.current && manualSeekRef.current.guid === nowPlaying.guid) {
      return;
    }

    // 默认按照后端下发的时间初始化
    const initialElapsed = typeof nowPlaying.elapsed === "number" ? nowPlaying.elapsed : 0;
    setPosition(Math.min(initialElapsed, nowPlaying.duration));
    setIsPaused(!nowPlaying.isPlaying);
  }, [nowPlaying?.guid, nowPlaying?.elapsed, nowPlaying?.duration, nowPlaying?.isPlaying]);

  // 秒级平滑推进计时器
  useEffect(() => {
    if (!nowPlaying?.duration || isPaused || isDragging) return;

    const timer = setInterval(() => {
      setPosition((prev) => {
        if (prev >= nowPlaying.duration) {
          return nowPlaying.duration;
        }
        return Math.min(prev + 1000, nowPlaying.duration);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [nowPlaying?.duration, isPaused, isDragging]);

  // 计算拖拽或点击的百分比
  const calculatePercentFromEvent = (e) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const offsetX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return rect.width > 0 ? (offsetX / rect.width) * 100 : 0;
  };

  // 鼠标/触摸交互事件处理
  const handleSeekStart = (e) => {
    if (!nowPlaying?.duration) return;
    setIsDragging(true);
    const pct = calculatePercentFromEvent(e);
    setDragPercent(pct);
  };

  const handleSeekMove = (e) => {
    if (!isDragging || !nowPlaying?.duration) return;
    const pct = calculatePercentFromEvent(e);
    setDragPercent(pct);
  };

  const handleSeekEnd = (e) => {
    if (!isDragging || !nowPlaying?.duration) return;
    setIsDragging(false);
    const pct = calculatePercentFromEvent(e);
    const newPos = Math.round((pct / 100) * nowPlaying.duration);
    setPosition(newPos);

    // 锁定用户手动拖拽的位置，20秒内不被后端静默覆盖
    manualSeekRef.current = {
      guid: nowPlaying.guid,
      position: newPos,
      timestamp: Date.now(),
    };
  };

  // 全局鼠标/触摸释放监听
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => handleSeekMove(e);
    const onMouseUp = (e) => handleSeekEnd(e);
    const onTouchMove = (e) => handleSeekMove(e);
    const onTouchEnd = (e) => handleSeekEnd(e);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

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

  // 当前实时展示的百分比与显示时间（拖动中优先显示拖动临时值）
  const displayPosition =
    isDragging && nowPlaying?.duration ? Math.round((dragPercent / 100) * nowPlaying.duration) : position;

  const displayPercent = isDragging
    ? dragPercent
    : nowPlaying?.duration > 0
      ? Math.min(100, Math.max(0, Math.round((position / nowPlaying.duration) * 100)))
      : 0;

  const isActivelyPlaying = !isPaused && displayPosition < (nowPlaying?.duration ?? 0);

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
        <div className="flex flex-col pb-1 select-none">
          {expandOneStreamToTwoRows ? (
            <>
              {/* 第一行：曲目与歌手信息（参考 Emby 规范） */}
              <div className="relative mt-1 flex h-5 w-full rounded-md bg-theme-200/50 text-theme-700 dark:bg-theme-900/20 dark:text-theme-200">
                <div className="relative mr-2 flex h-4 w-full grow items-center gap-1.5 overflow-hidden text-xs">
                  <BsMusicNoteBeamed
                    className={`ml-2 shrink-0 ${isActivelyPlaying ? "animate-pulse text-theme-500" : "opacity-50"}`}
                  />
                  <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap" title={streamTitle}>
                    {nowPlaying.title}
                    {nowPlaying.artist && <span className="opacity-75"> - {nowPlaying.artist}</span>}
                  </div>
                </div>
              </div>

              {/* 第二行：专属高对比度可拖动进度条（支持直接点击/拖动跳转与播放暂停切换） */}
              <div
                ref={progressBarRef}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                className="group relative mt-1 flex h-5 w-full cursor-pointer items-center overflow-hidden rounded-md bg-theme-200/60 text-theme-700 transition-colors hover:bg-theme-200/90 dark:bg-theme-900/30 dark:text-theme-200 dark:hover:bg-theme-900/50"
                title="拖动或点击调节进度"
              >
                {/* 动态进度填充槽 */}
                <div
                  className={`absolute left-0 top-0 z-0 h-full rounded-md transition-all ${
                    isDragging ? "duration-0" : "duration-300 ease-linear"
                  } ${
                    isActivelyPlaying ? "bg-theme-500/75 dark:bg-theme-500/65" : "bg-theme-400/50 dark:bg-theme-600/50"
                  }`}
                  style={{
                    width: `${displayPercent}%`,
                  }}
                />

                {/* 拖动悬浮手柄（白点，悬浮/拖动时显现） */}
                <div
                  className="pointer-events-none absolute top-1/2 z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-opacity group-hover:opacity-100"
                  style={{
                    left: `${displayPercent}%`,
                    opacity: isDragging ? 1 : 0,
                  }}
                />

                {/* 播放/暂停控制图标按钮 */}
                <div
                  className="z-10 ml-1.5 flex cursor-pointer items-center text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPaused(!isPaused);
                  }}
                  title={isPaused ? "点击播放" : "点击暂停"}
                >
                  {isPaused ? (
                    <BsPauseFill className="inline-block h-3.5 w-3.5 opacity-75" />
                  ) : displayPosition >= nowPlaying.duration ? (
                    <BsCheck2Circle className="inline-block h-3 w-3 opacity-60" title="已播完" />
                  ) : (
                    <BsFillPlayFill className="inline-block h-3.5 w-3.5 text-theme-500" />
                  )}
                </div>

                <div className="grow" />

                {/* 实时时间段显示 */}
                <div className="z-10 mr-2 flex items-center font-mono text-[10px] font-medium opacity-90">
                  {formatDuration(displayPosition)}
                  <span className="mx-0.5 text-[8px] opacity-60">/</span>
                  {formatDuration(nowPlaying.duration)}
                </div>
              </div>
            </>
          ) : (
            /* 单行紧凑可拖动模式 */
            <div
              ref={progressBarRef}
              onMouseDown={handleSeekStart}
              onTouchStart={handleSeekStart}
              className="group relative mt-1 flex h-5 w-full cursor-pointer items-center overflow-hidden rounded-md bg-theme-200/60 text-theme-700 transition-colors hover:bg-theme-200/90 dark:bg-theme-900/30 dark:text-theme-200 dark:hover:bg-theme-900/50"
              title="拖动或点击调节进度"
            >
              <div
                className={`absolute left-0 top-0 z-0 h-full rounded-md transition-all ${
                  isDragging ? "duration-0" : "duration-300 ease-linear"
                } ${
                  isActivelyPlaying ? "bg-theme-500/75 dark:bg-theme-500/65" : "bg-theme-400/50 dark:bg-theme-600/50"
                }`}
                style={{
                  width: `${displayPercent}%`,
                }}
              />
              <div
                className="relative z-10 mr-2 flex h-4 w-full grow items-center gap-1.5 overflow-hidden text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused(!isPaused);
                }}
              >
                {isPaused ? (
                  <BsPauseFill className="ml-1.5 shrink-0 opacity-75" />
                ) : (
                  <BsFillPlayFill className="ml-1.5 shrink-0 text-theme-500" />
                )}
                <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap" title={streamTitle}>
                  {nowPlaying.title}
                  {nowPlaying.artist && <span className="opacity-75"> - {nowPlaying.artist}</span>}
                </div>
              </div>
              <div className="z-10 mr-2 shrink-0 font-mono text-[10px] font-medium opacity-90">
                {formatDuration(displayPosition)}
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
