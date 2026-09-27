import { Connector } from "../connectors.types.js";

export interface IConnector {

    connect(): Promise<void>;

    disconnect(): Promise<void>;

    getData(): Promise<any>;

    getStatus(): Connector;

}