import { StrategyResources } from "./strategy.resources";

export class Investigator {

    async investigate(industry: string) {

        return {

            industry,

            companies: await StrategyResources.companies(),

            sp500Companies: await StrategyResources.sp500Companies(),

            sp500Stocks: await StrategyResources.sp500Stocks(),

            sp500Index: await StrategyResources.sp500Index(),

            stockPrices: await StrategyResources.stockPrices(),

            balanceSheet: await StrategyResources.balanceSheet(),

            cashFlow: await StrategyResources.cashFlow(),

            annualPL1: await StrategyResources.annualPL1(),

            annualPL2: await StrategyResources.annualPL2(),

            quarterlyPL1: await StrategyResources.quarterlyPL1(),

            quarterlyPL2: await StrategyResources.quarterlyPL2(),

            ratios1: await StrategyResources.ratios1(),

            ratios2: await StrategyResources.ratios2(),

            metrics: await StrategyResources.metrics()

        };

    }

}