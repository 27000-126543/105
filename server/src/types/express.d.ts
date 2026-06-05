import { User as AppUser } from '@shared/types';

declare global {
  namespace Express {
    interface User extends AppUser {}
  }
}

export {};
