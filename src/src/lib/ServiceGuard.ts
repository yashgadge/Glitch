/**
 * Runtime guard for executing service methods safely in React components.
 * Prevents "TypeError: is not a function" crashes if the underlying service
 * is missing a method implementation.
 */
export const executeServiceMethod = async <T = any>(
  service: any,
  methodName: string,
  args: any[] = [],
  fallbackValue?: any
): Promise<T> => {
  if (!service) {
    console.error(`[ServiceGuard] Service is undefined when calling ${methodName}.`);
    return fallbackValue as T;
  }
  
  if (typeof service[methodName] !== 'function') {
    const serviceName = service.name || service.constructor?.name || 'UnknownService';
    console.error(
      `[ServiceGuard] Missing Service Method: ${serviceName}.${methodName}\n` +
      `Component tried to call a method that does not exist or was renamed.`
    );
    return fallbackValue as T;
  }

  try {
    return await service[methodName](...args);
  } catch (error) {
    console.error(`[ServiceGuard] Execution error in ${methodName}:`, error);
    throw error; // Re-throw to let caller handle it, as the method did exist.
  }
};

/**
 * Sync version for subscriptions
 */
export const executeSyncServiceMethod = <T = any>(
  service: any,
  methodName: string,
  args: any[] = [],
  fallbackValue?: any
): T => {
  if (!service) {
    console.error(`[ServiceGuard] Service is undefined when calling ${methodName}.`);
    return fallbackValue as T;
  }

  if (typeof service[methodName] !== 'function') {
    const serviceName = service.name || service.constructor?.name || 'UnknownService';
    console.error(
      `[ServiceGuard] Missing Service Method: ${serviceName}.${methodName}`
    );
    return fallbackValue as T;
  }

  try {
    return service[methodName](...args);
  } catch (error) {
    console.error(`[ServiceGuard] Execution error in ${methodName}:`, error);
    throw error;
  }
};
