import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { Order, OrderSchema, MealFeedback, MealFeedbackSchema } from '../../domain/types.js';

const USERS_DIR = path.resolve(process.cwd(), 'data', 'users');

export class HistoryRepository {
  public getByUserId(userId: string): { orders: Order[], feedbacks: MealFeedback[] } {
    const filePath = path.join(USERS_DIR, userId, 'history.json');
    if (!fs.existsSync(filePath)) {
      return { orders: [], feedbacks: [] };
    }
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return {
      orders: rawData.orders.map((item: any) => OrderSchema.parse(item)),
      feedbacks: rawData.feedbacks.map((item: any) => MealFeedbackSchema.parse(item))
    };
  }
}
