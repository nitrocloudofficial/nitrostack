import { Logger } from "../utils/logger.js";

export class BaseService {
  protected log(message: string): void {
    Logger.info(message);
  }

  protected warn(message: string): void {
    Logger.warn(message);
  }

  protected error(message: string): void {
    Logger.error(message);
  }
}