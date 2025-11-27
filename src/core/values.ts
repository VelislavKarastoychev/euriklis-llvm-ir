/**
 * Represents a value that can be used as an operand in LLVM IR
 */
export abstract class Value {
  abstract toString(): string;
}

/**
 * Represents a local SSA value (gets % prefix)
 */
export class LocalValue extends Value {
  constructor(private name: string) {
    super();
  }

  toString(): string {
    return `%${this.name}`;
  }

  getName(): string {
    return this.name;
  }
}

/**
 * Represents a constant value (no prefix)
 */
export class ConstantValue extends Value {
  constructor(private value: string | number) {
    super();
  }

  toString(): string {
    return String(this.value);
  }
}

/**
 * Represents a global value (gets @ prefix)
 */
export class GlobalValue extends Value {
  constructor(private name: string) {
    super();
  }

  toString(): string {
    return `@${this.name}`;
  }

  getName(): string {
    return this.name;
  }
}

/**
 * Helper function to create a local value reference
 */
export function local(name: string): LocalValue {
  return new LocalValue(name);
}

/**
 * Helper function to create a constant value
 */
export function constant(value: string | number): ConstantValue {
  return new ConstantValue(value);
}

/**
 * Helper function to create a global value reference
 */
export function global(name: string): GlobalValue {
  return new GlobalValue(name);
}
