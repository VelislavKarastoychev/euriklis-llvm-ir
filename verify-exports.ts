/**
 * Verify all package exports work correctly
 */

// Test main export
import { LLVMCodegen } from "@euriklis/llvm-ir";

// Test dialect exports
import { NVVMCodegen } from "@euriklis/llvm-ir/dialects/nvptx";
import { AMDGPUCodegen } from "@euriklis/llvm-ir/dialects/amdgpu";
import { SPIRVCodegen } from "@euriklis/llvm-ir/dialects/spirv";
import { ARMCodegen } from "@euriklis/llvm-ir/dialects/arm";
import { RISCVCodegen } from "@euriklis/llvm-ir/dialects/riscv";
import { WASMCodegen } from "@euriklis/llvm-ir/dialects/wasm";

console.log("✅ All imports successful!");

// Quick smoke test
const x86 = new LLVMCodegen("test");
const cuda = new NVVMCodegen("test");
const amd = new AMDGPUCodegen("test");
const spirv = new SPIRVCodegen("test");
const arm = new ARMCodegen("test");
const riscv = new RISCVCodegen("test");
const wasm = new WASMCodegen("test");

console.log("✅ All codegen classes instantiated successfully!");
console.log("\nTarget triples:");
console.log("  x86-64:      ", x86.targetTriple);
console.log("  CUDA:        ", cuda.targetTriple);
console.log("  AMD GPU:     ", amd.targetTriple);
console.log("  Intel GPU:   ", spirv.targetTriple);
console.log("  ARM/AArch64: ", arm.targetTriple);
console.log("  RISC-V:      ", riscv.targetTriple);
console.log("  WebAssembly: ", wasm.targetTriple);
