import komariProxyHandler from "./proxy";

const widget = {
  api: "{url}/api/{endpoint}",
  proxyHandler: komariProxyHandler,

  mappings: {
    stats: {
      endpoint: "nodes",
    },
    nodes: {
      endpoint: "nodes",
    },
  },
};

export default widget;
