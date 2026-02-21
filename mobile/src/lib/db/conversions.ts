export function toBoolean(val: number): boolean {
  return val !== 0;
}

export function fromBoolean(val: boolean): number {
  return val ? 1 : 0;
}
