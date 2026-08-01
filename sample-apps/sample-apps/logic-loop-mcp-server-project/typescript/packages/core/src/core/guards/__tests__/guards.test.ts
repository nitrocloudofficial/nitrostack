import { jest, describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { UseGuards, getGuardsMetadata } from '../use-guards.decorator';
import { ExecutionContext } from '../../types';
import { Guard } from '../guard.interface';

describe('Guards Module', () => {

    describe('@UseGuards Decorator', () => {
        it('should register guards metadata', () => {
            class MockGuard implements Guard {
                canActivate(context: ExecutionContext): boolean | Promise<boolean> {
                    return true;
                }
            }

            class TestController {
                @UseGuards(MockGuard)
                testMethod() { }
            }

            const metadata = getGuardsMetadata(TestController.prototype, 'testMethod');
            expect(metadata).toEqual([MockGuard]);
        });

        it('should register multiple guards', () => {
            class Guard1 implements Guard { canActivate() { return true; } }
            class Guard2 implements Guard { canActivate() { return true; } }

            class TestController {
                @UseGuards(Guard1, Guard2)
                method() { }
            }

            const metadata = getGuardsMetadata(TestController.prototype, 'method');
            expect(metadata).toHaveLength(2);
            expect(metadata).toEqual([Guard1, Guard2]);
        });
    });
});
