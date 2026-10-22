const controllers = new Map<string, AbortController>();

export function registerController(messageId: string): AbortController {
  const controller = new AbortController();
  controllers.set(messageId, controller);
  return controller;
}

export function releaseController(messageId: string): void {
  controllers.delete(messageId);
}

export function stopAllGenerations(): void {
  for (const c of controllers.values()) c.abort();
  controllers.clear();
}

export function hasActiveGeneration(): boolean {
  return controllers.size > 0;
}
