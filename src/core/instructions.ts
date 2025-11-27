import { LLVMValue, BasicBlock } from "./module";
import type { LLVMType } from "./types";
import { Value, LocalValue, ConstantValue, local, constant } from "./values";

/**
 * Base class for all instructions
 */
export abstract class Instruction extends LLVMValue {
  constructor(name: string = '') {
    super(name);
  }

  /**
   * Get a reference to this instruction's result value
   */
  getValueRef(): LocalValue {
    return new LocalValue(this.name);
  }
}

/**
 * Base class for terminator instructions (must be last in basic block)
 */
export abstract class Terminator extends Instruction {}

/**
 * Return instruction options
 */
export interface RetInstOptions {
  type?: LLVMType;
  value?: Value | Instruction | string | number;
}

/**
 * Return instruction
 */
export class RetInst extends Terminator {
  private type: LLVMType | null;
  private value: Value | null;

  constructor(options: RetInstOptions = {}) {
    super();
    this.type = options.type ?? null;

    // Convert value to Value object
    if (options.value === undefined || options.value === null) {
      this.value = null;
    } else if (options.value instanceof Instruction) {
      this.value = options.value.getValueRef();
    } else if (options.value instanceof Value) {
      this.value = options.value;
    } else if (typeof options.value === 'string') {
      // Auto-detect if it's a constant or local reference
      this.value = options.value.match(/^[0-9]/) ? constant(options.value) : local(options.value);
    } else {
      this.value = constant(options.value);
    }
  }

  toString(): string {
    if (this.type === null || this.value === null) {
      return 'ret void';
    }
    return `ret ${this.type.toString()} ${this.value.toString()}`;
  }
}

/**
 * Branch instruction options
 */
export interface BrInstOptions {
  target: BasicBlock;
  condition?: Value | Instruction | string;
  conditionType?: LLVMType;
  falseTarget?: BasicBlock;
}

/**
 * Branch instruction (conditional or unconditional)
 */
export class BrInst extends Terminator {
  private condition: Value | null;
  private conditionType: LLVMType | null;
  private trueBlock: BasicBlock;
  private falseBlock: BasicBlock | null;

  constructor(options: BrInstOptions) {
    super();
    this.trueBlock = options.target;
    this.conditionType = options.conditionType ?? null;
    this.falseBlock = options.falseTarget ?? null;

    // Convert condition to Value object
    if (options.condition === undefined || options.condition === null) {
      this.condition = null;
    } else if (options.condition instanceof Instruction) {
      this.condition = options.condition.getValueRef();
    } else if (options.condition instanceof Value) {
      this.condition = options.condition;
    } else {
      this.condition = local(options.condition);
    }
  }

  toString(): string {
    if (this.condition === null) {
      return `br label %${this.trueBlock.getName()}`;
    }
    return `br ${this.conditionType!.toString()} ${this.condition.toString()}, label %${this.trueBlock.getName()}, label %${this.falseBlock!.getName()}`;
  }
}

/**
 * Alloca instruction options
 */
export interface AllocaInstOptions {
  name: string;
  type: LLVMType;
  align?: number;
  addrspace?: number;
}

/**
 * Alloca instruction - allocate stack memory
 * For CUDA shared memory, use addrspace(3)
 */
export class AllocaInst extends Instruction {
  private allocType: LLVMType;
  private align?: number;
  private addrspace?: number;

  constructor(options: AllocaInstOptions) {
    super(options.name);
    this.allocType = options.type;
    this.align = options.align;
    this.addrspace = options.addrspace;
  }

  toString(): string {
    const alignStr = this.align ? `, align ${this.align}` : '';
    const addrspaceStr = this.addrspace !== undefined ? `, addrspace(${this.addrspace})` : '';
    return `%${this.name} = alloca ${this.allocType.toString()}${alignStr}${addrspaceStr}`;
  }
}

/**
 * Store instruction options
 */
export interface StoreInstOptions {
  valueType: LLVMType;
  value: Value | Instruction | string | number;
  pointerType: LLVMType;
  pointer: Value | Instruction | string;
  align?: number;
}

/**
 * Store instruction - store to memory
 */
export class StoreInst extends Instruction {
  private valueType: LLVMType;
  private value: Value;
  private pointerType: LLVMType;
  private pointer: Value;
  private align?: number;

  constructor(options: StoreInstOptions) {
    super();
    this.valueType = options.valueType;
    this.value = StoreInst.convertToValue(options.value);
    this.pointerType = options.pointerType;
    this.pointer = StoreInst.convertToValue(options.pointer);
    this.align = options.align;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    const alignStr = this.align ? `, align ${this.align}` : '';
    return `store ${this.valueType.toString()} ${this.value.toString()}, ${this.pointerType.toString()} ${this.pointer.toString()}${alignStr}`;
  }
}

/**
 * Load instruction options
 */
export interface LoadInstOptions {
  name: string;
  type: LLVMType;
  pointerType: LLVMType;
  pointer: Value | Instruction | string;
  align?: number;
}

/**
 * Load instruction - load from memory
 */
export class LoadInst extends Instruction {
  private loadType: LLVMType;
  private pointerType: LLVMType;
  private pointer: Value;
  private align?: number;

  constructor(options: LoadInstOptions) {
    super(options.name);
    this.loadType = options.type;
    this.pointerType = options.pointerType;
    this.pointer = LoadInst.convertToValue(options.pointer);
    this.align = options.align;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    const alignStr = this.align ? `, align ${this.align}` : '';
    return `%${this.name} = load ${this.loadType.toString()}, ${this.pointerType.toString()} ${this.pointer.toString()}${alignStr}`;
  }
}

/**
 * Binary operation opcodes
 */
export const BinaryOpcodes = {
  // Integer arithmetic
  add: "add",
  sub: "sub",
  mul: "mul",
  udiv: "udiv",
  sdiv: "sdiv",
  urem: "urem",
  srem: "srem",

  // Floating point arithmetic
  fadd: "fadd",
  fsub: "fsub",
  fmul: "fmul",
  fdiv: "fdiv",
  frem: "frem",

  // Bitwise operations
  shl: "shl",
  lshr: "lshr",
  ashr: "ashr",
  and: "and",
  or: "or",
  xor: "xor",
} as const;

export type BinaryOpcode = typeof BinaryOpcodes[keyof typeof BinaryOpcodes];

/**
 * Binary instruction options
 */
export interface BinaryInstOptions {
  name: string;
  opcode: BinaryOpcode;
  type: LLVMType;
  lhs: Value | Instruction | string | number;
  rhs: Value | Instruction | string | number;
}

/**
 * Binary operation instruction (add, sub, mul, etc.)
 */
export class BinaryInst extends Instruction {
  private opcode: BinaryOpcode;
  private type: LLVMType;
  private lhs: Value;
  private rhs: Value;

  constructor(options: BinaryInstOptions) {
    super(options.name);
    this.opcode = options.opcode;
    this.type = options.type;
    this.lhs = BinaryInst.convertToValue(options.lhs);
    this.rhs = BinaryInst.convertToValue(options.rhs);
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      // Auto-detect if it's a constant or local reference
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = ${this.opcode} ${this.type.toString()} ${this.lhs.toString()}, ${this.rhs.toString()}`;
  }
}

/**
 * Integer comparison predicates
 */
export const ICmpPredicates = {
  eq: "eq",   // equal
  ne: "ne",   // not equal
  ugt: "ugt", // unsigned greater than
  uge: "uge", // unsigned greater or equal
  ult: "ult", // unsigned less than
  ule: "ule", // unsigned less or equal
  sgt: "sgt", // signed greater than
  sge: "sge", // signed greater or equal
  slt: "slt", // signed less than
  sle: "sle", // signed less or equal
} as const;

export type ICmpPredicate = typeof ICmpPredicates[keyof typeof ICmpPredicates];

/**
 * Floating-point comparison predicates
 */
export const FCmpPredicates = {
  false: "false", // always false
  oeq: "oeq",     // ordered and equal
  ogt: "ogt",     // ordered and greater than
  oge: "oge",     // ordered and greater or equal
  olt: "olt",     // ordered and less than
  ole: "ole",     // ordered and less or equal
  one: "one",     // ordered and not equal
  ord: "ord",     // ordered (no NaNs)
  ueq: "ueq",     // unordered or equal
  ugt: "ugt",     // unordered or greater than
  uge: "uge",     // unordered or greater or equal
  ult: "ult",     // unordered or less than
  ule: "ule",     // unordered or less or equal
  une: "une",     // unordered or not equal
  uno: "uno",     // unordered (either NaN)
  true: "true",   // always true
} as const;

export type FCmpPredicate = typeof FCmpPredicates[keyof typeof FCmpPredicates];

/**
 * Integer comparison instruction options
 */
export interface ICmpInstOptions {
  name: string;
  predicate: ICmpPredicate;
  type: LLVMType;
  lhs: Value | Instruction | string | number;
  rhs: Value | Instruction | string | number;
}

/**
 * Integer comparison instruction
 */
export class ICmpInst extends Instruction {
  private predicate: ICmpPredicate;
  private type: LLVMType;
  private lhs: Value;
  private rhs: Value;

  constructor(options: ICmpInstOptions) {
    super(options.name);
    this.predicate = options.predicate;
    this.type = options.type;
    this.lhs = ICmpInst.convertToValue(options.lhs);
    this.rhs = ICmpInst.convertToValue(options.rhs);
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = icmp ${this.predicate} ${this.type.toString()} ${this.lhs.toString()}, ${this.rhs.toString()}`;
  }
}

/**
 * Floating-point comparison instruction options
 */
export interface FCmpInstOptions {
  name: string;
  predicate: FCmpPredicate;
  type: LLVMType;
  lhs: Value | Instruction | string | number;
  rhs: Value | Instruction | string | number;
}

/**
 * Floating-point comparison instruction
 */
export class FCmpInst extends Instruction {
  private predicate: FCmpPredicate;
  private type: LLVMType;
  private lhs: Value;
  private rhs: Value;

  constructor(options: FCmpInstOptions) {
    super(options.name);
    this.predicate = options.predicate;
    this.type = options.type;
    this.lhs = this.convertToValue(options.lhs);
    this.rhs = this.convertToValue(options.rhs);
  }

  private convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      // For float types, ensure numeric constants have decimal notation
      const typeStr = this.type.toString();
      if (typeStr === 'float' || typeStr === 'double' || typeStr === 'half') {
        const str = String(operand);
        // Add .0 if the number doesn't already have a decimal point or exponent
        if (!str.includes('.') && !str.includes('e') && !str.includes('E')) {
          return constant(str + '.0');
        }
      }
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = fcmp ${this.predicate} ${this.type.toString()} ${this.lhs.toString()}, ${this.rhs.toString()}`;
  }
}

/**
 * Call instruction options
 */
export interface CallInstOptions {
  name?: string;
  returnType: LLVMType;
  functionName: string;
  args?: Array<{ type: LLVMType; value: Value | Instruction | string | number }>;
}

/**
 * Call instruction - call a function
 */
export class CallInst extends Instruction {
  private returnType: LLVMType;
  private functionName: string;
  private args: Array<{ type: LLVMType; value: Value }>;

  constructor(options: CallInstOptions) {
    super(options.name ?? '');
    this.returnType = options.returnType;
    this.functionName = options.functionName;
    this.args = (options.args ?? []).map(arg => ({
      type: arg.type,
      value: CallInst.convertToValue(arg.value)
    }));
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    const argsStr = this.args
      .map(arg => `${arg.type.toString()} ${arg.value.toString()}`)
      .join(', ');

    const resultPrefix = this.name ? `%${this.name} = ` : '';
    return `${resultPrefix}call ${this.returnType.toString()} @${this.functionName}(${argsStr})`;
  }
}

/**
 * GetElementPtr (GEP) instruction options
 */
export interface GetElementPtrInstOptions {
  name: string;
  baseType: LLVMType;
  ptrType: LLVMType;
  pointer: Value | Instruction | string;
  indices: Array<{ type: LLVMType; value: Value | Instruction | string | number }>;
  inbounds?: boolean;
}

/**
 * GetElementPtr instruction - calculate pointer offsets
 * Essential for array/struct indexing
 */
export class GetElementPtrInst extends Instruction {
  private baseType: LLVMType;
  private ptrType: LLVMType;
  private pointer: Value;
  private indices: Array<{ type: LLVMType; value: Value }>;
  private inbounds: boolean;

  constructor(options: GetElementPtrInstOptions) {
    super(options.name);
    this.baseType = options.baseType;
    this.ptrType = options.ptrType;
    this.pointer = GetElementPtrInst.convertToValue(options.pointer);
    this.indices = options.indices.map(idx => ({
      type: idx.type,
      value: GetElementPtrInst.convertToValue(idx.value)
    }));
    this.inbounds = options.inbounds ?? true;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    const inboundsStr = this.inbounds ? ' inbounds' : '';
    const indicesStr = this.indices
      .map(idx => `${idx.type.toString()} ${idx.value.toString()}`)
      .join(', ');

    return `%${this.name} = getelementptr${inboundsStr} ${this.baseType.toString()}, ${this.ptrType.toString()} ${this.pointer.toString()}, ${indicesStr}`;
  }
}

/**
 * Phi instruction options
 */
export interface PhiInstOptions {
  name: string;
  type: LLVMType;
  incomingValues: Array<{
    value: Value | Instruction | string | number;
    block: BasicBlock | string;
  }>;
}

/**
 * Phi instruction - SSA form for merging values from different control flow paths
 * Critical for loops and conditional execution
 */
export class PhiInst extends Instruction {
  private type: LLVMType;
  private incomingValues: Array<{ value: Value; block: string }>;

  constructor(options: PhiInstOptions) {
    super(options.name);
    this.type = options.type;
    this.incomingValues = options.incomingValues.map(incoming => ({
      value: PhiInst.convertToValue(incoming.value),
      block: typeof incoming.block === 'string' ? incoming.block : incoming.block.getName()
    }));
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    const incoming = this.incomingValues
      .map(iv => `[ ${iv.value.toString()}, %${iv.block} ]`)
      .join(', ');
    return `%${this.name} = phi ${this.type.toString()} ${incoming}`;
  }
}

/**
 * Select instruction options
 */
export interface SelectInstOptions {
  name: string;
  conditionType: LLVMType;
  condition: Value | Instruction | string | number;
  type: LLVMType;
  trueValue: Value | Instruction | string | number;
  falseValue: Value | Instruction | string | number;
}

/**
 * Select instruction - conditional value selection (ternary operator)
 * result = condition ? trueValue : falseValue
 */
export class SelectInst extends Instruction {
  private conditionType: LLVMType;
  private condition: Value;
  private type: LLVMType;
  private trueValue: Value;
  private falseValue: Value;

  constructor(options: SelectInstOptions) {
    super(options.name);
    this.conditionType = options.conditionType;
    this.condition = SelectInst.convertToValue(options.condition);
    this.type = options.type;
    this.trueValue = SelectInst.convertToValue(options.trueValue);
    this.falseValue = SelectInst.convertToValue(options.falseValue);
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = select ${this.conditionType.toString()} ${this.condition.toString()}, ${this.type.toString()} ${this.trueValue.toString()}, ${this.type.toString()} ${this.falseValue.toString()}`;
  }
}

/**
 * Switch instruction options
 */
export interface SwitchInstOptions {
  valueType: LLVMType;
  value: Value | Instruction | string | number;
  defaultTarget: BasicBlock | string;
  cases: Array<{
    value: number;
    target: BasicBlock | string;
  }>;
}

/**
 * Switch instruction - multi-way branching
 */
export class SwitchInst extends Terminator {
  private valueType: LLVMType;
  private value: Value;
  private defaultTarget: string;
  private cases: Array<{ value: number; target: string }>;

  constructor(options: SwitchInstOptions) {
    super();
    this.valueType = options.valueType;
    this.value = SwitchInst.convertToValue(options.value);
    this.defaultTarget = typeof options.defaultTarget === 'string'
      ? options.defaultTarget
      : options.defaultTarget.getName();
    this.cases = options.cases.map(c => ({
      value: c.value,
      target: typeof c.target === 'string' ? c.target : c.target.getName()
    }));
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    const casesStr = this.cases
      .map(c => `    ${this.valueType.toString()} ${c.value}, label %${c.target}`)
      .join('\n');
    return `switch ${this.valueType.toString()} ${this.value.toString()}, label %${this.defaultTarget} [\n${casesStr}\n  ]`;
  }
}

/**
 * BitCast instruction options
 */
export interface BitCastInstOptions {
  name: string;
  sourceType: LLVMType;
  value: Value | Instruction | string | number;
  targetType: LLVMType;
}

/**
 * BitCast instruction - type conversion without changing bits
 */
export class BitCastInst extends Instruction {
  private sourceType: LLVMType;
  private value: Value;
  private targetType: LLVMType;

  constructor(options: BitCastInstOptions) {
    super(options.name);
    this.sourceType = options.sourceType;
    this.value = BitCastInst.convertToValue(options.value);
    this.targetType = options.targetType;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = bitcast ${this.sourceType.toString()} ${this.value.toString()} to ${this.targetType.toString()}`;
  }
}

/**
 * Trunc instruction options
 */
export interface TruncInstOptions {
  name: string;
  sourceType: LLVMType;
  value: Value | Instruction | string | number;
  targetType: LLVMType;
}

/**
 * Trunc instruction - truncate integer to smaller type
 */
export class TruncInst extends Instruction {
  private sourceType: LLVMType;
  private value: Value;
  private targetType: LLVMType;

  constructor(options: TruncInstOptions) {
    super(options.name);
    this.sourceType = options.sourceType;
    this.value = TruncInst.convertToValue(options.value);
    this.targetType = options.targetType;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = trunc ${this.sourceType.toString()} ${this.value.toString()} to ${this.targetType.toString()}`;
  }
}

/**
 * ZExt instruction options
 */
export interface ZExtInstOptions {
  name: string;
  sourceType: LLVMType;
  value: Value | Instruction | string | number;
  targetType: LLVMType;
}

/**
 * ZExt instruction - zero-extend integer to larger type
 */
export class ZExtInst extends Instruction {
  private sourceType: LLVMType;
  private value: Value;
  private targetType: LLVMType;

  constructor(options: ZExtInstOptions) {
    super(options.name);
    this.sourceType = options.sourceType;
    this.value = ZExtInst.convertToValue(options.value);
    this.targetType = options.targetType;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = zext ${this.sourceType.toString()} ${this.value.toString()} to ${this.targetType.toString()}`;
  }
}

/**
 * SExt instruction options
 */
export interface SExtInstOptions {
  name: string;
  sourceType: LLVMType;
  value: Value | Instruction | string | number;
  targetType: LLVMType;
}

/**
 * SExt instruction - sign-extend integer to larger type
 */
export class SExtInst extends Instruction {
  private sourceType: LLVMType;
  private value: Value;
  private targetType: LLVMType;

  constructor(options: SExtInstOptions) {
    super(options.name);
    this.sourceType = options.sourceType;
    this.value = SExtInst.convertToValue(options.value);
    this.targetType = options.targetType;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = sext ${this.sourceType.toString()} ${this.value.toString()} to ${this.targetType.toString()}`;
  }
}

/**
 * FPTrunc instruction options
 */
export interface FPTruncInstOptions {
  name: string;
  sourceType: LLVMType;
  value: Value | Instruction | string | number;
  targetType: LLVMType;
}

/**
 * FPTrunc instruction - truncate float to smaller precision
 */
export class FPTruncInst extends Instruction {
  private sourceType: LLVMType;
  private value: Value;
  private targetType: LLVMType;

  constructor(options: FPTruncInstOptions) {
    super(options.name);
    this.sourceType = options.sourceType;
    this.value = FPTruncInst.convertToValue(options.value);
    this.targetType = options.targetType;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = fptrunc ${this.sourceType.toString()} ${this.value.toString()} to ${this.targetType.toString()}`;
  }
}

/**
 * FPExt instruction options
 */
export interface FPExtInstOptions {
  name: string;
  sourceType: LLVMType;
  value: Value | Instruction | string | number;
  targetType: LLVMType;
}

/**
 * FPExt instruction - extend float to higher precision
 */
export class FPExtInst extends Instruction {
  private sourceType: LLVMType;
  private value: Value;
  private targetType: LLVMType;

  constructor(options: FPExtInstOptions) {
    super(options.name);
    this.sourceType = options.sourceType;
    this.value = FPExtInst.convertToValue(options.value);
    this.targetType = options.targetType;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = fpext ${this.sourceType.toString()} ${this.value.toString()} to ${this.targetType.toString()}`;
  }
}

/**
 * InsertElement instruction options
 */
export interface InsertElementInstOptions {
  name: string;
  vectorType: LLVMType;
  vector: Value | Instruction | string | number;
  elementType: LLVMType;
  element: Value | Instruction | string | number;
  indexType: LLVMType;
  index: Value | Instruction | string | number;
}

/**
 * InsertElement instruction - insert element into vector
 */
export class InsertElementInst extends Instruction {
  private vectorType: LLVMType;
  private vector: Value;
  private elementType: LLVMType;
  private element: Value;
  private indexType: LLVMType;
  private index: Value;

  constructor(options: InsertElementInstOptions) {
    super(options.name);
    this.vectorType = options.vectorType;
    this.vector = InsertElementInst.convertToValue(options.vector);
    this.elementType = options.elementType;
    this.element = InsertElementInst.convertToValue(options.element);
    this.indexType = options.indexType;
    this.index = InsertElementInst.convertToValue(options.index);
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = insertelement ${this.vectorType.toString()} ${this.vector.toString()}, ${this.elementType.toString()} ${this.element.toString()}, ${this.indexType.toString()} ${this.index.toString()}`;
  }
}

/**
 * ExtractElement instruction options
 */
export interface ExtractElementInstOptions {
  name: string;
  vectorType: LLVMType;
  vector: Value | Instruction | string | number;
  indexType: LLVMType;
  index: Value | Instruction | string | number;
}

/**
 * ExtractElement instruction - extract element from vector
 */
export class ExtractElementInst extends Instruction {
  private vectorType: LLVMType;
  private vector: Value;
  private indexType: LLVMType;
  private index: Value;

  constructor(options: ExtractElementInstOptions) {
    super(options.name);
    this.vectorType = options.vectorType;
    this.vector = ExtractElementInst.convertToValue(options.vector);
    this.indexType = options.indexType;
    this.index = ExtractElementInst.convertToValue(options.index);
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = extractelement ${this.vectorType.toString()} ${this.vector.toString()}, ${this.indexType.toString()} ${this.index.toString()}`;
  }
}

/**
 * ShuffleVector instruction options
 */
export interface ShuffleVectorInstOptions {
  name: string;
  vectorType: LLVMType;
  vector1: Value | Instruction | string | number;
  vector2: Value | Instruction | string | number;
  maskType: LLVMType;
  mask: Value | Instruction | string | number;
}

/**
 * ShuffleVector instruction - shuffle two vectors using mask
 */
export class ShuffleVectorInst extends Instruction {
  private vectorType: LLVMType;
  private vector1: Value;
  private vector2: Value;
  private maskType: LLVMType;
  private mask: Value;

  constructor(options: ShuffleVectorInstOptions) {
    super(options.name);
    this.vectorType = options.vectorType;
    this.vector1 = ShuffleVectorInst.convertToValue(options.vector1);
    this.vector2 = ShuffleVectorInst.convertToValue(options.vector2);
    this.maskType = options.maskType;
    this.mask = ShuffleVectorInst.convertToValue(options.mask);
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = shufflevector ${this.vectorType.toString()} ${this.vector1.toString()}, ${this.vectorType.toString()} ${this.vector2.toString()}, ${this.maskType.toString()} ${this.mask.toString()}`;
  }
}

/**
 * Atomic ordering options
 */
export const AtomicOrdering = {
  unordered: "unordered",
  monotonic: "monotonic",
  acquire: "acquire",
  release: "release",
  acq_rel: "acq_rel",
  seq_cst: "seq_cst",
} as const;

export type AtomicOrderingType = typeof AtomicOrdering[keyof typeof AtomicOrdering];

/**
 * Atomic RMW operations
 */
export const AtomicRMWOp = {
  xchg: "xchg",
  add: "add",
  sub: "sub",
  and: "and",
  nand: "nand",
  or: "or",
  xor: "xor",
  max: "max",
  min: "min",
  umax: "umax",
  umin: "umin",
} as const;

export type AtomicRMWOpType = typeof AtomicRMWOp[keyof typeof AtomicRMWOp];

/**
 * AtomicRMW instruction options
 */
export interface AtomicRMWInstOptions {
  name: string;
  operation: AtomicRMWOpType;
  pointerType: LLVMType;
  pointer: Value | Instruction | string;
  valueType: LLVMType;
  value: Value | Instruction | string | number;
  ordering: AtomicOrderingType;
}

/**
 * AtomicRMW instruction - atomic read-modify-write
 */
export class AtomicRMWInst extends Instruction {
  private operation: AtomicRMWOpType;
  private pointerType: LLVMType;
  private pointer: Value;
  private valueType: LLVMType;
  private value: Value;
  private ordering: AtomicOrderingType;

  constructor(options: AtomicRMWInstOptions) {
    super(options.name);
    this.operation = options.operation;
    this.pointerType = options.pointerType;
    this.pointer = AtomicRMWInst.convertToValue(options.pointer);
    this.valueType = options.valueType;
    this.value = AtomicRMWInst.convertToValue(options.value);
    this.ordering = options.ordering;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = atomicrmw ${this.operation} ${this.pointerType.toString()} ${this.pointer.toString()}, ${this.valueType.toString()} ${this.value.toString()} ${this.ordering}`;
  }
}

/**
 * AtomicCmpXchg instruction options
 */
export interface AtomicCmpXchgInstOptions {
  name: string;
  pointerType: LLVMType;
  pointer: Value | Instruction | string;
  valueType: LLVMType;
  cmp: Value | Instruction | string | number;
  new: Value | Instruction | string | number;
  successOrdering: AtomicOrderingType;
  failureOrdering: AtomicOrderingType;
}

/**
 * AtomicCmpXchg instruction - atomic compare and exchange
 */
export class AtomicCmpXchgInst extends Instruction {
  private pointerType: LLVMType;
  private pointer: Value;
  private valueType: LLVMType;
  private cmp: Value;
  private new: Value;
  private successOrdering: AtomicOrderingType;
  private failureOrdering: AtomicOrderingType;

  constructor(options: AtomicCmpXchgInstOptions) {
    super(options.name);
    this.pointerType = options.pointerType;
    this.pointer = AtomicCmpXchgInst.convertToValue(options.pointer);
    this.valueType = options.valueType;
    this.cmp = AtomicCmpXchgInst.convertToValue(options.cmp);
    this.new = AtomicCmpXchgInst.convertToValue(options.new);
    this.successOrdering = options.successOrdering;
    this.failureOrdering = options.failureOrdering;
  }

  private static convertToValue(operand: Value | Instruction | string | number): Value {
    if (operand instanceof Instruction) {
      return operand.getValueRef();
    } else if (operand instanceof Value) {
      return operand;
    } else if (typeof operand === 'string') {
      return operand.match(/^[0-9]/) ? constant(operand) : local(operand);
    } else {
      return constant(operand);
    }
  }

  toString(): string {
    return `%${this.name} = cmpxchg ${this.pointerType.toString()} ${this.pointer.toString()}, ${this.valueType.toString()} ${this.cmp.toString()}, ${this.valueType.toString()} ${this.new.toString()} ${this.successOrdering} ${this.failureOrdering}`;
  }
}

/**
 * Fence instruction options
 */
export interface FenceInstOptions {
  ordering: AtomicOrderingType;
}

/**
 * Fence instruction - memory ordering constraint
 */
export class FenceInst extends Instruction {
  private ordering: AtomicOrderingType;

  constructor(options: FenceInstOptions) {
    super();
    this.ordering = options.ordering;
  }

  toString(): string {
    return `fence ${this.ordering}`;
  }
}
