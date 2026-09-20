export function guardValue<T>(value: T | undefined | null, name: string): T {
  if (value === undefined || value === null) {
    console.error(`Firestore guard: ${name} is ${value}`);
    throw new Error(`Invalid Firestore argument: ${name}`);
  }
  
  if (typeof value === 'function') {
    console.error(`Firestore guard: ${name} is a function`);
    throw new Error(`Invalid Firestore argument: ${name} cannot be a function`);
  }
  
  return value as T;
}
