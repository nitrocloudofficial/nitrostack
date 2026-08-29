// Shared TypeScript Types
export interface FactoryOSUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'supplier';
}
