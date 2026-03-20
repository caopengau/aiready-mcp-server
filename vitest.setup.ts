import { vi } from 'vitest';

// Next's virtual `server-only` import is not available in the test environment.
// Mock it as a no-op so server-only imports don't fail in unit tests.
vi.mock('server-only', () => ({}));
