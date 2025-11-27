import { Module } from "./module";
import * as Types from "./types";
import { BinaryOpcodes, ICmpPredicates, FCmpPredicates } from "./instructions";

/**
 * Base LLVM code generator with target-specific configuration
 */
export class LLVMCodegen {
  protected targetTriple: string;
  protected dataLayout: string;
  protected module: Module;

  // Static type constants for IntelliSense
  static readonly types = {
    void: Types.voidType,
    i1: Types.i1,
    i8: Types.i8,
    i16: Types.i16,
    i32: Types.i32,
    i64: Types.i64,
    i128: Types.i128,
    half: Types.half,
    float: Types.float,
    double: Types.double,
    ptr: Types.ptr,
  };

  // Static opcode constants for IntelliSense
  static readonly opcodes = BinaryOpcodes;
  static readonly predicates = ICmpPredicates;
  static readonly fcmpPredicates = FCmpPredicates;

  constructor(moduleName: string) {
    // Default to x86_64 Linux target
    this.targetTriple = "x86_64-unknown-linux-gnu";
    this.dataLayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128";
    this.module = new Module(moduleName);
  }

  /**
   * Get the module being generated
   */
  getModule(): Module {
    return this.module;
  }

  /**
   * Get the target triple
   */
  getTargetTriple(): string {
    return this.targetTriple;
  }

  /**
   * Get the data layout string
   */
  getDataLayout(): string {
    return this.dataLayout;
  }

  /**
   * Generate complete LLVM IR with target configuration
   */
  toString(): string {
    let output = `; ModuleID = '${this.module.getModuleName()}'\n`;
    output += `source_filename = "${this.module.getModuleName()}"\n`;
    output += `target datalayout = "${this.dataLayout}"\n`;
    output += `target triple = "${this.targetTriple}"\n\n`;

    // Add module contents (globals and functions)
    const moduleContent = this.module.getChildren()
      .map(child => child.toString())
      .join('\n\n');

    if (moduleContent) {
      output += moduleContent + '\n';
    }

    return output;
  }
}
