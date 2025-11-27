"use strict";
// Core LLVM IR node classes
export {
  LLVMNode,
  LLVMValue,
  Module,
  GlobalVariable,
  LLVMFunction,
  Parameter,
  BasicBlock,
  type IInstruction,
  type ParameterOptions,
  type LLVMFunctionOptions,
} from "./module";

// Type system
export {
  LLVMType,
  VoidType,
  IntType,
  FloatType,
  PointerType,
  ArrayType,
  VectorType,
  StructType,
  FunctionType,
  // Type constants
  i1,
  i8,
  i16,
  i32,
  i64,
  i128,
  half,
  float,
  double,
  voidType,
  ptr,
} from "./types";

// Instruction classes with object-based constructors
export {
  Instruction,
  Terminator,
  RetInst,
  BrInst,
  AllocaInst,
  StoreInst,
  LoadInst,
  BinaryInst,
  ICmpInst,
  FCmpInst,
  CallInst,
  GetElementPtrInst,
  PhiInst,
  SelectInst,
  SwitchInst,
  BitCastInst,
  TruncInst,
  ZExtInst,
  SExtInst,
  FPTruncInst,
  FPExtInst,
  InsertElementInst,
  ExtractElementInst,
  ShuffleVectorInst,
  AtomicRMWInst,
  AtomicCmpXchgInst,
  FenceInst,
  // Opcodes and predicates
  BinaryOpcodes,
  ICmpPredicates,
  FCmpPredicates,
  AtomicOrdering,
  AtomicRMWOp,
  // Types for options
  type RetInstOptions,
  type BrInstOptions,
  type AllocaInstOptions,
  type StoreInstOptions,
  type LoadInstOptions,
  type BinaryInstOptions,
  type ICmpInstOptions,
  type FCmpInstOptions,
  type CallInstOptions,
  type GetElementPtrInstOptions,
  type PhiInstOptions,
  type SelectInstOptions,
  type SwitchInstOptions,
  type BitCastInstOptions,
  type TruncInstOptions,
  type ZExtInstOptions,
  type SExtInstOptions,
  type FPTruncInstOptions,
  type FPExtInstOptions,
  type InsertElementInstOptions,
  type ExtractElementInstOptions,
  type ShuffleVectorInstOptions,
  type AtomicRMWInstOptions,
  type AtomicCmpXchgInstOptions,
  type FenceInstOptions,
  type BinaryOpcode,
  type ICmpPredicate,
  type FCmpPredicate,
  type AtomicOrderingType,
  type AtomicRMWOpType,
} from "./instructions";

// Value system (automatic % handling)
export {
  Value,
  LocalValue,
  ConstantValue,
  GlobalValue,
  local,
  constant,
  global,
} from "./values";

// Code generator
export { LLVMCodegen } from "./codegen";

// Validation
export {
  Validator,
  ValidationError,
  ValidationWarning,
  type ValidationResult,
} from "./validation";
