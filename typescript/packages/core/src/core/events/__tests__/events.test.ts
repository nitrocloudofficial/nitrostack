import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import 'reflect-metadata';
import { EventEmitter } from '../event-emitter.js';
import { OnEvent } from '../event.decorator.js';

describe('Events Module', () => {
    describe('EventEmitter', () => {
        let eventEmitter: EventEmitter;

        beforeEach(() => {
            eventEmitter = EventEmitter.getInstance();
            eventEmitter.removeAllListeners();
        });

        afterEach(() => {
            eventEmitter.removeAllListeners();
        });

        it('should be a singleton', () => {
            const instance1 = EventEmitter.getInstance();
            const instance2 = EventEmitter.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should emit and listen to events', () => {
            const callback = jest.fn() as any;
            eventEmitter.on('test-event', callback);

            eventEmitter.emit('test-event', { data: 'test' });

            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should handle multiple listeners', () => {
            const callback1 = jest.fn() as any;
            const callback2 = jest.fn() as any;

            eventEmitter.on('multi-event', callback1);
            eventEmitter.on('multi-event', callback2);

            eventEmitter.emit('multi-event', 'payload');

            expect(callback1).toHaveBeenCalledWith('payload');
            expect(callback2).toHaveBeenCalledWith('payload');
        });

        it('should remove listener with off()', () => {
            const callback = jest.fn() as any;
            eventEmitter.on('removable-event', callback);

            eventEmitter.emit('removable-event', 'first');
            expect(callback).toHaveBeenCalledTimes(1);

            eventEmitter.off('removable-event', callback);
            eventEmitter.emit('removable-event', 'second');
            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should handle off() for non-existent event', () => {
            const callback = jest.fn() as any;
            // Should not throw
            eventEmitter.off('non-existent', callback);
        });

        it('should handle off() for non-existent listener', () => {
            const callback1 = jest.fn() as any;
            const callback2 = jest.fn() as any;

            eventEmitter.on('some-event', callback1);
            // Should not throw
            eventEmitter.off('some-event', callback2);

            // Original listener should still work
            eventEmitter.emit('some-event', 'test');
            expect(callback1).toHaveBeenCalled();
        });

        it('should support once() for one-time listeners', async () => {
            const callback = jest.fn() as any;
            eventEmitter.once('once-event', callback);

            await eventEmitter.emit('once-event', 'first');
            await eventEmitter.emit('once-event', 'second');

            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('first');
        });

        it('should emit synchronously with emitSync()', () => {
            const callback = jest.fn() as any;
            eventEmitter.on('sync-event', callback);

            eventEmitter.emitSync('sync-event', 'sync-payload');

            expect(callback).toHaveBeenCalledWith('sync-payload');
        });

        it('should removeAllListeners for specific event', () => {
            const callback1 = jest.fn() as any;
            const callback2 = jest.fn() as any;

            eventEmitter.on('event1', callback1);
            eventEmitter.on('event2', callback2);

            eventEmitter.removeAllListeners('event1');

            eventEmitter.emit('event1', 'test1');
            eventEmitter.emit('event2', 'test2');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalledWith('test2');
        });

        it('should removeAllListeners for all events', () => {
            const callback1 = jest.fn() as any;
            const callback2 = jest.fn() as any;

            eventEmitter.on('event1', callback1);
            eventEmitter.on('event2', callback2);

            eventEmitter.removeAllListeners();

            eventEmitter.emit('event1', 'test1');
            eventEmitter.emit('event2', 'test2');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).not.toHaveBeenCalled();
        });

        it('should return listenerCount', () => {
            const callback1 = jest.fn() as any;
            const callback2 = jest.fn() as any;

            expect(eventEmitter.listenerCount('count-event')).toBe(0);

            eventEmitter.on('count-event', callback1);
            expect(eventEmitter.listenerCount('count-event')).toBe(1);

            eventEmitter.on('count-event', callback2);
            expect(eventEmitter.listenerCount('count-event')).toBe(2);
        });

        it('should return eventNames', () => {
            const callback = jest.fn() as any;

            eventEmitter.on('event-a', callback);
            eventEmitter.on('event-b', callback);
            eventEmitter.on('event-c', callback);

            const names = eventEmitter.eventNames();
            expect(names).toContain('event-a');
            expect(names).toContain('event-b');
            expect(names).toContain('event-c');
            expect(names).toHaveLength(3);
        });

        it('should handle emit with no listeners', async () => {
            // Should not throw
            await eventEmitter.emit('no-listeners', 'data');
        });

        it('should handle emitSync with no listeners', () => {
            // Should not throw
            eventEmitter.emitSync('no-listeners-sync', 'data');
        });
    });

    describe('@OnEvent Decorator', () => {
        it('should register event listener metadata', () => {
            const callback = jest.fn();

            class TestListener {
                @OnEvent('decorator-event')
                handleEvent(payload: any) {
                    callback(payload);
                }
            }

            const instance = new TestListener();
            const key = 'nitrostack:event_handler';
            const metadata = Reflect.getMetadata(key, instance.constructor);
            expect(metadata).toEqual([{ event: 'decorator-event', methodName: 'handleEvent' }]);
        });

        it('should register multiple event handlers', () => {
            class MultiHandler {
                @OnEvent('event-one')
                handleOne(payload: any) { }

                @OnEvent('event-two')
                handleTwo(payload: any) { }
            }

            const key = 'nitrostack:event_handler';
            const metadata = Reflect.getMetadata(key, MultiHandler);
            expect(metadata).toHaveLength(2);
            expect(metadata).toContainEqual({ event: 'event-one', methodName: 'handleOne' });
            expect(metadata).toContainEqual({ event: 'event-two', methodName: 'handleTwo' });
        });
    });
});
