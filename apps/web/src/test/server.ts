import { setupServer } from 'msw/node';
import handlers from './handlers';

/**
 * 🔱 Archon Test Infrastructure: MSW Server Initialization
 * Implementation: Silicon Valley High-Fidelity Mocking
 */
const server = setupServer(...handlers);

export default server;
