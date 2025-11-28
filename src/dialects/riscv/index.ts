import { LLVMCodegen } from "../../core/codegen";

/**
 * RISC-V code generator
 * Targets RISC-V processors (open-source ISA)
 */
export class RISCVCodegen extends LLVMCodegen {
  constructor(moduleName: string, is64bit: boolean = true) {
    super(moduleName);

    if (is64bit) {
      // RV64 (64-bit RISC-V)
      this.targetTriple = "riscv64-unknown-linux-gnu";
      this.dataLayout = "e-m:e-p:64:64-i64:64-i128:128-n32:64-S128";
    } else {
      // RV32 (32-bit RISC-V)
      this.targetTriple = "riscv32-unknown-linux-gnu";
      this.dataLayout = "e-m:e-p:32:32-i64:64-n32-S128";
    }
  }
}
