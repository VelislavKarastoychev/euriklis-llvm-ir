import { LLVMCodegen } from "../../core/codegen";

/**
 * WebAssembly code generator
 * Targets browsers and WASI runtime
 */
export class WASMCodegen extends LLVMCodegen {
  constructor(moduleName: string, is64bit: boolean = false) {
    super(moduleName);

    if (is64bit) {
      // Wasm64 (experimental)
      this.targetTriple = "wasm64-unknown-unknown";
      this.dataLayout = "e-m:e-p:64:64-i64:64-n32:64-S128";
    } else {
      // Wasm32 (standard WebAssembly)
      this.targetTriple = "wasm32-unknown-unknown";
      this.dataLayout = "e-m:e-p:32:32-i64:64-n32:64-S128-ni:1:10:20";
    }
  }
}
