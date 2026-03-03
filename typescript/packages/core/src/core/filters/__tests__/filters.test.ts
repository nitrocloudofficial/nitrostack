import { jest, describe, it, expect } from '@jest/globals';
import 'reflect-metadata';
import { UseFilters, getExceptionFilterMetadata } from '../exception-filter.decorator';
import { ExceptionFilterInterface } from '../exception-filter.interface';

// Verify what was actually exported
// The previous view showed:
// export const EXCEPTION_FILTERS_METADATA = Symbol('filters:exception');
// export function UseFilters(...filters: ExceptionFilterConstructor[]) ...
// export function getExceptionFiltersMetadata(target: object, methodName: string): ExceptionFilterConstructor[] ...

// And interface:
// export interface ExceptionFilter<T = any> { catch(exception: T, host: ArgumentsHost): void; }

// Wait, the lint said "Module ... has no exported member 'ExceptionFilter'".
// Maybe I missed something in view_file 384 output? No output was shown for view_file there?
// Ah, I viewed file 387 in step 387 but didn't see content?
// In Step 387/388/389 I listed dir and wrote file. I didn't actually READ the filter interface file content in the prompt history I have.
// I requested view_file in step 401 (this step).
// I will see the content NOW. So I should wait for output before replace?
// But I can guess or try to start pipe test.
// Actually I am in step 401 generation. I can't read the file yet.
// I will blindly assume I need to read first.

// Oh wait, I am generating 401. I requested view_file.
// I can't do replace_file_content immediately if I rely on that info.
// But I can queue it if I am confident.
// I'll wait.


describe('Filters Module', () => {
    describe('@UseFilters Decorator', () => {
        it('should register filters metadata', () => {
            class MockFilter implements ExceptionFilterInterface {
                catch(exception: unknown, host: any) { }
            }

            class TestController {
                @UseFilters(MockFilter)
                method() { }
            }

            const metadata = getExceptionFilterMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([MockFilter]);
        });

        it('should register multiple filters', () => {
            class Filter1 implements ExceptionFilterInterface { catch() { } }
            class Filter2 implements ExceptionFilterInterface { catch() { } }

            class TestController {
                @UseFilters(Filter1, Filter2)
                method() { }
            }

            const metadata = getExceptionFilterMetadata(TestController.prototype, 'method');
            expect(metadata).toEqual([Filter1, Filter2]);
        });
    });
});
