import { ResourceDecorator as Resource } from "@nitrostack/core";

export class ExchangeResources {
  @Resource({
    uri: "exchange://fees",
    name: "Exchange Fee Schedule",
    description: "Taker and maker fee schedules for supported exchanges",
    mimeType: "application/json",
  })
  async getExchangeFees(uri: string) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              binance: { taker: 0.001, maker: 0.001 },
              coinbase: { taker: 0.006, maker: 0.004 },
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
