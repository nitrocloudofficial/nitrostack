import * as fs from "fs";
import * as path from "path";
import csv from "csv-parser";

export class StrategyResources {

    private static loadCSV(fileName: string): Promise<any[]> {

        return new Promise((resolve, reject) => {

            const results: any[] = [];

            const filePath = path.join(
                process.cwd(),
                "src",
                "data",
                fileName
            );

            fs.createReadStream(filePath)
                .pipe(csv())
                .on("data", (data) => results.push(data))
                .on("end", () => resolve(results))
                .on("error", reject);

        });

    }

    static async companies() {
        return await this.loadCSV("companies.csv");
    }

    static async sp500Companies() {
        return await this.loadCSV("sp500_companies.csv");
    }

    static async sp500Stocks() {
        return await this.loadCSV("sp500_stocks.csv");
    }

    static async sp500Index() {
        return await this.loadCSV("sp500_index.csv");
    }

    static async stockPrices() {
        return await this.loadCSV("t1_prices.csv");
    }

    static async balanceSheet() {
        return await this.loadCSV("Balance_Sheet_final.csv");
    }

    static async cashFlow() {
        return await this.loadCSV("cash_flow_statments_final.csv");
    }

    static async annualPL1() {
        return await this.loadCSV("Annual_P_L_1_final.csv");
    }

    static async annualPL2() {
        return await this.loadCSV("Annual_P_L_2_final.csv");
    }

    static async quarterlyPL1() {
        return await this.loadCSV("Quarter_P_L_1_final.csv");
    }

    static async quarterlyPL2() {
        return await this.loadCSV("Quarter_P_L_2_final.csv");
    }

    static async ratios1() {
        return await this.loadCSV("ratios_1_final.csv");
    }

    static async ratios2() {
        return await this.loadCSV("ratios_2_final.csv");
    }

    static async metrics() {
        return await this.loadCSV("other_metrics_final.csv");
    }

}