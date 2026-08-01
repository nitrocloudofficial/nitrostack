// Jest setup for widget tests

// Mock window object for SSR tests
if (typeof window === 'undefined') {
  global.window = undefined;
}

// Mock CustomEvent
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail;
  }
};


