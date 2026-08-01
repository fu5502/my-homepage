/* eslint-disable react/no-array-index-key */
import classNames from "classnames";
import BookmarksGroup from "components/bookmarks/group";
import ErrorBoundary from "components/errorboundry";
import QuickLaunch from "components/quicklaunch";
import ServicesGroup from "components/services/group";
import Tab, { slugifyAndEncode } from "components/tab";
import Revalidate from "components/toggles/revalidate";
import Widget from "components/widgets/widget";
import { useTranslation } from "next-i18next/pages";
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations";
import dynamic from "next/dynamic";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Script from "next/script";
import { useContext, useEffect, useMemo, useState } from "react";
import { BiCog, BiError } from "react-icons/bi";
import useSWR, { SWRConfig } from "swr";
import { ColorContext } from "utils/contexts/color";
import { SettingsContext } from "utils/contexts/settings";
import { TabContext } from "utils/contexts/tab";
import { ThemeContext } from "utils/contexts/theme";

import { bookmarksResponse, servicesResponse, widgetsResponse } from "utils/config/api-response";
import { getSettings } from "utils/config/config";
import useWindowFocus from "utils/hooks/window-focus";
import createLogger from "utils/logger";
import themes from "utils/styles/themes";

// 仓库地址：固定显示在首页页脚版权处，不在后台提供修改入口
const GITHUB_REPO_URL = "https://github.com/fu5502/my-homepage";

const ThemeToggle = dynamic(() => import("components/toggles/theme"), {
  ssr: false,
});

const ColorToggle = dynamic(() => import("components/toggles/color"), {
  ssr: false,
});

const Version = dynamic(() => import("components/version"), {
  ssr: false,
});

const rightAlignedWidgets = ["weatherapi", "openweathermap", "weather", "openmeteo", "search", "datetime"];

// Normalize language codes so older config values like zh-CN still point to Crowdin-provided ones
const LANGUAGE_ALIASES = {
  "zh-cn": "zh-Hans",
};

const normalizeLanguage = (language) => {
  if (!language) return "en";
  const alias = LANGUAGE_ALIASES[language.toLowerCase()];
  return alias || language;
};

export async function getStaticProps() {
  let logger;
  try {
    logger = createLogger("index");
    const { providers, ...settings } = getSettings();

    const services = await servicesResponse();
    const bookmarks = await bookmarksResponse();
    const widgets = await widgetsResponse();
    const language = normalizeLanguage(settings.language);

    return {
      props: {
        initialSettings: settings,
        fallback: {
          "/api/services": services,
          "/api/bookmarks": bookmarks,
          "/api/widgets": widgets,
          "/api/hash": false,
        },
        ...(await serverSideTranslations(language)),
      },
    };
  } catch (e) {
    if (logger && e) {
      logger.error(e);
    }
    return {
      props: {
        initialSettings: {},
        fallback: {
          "/api/services": [],
          "/api/bookmarks": [],
          "/api/widgets": [],
          "/api/hash": false,
        },
        ...(await serverSideTranslations("en")),
      },
    };
  }
}

function Index({ initialSettings, fallback }) {
  const windowFocused = useWindowFocus();
  const [stale, setStale] = useState(false);
  const { data: errorsData } = useSWR("/api/validate");
  const { error: validateError } = errorsData || {};
  const { data: hashData, mutate: mutateHash } = useSWR("/api/hash");

  useEffect(() => {
    if (windowFocused) {
      mutateHash();
    }
  }, [windowFocused, mutateHash]);

  useEffect(() => {
    if (hashData) {
      if (typeof window !== "undefined") {
        const previousHash = localStorage.getItem("hash");

        if (!previousHash) {
          localStorage.setItem("hash", hashData.hash);
        }

        if (previousHash && previousHash !== hashData.hash) {
          setStale(true);
          localStorage.setItem("hash", hashData.hash);

          fetch("/api/revalidate").then((res) => {
            if (res.ok) {
              window.location.reload();
            }
          });
        }
      }
    }
  }, [hashData]);

  if (validateError) {
    return (
      <div className="w-full h-screen container m-auto justify-center p-10 pointer-events-none">
        <div className="flex flex-col">
          <div className="basis-1/2 bg-theme-500 dark:bg-theme-600 text-theme-600 dark:text-theme-300 m-2 rounded-md font-mono shadow-md border-4 border-transparent">
            <div className="bg-rose-200 text-rose-800 dark:text-rose-200 dark:bg-rose-800 p-2 rounded-md font-bold">
              <BiError className="float-right w-6 h-6" />
              Error
            </div>
            <div className="p-2 text-theme-100 dark:text-theme-200">
              <pre className="opacity-50 font-bold pb-2">{validateError}</pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (stale) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-24 h-24 border-2 border-theme-400 border-solid rounded-full animate-spin border-t-transparent" />
      </div>
    );
  }

  if (errorsData && errorsData.length > 0) {
    return (
      <div className="w-full h-screen container m-auto justify-center p-10 pointer-events-none">
        <div className="flex flex-col">
          {errorsData.map((error, i) => (
            <div
              className="basis-1/2 bg-theme-500 dark:bg-theme-600 text-theme-600 dark:text-theme-300 m-2 rounded-md font-mono shadow-md border-4 border-transparent"
              key={i}
            >
              <div className="bg-amber-200 text-amber-800 dark:text-amber-200 dark:bg-amber-800 p-2 rounded-md font-bold">
                <BiError className="float-right w-6 h-6" />
                {error.name} - {error.config}
              </div>
              <div className="p-2 text-theme-100 dark:text-theme-200">
                <pre className="opacity-50 font-bold pb-2">
                  Reason: "{error.reason}" at line {error.mark?.line}
                </pre>
                <pre className="font-italic">Check logs for details.</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <SWRConfig value={{ fallback, fetcher: (resource, init) => fetch(resource, init).then((res) => res.json()) }}>
      <ErrorBoundary>
        <Home initialSettings={initialSettings} />
      </ErrorBoundary>
    </SWRConfig>
  );
}

const headerStyles = {
  boxed:
    "m-5 mb-0 sm:m-9 sm:mb-0 rounded-md shadow-md shadow-theme-900/10 dark:shadow-theme-900/20 bg-theme-100/20 dark:bg-white/5 p-3",
  underlined: "m-5 mb-0 sm:m-9 sm:mb-1 border-b-2 pb-4 border-theme-800 dark:border-theme-200/50",
  clean: "m-5 mb-0 sm:m-9 sm:mb-0",
  boxedWidgets: "m-5 mb-0 sm:m-9 sm:mb-0 sm:mt-1",
};

function getAllServices(services) {
  function getServices(group) {
    let nestedServices = [...group.services];
    if (group.groups.length > 0) {
      nestedServices = [...nestedServices, ...group.groups.map(getServices).flat()];
    }
    return nestedServices;
  }

  return [...services.map(getServices).flat()];
}

function Home({ initialSettings }) {
  const { i18n } = useTranslation();
  const { theme, setTheme } = useContext(ThemeContext);
  const { color, setColor } = useContext(ColorContext);
  const { settings, setSettings } = useContext(SettingsContext);
  const { activeTab, setActiveTab } = useContext(TabContext);
  const { asPath } = useRouter();

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, setSettings]);

  const { data: services } = useSWR("/api/services");
  const { data: bookmarks } = useSWR("/api/bookmarks");
  const { data: widgets } = useSWR("/api/widgets");
  const { data: site } = useSWR("/api/site");

  const servicesAndBookmarks = [...bookmarks.map((bg) => bg.bookmarks).flat(), ...getAllServices(services)].filter(
    (i) => i?.href,
  );

  useEffect(() => {
    const language = normalizeLanguage(settings.language);
    if (language) {
      i18n.changeLanguage(language);
    }

    if (settings.theme && theme !== settings.theme) {
      setTheme(settings.theme);
    }

    if (settings.color && color !== settings.color) {
      setColor(settings.color);
    }
  }, [i18n, settings, color, setColor, theme, setTheme]);

  const [searching, setSearching] = useState(false);
  const [searchString, setSearchString] = useState("");
  const headerStyle = settings?.headerStyle || "underlined";

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === "BODY" || e.target.id === "inner_wrapper") {
        if (
          (e.key.length === 1 &&
            e.key.match(/(\w|\s|[à-ü]|[À-Ü]|[\w\u0430-\u044f])/gi) &&
            !(e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)) ||
          // accented characters and the bang may require modifier keys
          e.key.match(/([à-ü]|[À-Ü]|!)/g) ||
          (e.key === "v" && (e.ctrlKey || e.metaKey))
        ) {
          setSearching(true);
        } else if (e.key === "Escape") {
          setSearchString("");
          setSearching(false);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return function cleanup() {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  const tabs = useMemo(
    () => [
      ...new Set(
        Object.keys(settings.layout ?? {})
          .map((groupName) => settings.layout[groupName]?.tab?.toString())
          .filter((group) => group),
      ),
    ],
    [settings.layout],
  );

  useEffect(() => {
    if (!activeTab) {
      const initialTab = asPath.substring(asPath.indexOf("#") + 1);
      setActiveTab(initialTab === "/" ? slugifyAndEncode(tabs["0"]) : initialTab);
    }
  });

  const servicesAndBookmarksGroups = useMemo(() => {
    const tabGroupFilter = (g) => g && [activeTab, ""].includes(slugifyAndEncode(settings.layout?.[g.name]?.tab));
    const undefinedGroupFilter = (g) => settings.layout?.[g.name] === undefined;

    const layoutGroups = Object.keys(settings.layout ?? {})
      .map((groupName) => services?.find((g) => g.name === groupName) ?? bookmarks?.find((b) => b.name === groupName))
      .filter(tabGroupFilter);

    if (!settings.layout && JSON.stringify(settings.layout) !== JSON.stringify(initialSettings.layout)) {
      // wait for settings to populate (if different from initial settings), otherwise all the widgets will be requested initially even if we are on a single tab
      return <div />;
    }

    const serviceGroups = services?.filter(tabGroupFilter).filter(undefinedGroupFilter);
    const bookmarkGroups = bookmarks.filter(tabGroupFilter).filter(undefinedGroupFilter);

    return (
      <>
        {tabs.length > 0 && (
          <div key="tabs" id="tabs" className="m-5 sm:m-9 sm:mt-4 sm:mb-0">
            <ul
              className={classNames(
                "sm:flex rounded-md bg-theme-100/20 dark:bg-white/5",
                settings.cardBlur !== undefined &&
                  `backdrop-blur${settings.cardBlur.length ? "-" : ""}${settings.cardBlur}`,
              )}
              id="myTab"
              data-tabs-toggle="#myTabContent"
              role="tablist"
            >
              {tabs.map((tab) => (
                <Tab key={tab} tab={tab} />
              ))}
            </ul>
          </div>
        )}
        {layoutGroups.length > 0 && (
          <div key="layoutGroups" id="layout-groups" className="flex flex-wrap m-4 sm:m-8 sm:mt-4 items-start mb-2">
            {layoutGroups.map((group) =>
              group.services ? (
                <ServicesGroup
                  key={group.name}
                  group={group}
                  layout={settings.layout?.[group.name]}
                  maxGroupColumns={settings.fiveColumns ? 5 : settings.maxGroupColumns}
                  disableCollapse={settings.disableCollapse}
                  useEqualHeights={settings.useEqualHeights}
                  groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
                />
              ) : (
                <BookmarksGroup
                  key={group.name}
                  bookmarks={group}
                  layout={settings.layout?.[group.name]}
                  disableCollapse={settings.disableCollapse}
                  maxGroupColumns={settings.maxBookmarkGroupColumns ?? settings.maxGroupColumns}
                  groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
                />
              ),
            )}
          </div>
        )}
        {serviceGroups?.length > 0 && (
          <div key="services" id="services" className="flex flex-wrap m-4 sm:m-8 sm:mt-4 items-start mb-2">
            {serviceGroups.map((group) => (
              <ServicesGroup
                key={group.name}
                group={group}
                layout={settings.layout?.[group.name]}
                maxGroupColumns={settings.fiveColumns ? 5 : settings.maxGroupColumns}
                disableCollapse={settings.disableCollapse}
                groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
              />
            ))}
          </div>
        )}
        {bookmarkGroups?.length > 0 && (
          <div key="bookmarks" id="bookmarks" className="flex flex-wrap m-4 sm:m-8 sm:mt-4 items-start mb-2">
            {bookmarkGroups.map((group) => (
              <BookmarksGroup
                key={group.name}
                bookmarks={group}
                layout={settings.layout?.[group.name]}
                disableCollapse={settings.disableCollapse}
                maxGroupColumns={settings.maxBookmarkGroupColumns ?? settings.maxGroupColumns}
                groupsInitiallyCollapsed={settings.groupsInitiallyCollapsed}
                bookmarksStyle={settings.bookmarksStyle}
              />
            ))}
          </div>
        )}
      </>
    );
  }, [
    tabs,
    activeTab,
    services,
    bookmarks,
    settings.layout,
    settings.fiveColumns,
    settings.maxGroupColumns,
    settings.maxBookmarkGroupColumns,
    settings.disableCollapse,
    settings.useEqualHeights,
    settings.cardBlur,
    settings.groupsInitiallyCollapsed,
    settings.bookmarksStyle,
    initialSettings.layout,
  ]);

  return (
    <>
      <Head>
        <title>{initialSettings.title || "Homepage"}</title>
        <meta
          name="description"
          content={
            initialSettings.description ||
            "A highly customizable homepage (or startpage / application dashboard) with Docker and service API integrations."
          }
        />
        {settings.disableIndexing && <meta name="robots" content="noindex, nofollow" />}
        {settings.base && <base href={settings.base} />}
        {settings.favicon ? (
          <>
            <link rel="icon" href={settings.favicon} />
            <link rel="apple-touch-icon" sizes="180x180" href={settings.favicon} />
          </>
        ) : (
          <>
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=4" />
            <link rel="shortcut icon" href="/homepage.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=4" />
            <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=4" />
            <link rel="mask-icon" href="/safari-pinned-tab.svg?v=4" color="#1e9cd7" />
          </>
        )}
        <meta name="msapplication-TileColor" content={themes[settings.color || "slate"][settings.theme || "dark"]} />
        <meta name="theme-color" content={themes[settings.color || "slate"][settings.theme || "dark"]} />
        <meta name="color-scheme" content="dark light"></meta>
      </Head>

      <Script src="/api/config/custom.js" />

      <div
        className={classNames(
          settings.fullWidth ? "" : "container",
          "relative m-auto flex flex-col justify-start z-10 h-full min-h-screen",
        )}
      >
        <QuickLaunch
          servicesAndBookmarks={servicesAndBookmarks}
          searchString={searchString}
          setSearchString={setSearchString}
          isOpen={searching}
          setSearching={setSearching}
        />
        <div
          id="information-widgets"
          className={classNames(
            "flex flex-row flex-wrap justify-between z-20",
            headerStyles[headerStyle],
            settings.cardBlur !== undefined &&
              headerStyle === "boxed" &&
              `backdrop-blur${settings.cardBlur.length ? "-" : ""}${settings.cardBlur}`,
          )}
        >
          <div id="widgets-wrap" className={classNames("flex flex-row w-full flex-wrap justify-between gap-x-2")}>
            {widgets && (
              <>
                {widgets
                  .filter((widget) => !rightAlignedWidgets.includes(widget.type))
                  .map((widget, i) => (
                    <Widget
                      key={i}
                      widget={widget}
                      style={{ header: headerStyle, isRightAligned: false, cardBlur: settings.cardBlur }}
                    />
                  ))}

                <div
                  id="information-widgets-right"
                  className={classNames(
                    "m-auto flex flex-wrap grow sm:basis-auto justify-between md:justify-end",
                    "m-auto flex flex-wrap grow sm:basis-auto justify-between md:justify-end gap-x-2",
                  )}
                >
                  {widgets
                    .filter((widget) => rightAlignedWidgets.includes(widget.type))
                    .map((widget, i) => (
                      <Widget
                        key={i}
                        widget={widget}
                        style={{ header: headerStyle, isRightAligned: true, cardBlur: settings.cardBlur }}
                      />
                    ))}
                </div>
              </>
            )}
          </div>
        </div>

        {servicesAndBookmarksGroups}

        <div id="footer" className="flex flex-col mt-auto p-8 w-full">
          <div id="style" className="flex w-full justify-end gap-x-2">
            {!settings?.color && <ColorToggle />}
            <Link href="/admin" title="后台管理" className="flex items-center opacity-70 hover:opacity-100">
              <BiCog className="text-xl" />
            </Link>
            <Revalidate />
            {!settings.theme && <ThemeToggle />}
          </div>

          <div id="version" className="flex mt-4 w-full justify-end">
            {!settings.hideVersion && <Version disableUpdateCheck={settings.disableUpdateCheck} />}
          </div>

          <div id="site-info" className="flex mt-3 w-full items-center justify-between gap-4 text-xs opacity-60">
            <span className="min-w-0 truncate">{site?.copyright}</span>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              className="flex items-center gap-1 shrink-0 hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16v3.2c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// Tailwind's backdrop-blur scale, in pixels.
const BACKDROP_BLUR_PX = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 40,
  "3xl": 64,
};

// Upstream only maps blur/saturate/brightness onto Tailwind backdrop classes.
// contrast/grayscale/hueRotate have no matching class, so when any of them is
// configured we compose the entire filter chain inline instead.
function buildBackdropFilter(bg) {
  const parts = [];

  if (bg.blur !== undefined) {
    const px = typeof bg.blur === "number" ? bg.blur : (BACKDROP_BLUR_PX[bg.blur] ?? Number(bg.blur));
    if (Number.isFinite(px) && px > 0) parts.push(`blur(${px}px)`);
  }
  if (bg.saturate !== undefined) parts.push(`saturate(${bg.saturate}%)`);
  if (bg.brightness !== undefined) parts.push(`brightness(${bg.brightness}%)`);
  if (bg.contrast !== undefined) parts.push(`contrast(${bg.contrast}%)`);
  if (bg.grayscale !== undefined) parts.push(`grayscale(${bg.grayscale}%)`);
  if (bg.hueRotate !== undefined) parts.push(`hue-rotate(${bg.hueRotate}deg)`);

  return parts.join(" ");
}

export default function Wrapper({ initialSettings, fallback }) {
  const { theme } = useContext(ThemeContext);
  const { color } = useContext(ColorContext);
  let backgroundImage = "";
  let opacity = initialSettings?.backgroundOpacity ?? 0;
  let backdropFilter = "";
  if (initialSettings?.background) {
    const bg = initialSettings.background;
    if (typeof bg === "object") {
      backgroundImage = bg.image || "";
      if (bg.opacity !== undefined) {
        opacity = 1 - bg.opacity / 100;
      }
      // Compose the whole filter chain inline so every slider (saturate,
      // brightness, blur, contrast, grayscale, hueRotate) takes effect without
      // relying on Tailwind dynamic utility classes, which v4 does not generate
      // at runtime. A backdrop-filter is only applied when at least one filter
      // field is configured (opacity is handled separately via the overlay).
      const FILTER_KEYS = ["blur", "saturate", "brightness", "contrast", "grayscale", "hueRotate"];
      if (FILTER_KEYS.some((k) => bg[k] !== undefined)) {
        backdropFilter = buildBackdropFilter(bg);
      }
    } else {
      backgroundImage = bg;
    }
  }

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.classList.remove("dark", "scheme-dark", "scheme-light");
    html.classList.toggle("dark", theme === "dark");
    html.classList.add(theme === "dark" ? "scheme-dark" : "scheme-light");

    const desiredThemeClass = `theme-${color || initialSettings.color || "slate"}`;
    const themeClassesToRemove = Array.from(html.classList).filter(
      (cls) => cls.startsWith("theme-") && cls !== desiredThemeClass,
    );
    if (themeClassesToRemove.length) {
      html.classList.remove(...themeClassesToRemove);
    }
    if (!html.classList.contains(desiredThemeClass)) {
      html.classList.add(desiredThemeClass);
    }

    // Remove any previously applied inline styles
    body.style.backgroundImage = "";
    body.style.backgroundColor = "";
    body.style.backgroundAttachment = "";
  }, [backgroundImage, opacity, theme, color, initialSettings.color]);

  return (
    <>
      {backgroundImage && (
        <div
          id="background"
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(rgb(var(--bg-color) / ${opacity}), rgb(var(--bg-color) / ${opacity})), url('${backgroundImage}')`,
          }}
        />
      )}
      <div id="page_wrapper" className="relative h-full">
        <div
          id="inner_wrapper"
          tabIndex="-1"
          style={backdropFilter ? { backdropFilter, WebkitBackdropFilter: backdropFilter } : undefined}
          className="w-full h-full overflow-auto"
        >
          <Index initialSettings={initialSettings} fallback={fallback} />
        </div>
      </div>
    </>
  );
}
