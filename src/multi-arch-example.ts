import { LLVMCodegen } from "./core/codegen";
import { ARMCodegen } from "./dialects/arm";
import { RISCVCodegen } from "./dialects/riscv";
import { WASMCodegen } from "./dialects/wasm";
import { LLVMFunction, Parameter, BasicBlock, BinaryInst, RetInst } from "./core";

/**
 * Demonstrate that the SAME code works across ALL architectures
 * Only the target triple changes!
 */

function createAddFunction(codegen: LLVMCodegen) {
  const addFunc = new LLVMFunction({
    name: "add",
    returnType: LLVMCodegen.types.i32
  });

  addFunc.addParameter(new Parameter({ type: LLVMCodegen.types.i32, name: "a" }));
  addFunc.addParameter(new Parameter({ type: LLVMCodegen.types.i32, name: "b" }));

  const entry = new BasicBlock("entry");
  entry.addInstruction(new BinaryInst({
    name: "result",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: "a",
    rhs: "b"
  }));
  entry.setTerminator(new RetInst({
    type: LLVMCodegen.types.i32,
    value: "result"
  }));

  addFunc.addBasicBlock(entry);
  codegen.getModule().addFunction(addFunc);

  return codegen.toString();
}

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║   SAME CODE → MULTIPLE ARCHITECTURES                     ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

// x86-64 (Intel/AMD CPUs)
console.log("=== x86-64 (Intel/AMD) ===");
const x86 = new LLVMCodegen("add_x86");
console.log(createAddFunction(x86).split('\n').slice(0, 4).join('\n'));
console.log();

// ARM64 (Apple Silicon, AWS Graviton)
console.log("=== ARM64 (Apple Silicon, AWS Graviton) ===");
const arm = new ARMCodegen("add_arm");
console.log(createAddFunction(arm).split('\n').slice(0, 4).join('\n'));
console.log();

// RISC-V (Open-source ISA)
console.log("=== RISC-V (Open ISA) ===");
const riscv = new RISCVCodegen("add_riscv");
console.log(createAddFunction(riscv).split('\n').slice(0, 4).join('\n'));
console.log();

// WebAssembly (Browser/WASI)
console.log("=== WebAssembly (Browser) ===");
const wasm = new WASMCodegen("add_wasm");
console.log(createAddFunction(wasm).split('\n').slice(0, 4).join('\n'));
console.log();

console.log("✓ Same TypeScript code generates IR for ALL architectures!");
console.log("✓ LLVM's llc compiler handles the rest (IR → machine code)");
