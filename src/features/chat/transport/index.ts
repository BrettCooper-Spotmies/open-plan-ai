import { SupabaseChatTransport } from './SupabaseChatTransport';
import type { IChatTransport } from './IChatTransport';

// Change this one line to swap transport providers
export const chatTransport: IChatTransport = new SupabaseChatTransport();
