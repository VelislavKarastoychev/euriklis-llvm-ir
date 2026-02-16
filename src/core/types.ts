import { LLVMNode } from "./module";

/**
 * Base class for all LLVM types
 */
export abstract class LLVMType extends LLVMNode {
  abstract toString(): string;
}

/**
 * Void type
 */
export class VoidType extends LLVMType {
  toString(): string {
    return "void";
  }
}

/**
 * Integer type (i1, i8, i16, i32, i64, i128, etc.)
 */
export class IntType extends LLVMType {
  private bitWidth: number;

  constructor(bitWidth: TSInteger) {
    super();
    // check if the bitWidth is really an integer:
    if (!Number.isInteger(bitWidth) || bitWidth <= 0) {
      throw new Error(`Bit width must be a positive integer, got ${bitWidth}.`);
    }

    this.bitWidth = bitWidth;
  }

  getBitWidth(): number {
    return this.bitWidth;
  }

  toString(): string {
    return `i${this.bitWidth}`;
  }
}

/**
 * Floating point type (half, float, double, fp128, etc.)
 */
export class FloatType extends LLVMType {
  private kind:
    | "half"
    | "float"
    | "double"
    | "fp128"
    | "x86_fp80"
    | "ppc_fp128";

  constructor(
    kind: "half" | "float" | "double" | "fp128" | "x86_fp80" | "ppc_fp128",
  ) {
    super();
    this.kind = kind;
  }

  toString(): string {
    return this.kind;
  }
}

/**
 * Pointer type (ptr or typed pointers in older LLVM)
 */
export class PointerType extends LLVMType {
  private pointeeType?: LLVMType;
  private addressSpace: number;

  constructor(addressSpace: number = 0, pointeeType?: LLVMType) {
    super();
    this.addressSpace = addressSpace;
    this.pointeeType = pointeeType;
  }

  toString(): string {
    // Modern LLVM uses opaque pointers (just "ptr")
    if (!this.pointeeType) {
      return this.addressSpace === 0
        ? "ptr"
        : `ptr addrspace(${this.addressSpace})`;
    }
    // Legacy typed pointers
    return this.addressSpace === 0
      ? `${this.pointeeType.toString()}*`
      : `${this.pointeeType.toString()} addrspace(${this.addressSpace})*`;
  }
}

/**
 * Array type [N x ElementType]
 */
export class ArrayType extends LLVMType {
  private elementType: LLVMType;
  private numElements: number;

  constructor(elementType: LLVMType, numElements: number) {
    super();
    this.elementType = elementType;
    this.numElements = numElements;
  }

  toString(): string {
    return `[${this.numElements} x ${this.elementType.toString()}]`;
  }
}

/**
 * Vector type <N x ElementType>
 */
export class VectorType extends LLVMType {
  private elementType: LLVMType;
  private numElements: number;
  private scalable: boolean;

  constructor(
    elementType: LLVMType,
    numElements: number,
    scalable: boolean = false,
  ) {
    super();
    this.elementType = elementType;
    this.numElements = numElements;
    this.scalable = scalable;
  }

  toString(): string {
    const prefix = this.scalable ? "vscale x " : "";
    return `<${prefix}${this.numElements} x ${this.elementType.toString()}>`;
  }
}

/**
 * Structure type { type1, type2, ... }
 */
export class StructType extends LLVMType {
  private elementTypes: LLVMType[];
  private packed: boolean;
  private name?: string;

  constructor(
    elementTypes: LLVMType[],
    packed: boolean = false,
    name?: string,
  ) {
    super();
    this.elementTypes = elementTypes;
    this.packed = packed;
    this.name = name;
  }

  toString(): string {
    if (this.name) {
      return `%${this.name}`;
    }

    const types = this.elementTypes.map((t) => t.toString()).join(", ");
    if (this.packed) {
      return `<{ ${types} }>`;
    }
    return `{ ${types} }`;
  }
}

/**
 * Function type: ReturnType (ParamType1, ParamType2, ...)
 */
export class FunctionType extends LLVMType {
  private returnType: LLVMType;
  private paramTypes: LLVMType[];
  private isVarArg: boolean;

  constructor(
    returnType: LLVMType,
    paramTypes: LLVMType[],
    isVarArg: boolean = false,
  ) {
    super();
    this.returnType = returnType;
    this.paramTypes = paramTypes;
    this.isVarArg = isVarArg;
  }

  toString(): string {
    const params = this.paramTypes.map((t) => t.toString()).join(", ");
    const vararg = this.isVarArg ? ", ..." : "";
    return `${this.returnType.toString()} (${params}${vararg})`;
  }
}

// Common type constants for convenience
export const i1 = new IntType(1);
export const i8 = new IntType(8);
export const i16 = new IntType(16);
export const i32 = new IntType(32);
export const i64 = new IntType(64);
export const i128 = new IntType(128);

export const half = new FloatType("half");
export const float = new FloatType("float");
export const double = new FloatType("double");

export const voidType = new VoidType();
export const ptr = new PointerType();
// not a type but just note that the type
// number has to be integer (simulation of int type in ts)
export type TSInteger = number;
