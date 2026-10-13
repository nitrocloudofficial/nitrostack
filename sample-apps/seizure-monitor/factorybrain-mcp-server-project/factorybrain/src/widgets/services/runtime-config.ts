const gatewayUrl = process.env.NEXT_PUBLIC_FACTORYBRAIN_GATEWAY_URL?.replace(/\/$/, '');
const websocketUrl = process.env.NEXT_PUBLIC_FACTORYBRAIN_WEBSOCKET_URL;

export const widgetRuntimeConfig = {
  gatewayUrl: gatewayUrl || (typeof location === 'undefined' ? '' : location.origin),
  websocketUrl: websocketUrl || (() => {
    if (typeof location === 'undefined') return '';
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${location.host}`;
  })(),
};
