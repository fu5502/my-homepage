import fnosmusicProxyHandler from "./proxy";

const widget = {
  api: "{url}/{endpoint}",
  proxyHandler: fnosmusicProxyHandler,
  mappings: {
    unified: {
      endpoint: "unified",
    },
  },
};

export default widget;
