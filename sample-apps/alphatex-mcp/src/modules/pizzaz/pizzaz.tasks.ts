/**
 * Pizzaz Task Tools
 *
 * Demonstrates the MCP Tasks feature — long-running, async tool execution
 * with progress reporting and cancellation support.
 *
 * To test via MCP Inspector (or any MCP client that supports tasks):
 *
 *   tools/call  name="audit_pizza_shops"  task={}
 *   → returns { task: { taskId, status: "working", ... } }
 *
 *   tasks/get   taskId=<id>
 *   → returns current status & progress message
 *
 *   tasks/result  taskId=<id>
 *   → blocks until done, then returns the full audit report
 *
 *   tasks/cancel  taskId=<id>
 *   → cancels the running audit
 */

import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { PizzazService } from './pizzaz.service.js';

// ─── Input Schemas ─────────────────────────────────────────────────────────

const AuditSchema = z.object({
    /** Number of shops to audit. Defaults to all shops. */
    maxShops: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum number of pizza shops to audit (default: all)'),
    /** Simulate a slow audit by adding a delay per shop in ms. */
    delayPerShopMs: z
        .number()
        .int()
        .min(0)
        .max(5000)
        .optional()
        .default(800)
        .describe('Simulated processing time per shop in milliseconds (default: 800ms)'),
});

const OrderPizzaSchema = z.object({
    shopId: z.string().describe('ID of the pizza shop to order from'),
    pizzaName: z.string().describe('Name of the pizza to order'),
    quantity: z.number().int().min(1).max(10).default(1).describe('Number of pizzas to order'),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Score a shop 0–100 based on rating and review count */
function scoreShop(shop: { rating: number; reviews: number; openNow: boolean }): number {
    const ratingScore = (shop.rating / 5) * 60;       // 60% weight
    const reviewScore = Math.min(shop.reviews / 500, 1) * 30; // 30% weight
    const openBonus = shop.openNow ? 10 : 0;           // 10% bonus
    return Math.round(ratingScore + reviewScore + openBonus);
}

function grade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    return 'D';
}

// ─── Task Tools Controller ───────────────────────────────────────────────────

@Injectable({ deps: [PizzazService] })
export class PizzazTaskTools {
    constructor(private readonly pizzazService: PizzazService) { }

    /**
     * audit_pizza_shops
     *
     * A long-running tool that audits every pizza shop in the database.
     * It processes each shop one-by-one (with a configurable delay) so you
     * can watch the progress messages update via tasks/get, then fetch the
     * full report via tasks/result.
     *
     * taskSupport: 'optional' — works normally (sync) OR as a task.
     * When invoked without `task: {}`, returns the audit immediately.
     * When invoked with `task: {}`, returns a task handle immediately and
     * runs the audit in the background.
     */
    @Tool({
        name: 'audit_pizza_shops',
        description:
            'Runs a quality audit across all pizza shops. ' +
            'This is a long-running operation — use task augmentation to run it asynchronously. ' +
            'Pass `task: {}` in your tools/call request to get a task handle, ' +
            'then poll with tasks/get and retrieve the report with tasks/result.',
        inputSchema: AuditSchema,
        taskSupport: 'optional',
        examples: {
            request: { maxShops: 3, delayPerShopMs: 0 },
            response: {
                summary: {
                    totalAudited: 3,
                    averageScore: 82,
                    topShop: 'Bella Napoli',
                    completedAt: '2025-01-01T00:00:00.000Z',
                },
                results: [
                    {
                        shopId: 'bella-napoli',
                        shopName: 'Bella Napoli',
                        score: 92,
                        grade: 'A+',
                        notes: 'Exceptional rating and review volume. Currently open.',
                    },
                ],
            },
        },
    })
    async auditPizzaShops(
        args: z.infer<typeof AuditSchema>,
        ctx: ExecutionContext,
    ) {
        const allShops = this.pizzazService.getAllShops();
        const shops = args.maxShops ? allShops.slice(0, args.maxShops) : allShops;
        const delayMs = args.delayPerShopMs ?? 800;

        ctx.logger.info('Starting pizza shop audit', {
            totalShops: shops.length,
            delayPerShopMs: delayMs,
            isTask: !!ctx.task,
        });

        const results: Array<{
            shopId: string;
            shopName: string;
            score: number;
            grade: string;
            notes: string;
        }> = [];

        for (let i = 0; i < shops.length; i++) {
            const shop = shops[i];

            // ── Cooperative cancellation check ──────────────────────────────
            // If the client called tasks/cancel, we stop gracefully here
            // instead of wasting time completing the rest of the audit.
            if (ctx.task) {
                ctx.task.throwIfCancelled();
                ctx.task.updateProgress(
                    `🔍 Auditing "${shop.name}" (${i + 1}/${shops.length})…`,
                );
            }

            // Simulate I/O-bound work (DB queries, external API calls, etc.)
            await sleep(delayMs);

            // Check again after the async work — client may have cancelled
            if (ctx.task?.isCancelled) {
                ctx.task.throwIfCancelled();
            }

            const score = scoreShop(shop);
            const shopGrade = grade(score);

            const notes: string[] = [];
            if (score >= 90) notes.push('Exceptional rating and review volume.');
            if (!shop.openNow) notes.push('Currently closed — may affect customer reach.');
            if (shop.rating >= 4.7) notes.push('One of the highest-rated shops.');
            if (shop.reviews < 100) notes.push('Low review count — still building reputation.');

            results.push({
                shopId: shop.id,
                shopName: shop.name,
                score,
                grade: shopGrade,
                notes: notes.join(' ') || 'Solid performer.',
            });

            ctx.logger.info(`Audited ${shop.name}: score=${score} (${shopGrade})`);
        }

        // Final progress update before completing
        if (ctx.task) {
            ctx.task.updateProgress(`✅ Audit complete! Compiling report for ${results.length} shops…`);
        }

        const averageScore =
            results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
                : 0;

        const topShop = results.sort((a, b) => b.score - a.score)[0];

        return {
            summary: {
                totalAudited: results.length,
                averageScore,
                topShop: topShop?.shopName ?? 'N/A',
                completedAt: new Date().toISOString(),
            },
            results,
        };
    }

    /**
     * order_pizza
     *
     * A task-REQUIRED tool — it MUST always be called with task: {} because
     * orders involve payment processing and confirmation steps that take time.
     * This demonstrates the 'required' task support level.
     *
     * Invoke: tools/call  name="order_pizza"  task={}
     *   arguments: { shopId: "bella-napoli", pizzaName: "Margherita", quantity: 2 }
     */
    @Tool({
        name: 'order_pizza',
        description:
            'Places an order at a pizza shop. This tool REQUIRES task augmentation — ' +
            'you must pass `task: {}` in your tools/call request. ' +
            'Poll with tasks/get and retrieve your order confirmation via tasks/result.',
        inputSchema: OrderPizzaSchema,
        taskSupport: 'required',
        examples: {
            request: { shopId: 'bella-napoli', pizzaName: 'Margherita', quantity: 1 },
            response: {
                orderId: 'ORD-12345',
                status: 'confirmed',
                estimatedMinutes: 30,
                total: '$18.00',
                items: [{ name: 'Margherita', quantity: 1, price: '$18.00' }],
            },
        },
    })
    async orderPizza(
        args: z.infer<typeof OrderPizzaSchema>,
        ctx: ExecutionContext,
    ) {
        const shop = this.pizzazService.getShopById(args.shopId);
        if (!shop) {
            throw new Error(`Pizza shop not found: ${args.shopId}`);
        }

        ctx.logger.info('Processing pizza order', {
            shopId: args.shopId,
            pizza: args.pizzaName,
            quantity: args.quantity,
        });

        // Step 1 — validate stock
        ctx.task?.updateProgress(`🛒 Checking availability of "${args.pizzaName}" at ${shop.name}…`);
        await sleep(600);
        ctx.task?.throwIfCancelled();

        // Step 2 — process payment
        ctx.task?.updateProgress(`💳 Processing payment…`);
        await sleep(1000);
        ctx.task?.throwIfCancelled();

        // Step 3 — confirm with kitchen
        ctx.task?.updateProgress(`🍕 Confirming order with kitchen…`);
        await sleep(700);
        ctx.task?.throwIfCancelled();

        // Step 4 — dispatch
        ctx.task?.updateProgress(`🚴 Order dispatched! Generating confirmation…`);
        await sleep(300);

        const pricePerPizza = shop.priceLevel * 9;
        const total = pricePerPizza * args.quantity;

        ctx.logger.info('Order confirmed', { shopId: args.shopId, total });

        return {
            orderId: `ORD-${Date.now().toString(36).toUpperCase()}`,
            status: 'confirmed',
            shop: shop.name,
            estimatedMinutes: 25 + Math.floor(Math.random() * 15),
            total: `$${total.toFixed(2)}`,
            items: [
                {
                    name: args.pizzaName,
                    quantity: args.quantity,
                    price: `$${(pricePerPizza * args.quantity).toFixed(2)}`,
                },
            ],
            placedAt: new Date().toISOString(),
        };
    }
}
