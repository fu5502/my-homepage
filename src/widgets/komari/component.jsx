import Block from "components/services/widget/block";
import Container from "components/services/widget/container";
import { useTranslation } from "next-i18next/pages";

import useWidgetAPI from "utils/proxy/use-widget-api";

export default function Component({ service }) {
  const { t } = useTranslation();
  const { widget } = service;
  const { nodeId } = widget;

  const { data, error } = useWidgetAPI(widget, "stats");

  const MAX_ALLOWED_FIELDS = 4;
  if (!widget.fields?.length) {
    widget.fields = nodeId ? ["name", "status", "cpu", "memory"] : ["nodes", "online"];
  }
  if (widget.fields?.length > MAX_ALLOWED_FIELDS) {
    widget.fields = widget.fields.slice(0, MAX_ALLOWED_FIELDS);
  }

  if (error) {
    return <Container service={service} error={error} />;
  }

  if (!data) {
    return nodeId ? (
      <Container service={service}>
        <Block label="komari.name" />
        <Block label="komari.status" />
        <Block label="komari.cpu" />
        <Block label="komari.memory" />
      </Container>
    ) : (
      <Container service={service}>
        <Block label="komari.nodes" />
        <Block label="komari.online" />
      </Container>
    );
  }

  if (data.mode === "node") {
    const netTotal = (data.network?.up || 0) + (data.network?.down || 0);

    return (
      <Container service={service}>
        <Block label="komari.name" value={data.name} />
        <Block label="komari.status" value={t(data.status === "offline" ? "komari.offline" : "komari.online")} />
        <Block
          label="komari.cpu"
          value={t("common.percent", { value: data.cpu, maximumFractionDigits: 1 })}
          highlightValue={data.cpu}
        />
        <Block
          label="komari.memory"
          value={t("common.percent", { value: data.ram?.percent, maximumFractionDigits: 1 })}
          highlightValue={data.ram?.percent}
        />
        <Block
          label="komari.disk"
          value={t("common.percent", { value: data.disk?.percent, maximumFractionDigits: 1 })}
          highlightValue={data.disk?.percent}
        />
        <Block
          label="komari.network"
          value={`↓ ${t("common.byterate", { value: data.network?.down || 0, maximumFractionDigits: 1 })} ↑ ${t("common.byterate", { value: data.network?.up || 0, maximumFractionDigits: 1 })}`}
          highlightValue={netTotal}
        />
        <Block
          label="komari.network_up"
          value={t("common.byterate", { value: data.network?.up || 0, maximumFractionDigits: 1 })}
          highlightValue={data.network?.up}
        />
        <Block
          label="komari.network_down"
          value={t("common.byterate", { value: data.network?.down || 0, maximumFractionDigits: 1 })}
          highlightValue={data.network?.down}
        />
        <Block label="komari.uptime" value={t("common.duration", { value: data.uptime })} />
      </Container>
    );
  }

  return (
    <Container service={service}>
      <Block label="komari.nodes" value={t("common.number", { value: data.total })} />
      <Block label="komari.online" value={`${data.online} / ${data.total}`} />
      <Block label="komari.offline" value={t("common.number", { value: data.offline })} />
      <Block label="komari.cores" value={t("common.number", { value: data.totalCores })} />
      <Block label="komari.memory" value={t("common.bytes", { value: data.totalMem, binary: true })} />
      <Block label="komari.disk" value={t("common.bytes", { value: data.totalDisk, binary: true })} />
    </Container>
  );
}
