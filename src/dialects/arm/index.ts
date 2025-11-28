import { LLVMCodegen } from "../../core/codegen";

/**
 * ARM/AArch64 code generator
 * Targets ARM processors (mobile, embedded, Apple Silicon)
 */
export class ARMCodegen extends LLVMCodegen {
  constructor(moduleName: string, is64bit: boolean = true) {
    super(moduleName);

    if (is64bit) {
      // AArch64 (ARM64) - Apple Silicon, AWS Graviton, etc.
      this.targetTriple = "aarch64-unknown-linux-gnu";
      this.dataLayout = "e-m:e-i8:8:32-i16:16:32-i64:64-i128:128-n32:64-S128";
    } else {
      // ARM32
      this.targetTriple = "armv7-unknown-linux-gnueabihf";
      this.dataLayout = "e-m:e-p:32:32-Fi8-i64:64-v128:64:128-a:0:32-n32-S64";
    }
  }
}
