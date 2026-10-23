const controllers = new Map<string, { controller: AbortController; sessionId: string }>();

export function registerController(messageId: string, sessionId: string): AbortController {
  const controller = new AbortController();
  controllers.set(messageId, { controller, sessionId });
  return controller;
}

export function releaseController(messageId: string): void {
  controllers.delete(messageId);
}

export function stopAllGenerations(sessionId?: string): void {
  for (const entry of controllers.values()) {
    if (!sessionId || entry.sessionId === sessionId) entry.controller.abort();
  }
}

export function hasActiveGeneration(): boolean {
  return controllers.size > 0;
}
