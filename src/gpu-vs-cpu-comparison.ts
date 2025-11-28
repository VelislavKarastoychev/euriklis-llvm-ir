import { NVVMCodegen } from "./dialects/nvptx";
import { WASMCodegen } from "./dialects/wasm";
import { LLVMFunction, Parameter, BasicBlock, BinaryInst, ICmpInst, BrInst, LoadInst, StoreInst, GetElementPtrInst, RetInst, PhiInst, FloatType } from "./core";

/**
 * SAME ALGORITHM, DIFFERENT IMPLEMENTATIONS
 *
 * Task: Add two arrays element-wise
 *
 * GPU: Each thread processes ONE element (no loop)
 * CPU: One thread processes ALL elements (with loop)
 */

console.log("╔════════════════════════════════════════════════════════════════╗");
console.log("║        GPU vs CPU: Same Algorithm, Different Code             ║");
console.log("╚════════════════════════════════════════════════════════════════╝\n");

// ============================================================
// GPU VERSION (NVIDIA CUDA)
// ============================================================

const cudaCodegen = new NVVMCodegen("vector_add_cuda");
const cudaModule = cudaCodegen.getModule();
const floatType = new FloatType("float");

const cudaKernel = new LLVMFunction({
  name: "vectorAddGPU",
  returnType: NVVMCodegen.types.void
});

cudaKernel.addParameter(new Parameter({ type: NVVMCodegen.types.ptr, name: "a" }));
cudaKernel.addParameter(new Parameter({ type: NVVMCodegen.types.ptr, name: "b" }));
cudaKernel.addParameter(new Parameter({ type: NVVMCodegen.types.ptr, name: "result" }));
cudaKernel.addParameter(new Parameter({ type: NVVMCodegen.types.i32, name: "n" }));

const cudaEntry = new BasicBlock("entry");
const cudaCompute = new BasicBlock("compute");
const cudaExit = new BasicBlock("exit");

// GPU: Get thread ID (automatic parallelism!)
const tidx = NVVMCodegen.cuda.threadIdxX("tid.x");
const bidx = NVVMCodegen.cuda.blockIdxX("bid.x");
const bdim = NVVMCodegen.cuda.blockDimX("bdim.x");
cudaEntry.addInstruction(tidx);
cudaEntry.addInstruction(bidx);
cudaEntry.addInstruction(bdim);

const offset = new BinaryInst({
  name: "offset",
  opcode: NVVMCodegen.opcodes.mul,
  type: NVVMCodegen.types.i32,
  lhs: bidx,
  rhs: bdim
});
cudaEntry.addInstruction(offset);

const idx = new BinaryInst({
  name: "idx",
  opcode: NVVMCodegen.opcodes.add,
  type: NVVMCodegen.types.i32,
  lhs: offset,
  rhs: tidx
});
cudaEntry.addInstruction(idx);

// GPU: Bounds check
const cudaCmp = new ICmpInst({
  name: "in_bounds",
  predicate: NVVMCodegen.predicates.slt,
  type: NVVMCodegen.types.i32,
  lhs: idx,
  rhs: "n"
});
cudaEntry.addInstruction(cudaCmp);

cudaEntry.setTerminator(new BrInst({
  condition: cudaCmp,
  conditionType: NVVMCodegen.types.i1,
  target: cudaCompute,
  falseTarget: cudaExit
}));

// GPU: Process ONE element (no loop!)
const cudaPtrA = new GetElementPtrInst({
  name: "ptr_a",
  baseType: floatType,
  ptrType: NVVMCodegen.types.ptr,
  pointer: "a",
  indices: [{ type: NVVMCodegen.types.i32, value: idx }]
});
cudaCompute.addInstruction(cudaPtrA);

const cudaValA = new LoadInst({
  name: "val_a",
  type: floatType,
  pointerType: NVVMCodegen.types.ptr,
  pointer: cudaPtrA,
  align: 4
});
cudaCompute.addInstruction(cudaValA);

const cudaPtrB = new GetElementPtrInst({
  name: "ptr_b",
  baseType: floatType,
  ptrType: NVVMCodegen.types.ptr,
  pointer: "b",
  indices: [{ type: NVVMCodegen.types.i32, value: idx }]
});
cudaCompute.addInstruction(cudaPtrB);

const cudaValB = new LoadInst({
  name: "val_b",
  type: floatType,
  pointerType: NVVMCodegen.types.ptr,
  pointer: cudaPtrB,
  align: 4
});
cudaCompute.addInstruction(cudaValB);

const cudaSum = new BinaryInst({
  name: "sum",
  opcode: NVVMCodegen.opcodes.fadd,
  type: floatType,
  lhs: cudaValA,
  rhs: cudaValB
});
cudaCompute.addInstruction(cudaSum);

const cudaPtrResult = new GetElementPtrInst({
  name: "ptr_result",
  baseType: floatType,
  ptrType: NVVMCodegen.types.ptr,
  pointer: "result",
  indices: [{ type: NVVMCodegen.types.i32, value: idx }]
});
cudaCompute.addInstruction(cudaPtrResult);

const cudaStore = new StoreInst({
  valueType: floatType,
  value: cudaSum,
  pointerType: NVVMCodegen.types.ptr,
  pointer: cudaPtrResult,
  align: 4
});
cudaCompute.addInstruction(cudaStore);

cudaCompute.setTerminator(new BrInst({ target: cudaExit }));
cudaExit.setTerminator(new RetInst({}));

cudaKernel.addBasicBlock(cudaEntry);
cudaKernel.addBasicBlock(cudaCompute);
cudaKernel.addBasicBlock(cudaExit);
cudaModule.addFunction(cudaKernel);

// ============================================================
// CPU/WebAssembly VERSION
// ============================================================

const wasmCodegen = new WASMCodegen("vector_add_wasm");
const wasmModule = wasmCodegen.getModule();

const wasmFunc = new LLVMFunction({
  name: "vectorAddCPU",
  returnType: WASMCodegen.types.void
});

wasmFunc.addParameter(new Parameter({ type: WASMCodegen.types.ptr, name: "a" }));
wasmFunc.addParameter(new Parameter({ type: WASMCodegen.types.ptr, name: "b" }));
wasmFunc.addParameter(new Parameter({ type: WASMCodegen.types.ptr, name: "result" }));
wasmFunc.addParameter(new Parameter({ type: WASMCodegen.types.i32, name: "n" }));

const wasmEntry = new BasicBlock("entry");
const wasmLoop = new BasicBlock("loop");
const wasmBody = new BasicBlock("loop_body");
const wasmExit = new BasicBlock("loop_exit");

wasmEntry.setTerminator(new BrInst({ target: wasmLoop }));

// CPU: Loop counter (processes ALL elements)
const i = new PhiInst({
  name: "i",
  type: WASMCodegen.types.i32,
  incomingValues: [
    { value: 0, block: wasmEntry },
    { value: "i_next", block: wasmBody }
  ]
});
wasmLoop.addInstruction(i);

const wasmCmp = new ICmpInst({
  name: "cmp",
  predicate: WASMCodegen.predicates.slt,
  type: WASMCodegen.types.i32,
  lhs: i,
  rhs: "n"
});
wasmLoop.addInstruction(wasmCmp);

wasmLoop.setTerminator(new BrInst({
  condition: wasmCmp,
  conditionType: WASMCodegen.types.i1,
  target: wasmBody,
  falseTarget: wasmExit
}));

// CPU: Process element i
const wasmPtrA = new GetElementPtrInst({
  name: "ptr_a",
  baseType: floatType,
  ptrType: WASMCodegen.types.ptr,
  pointer: "a",
  indices: [{ type: WASMCodegen.types.i32, value: i }]
});
wasmBody.addInstruction(wasmPtrA);

const wasmValA = new LoadInst({
  name: "val_a",
  type: floatType,
  pointerType: WASMCodegen.types.ptr,
  pointer: wasmPtrA,
  align: 4
});
wasmBody.addInstruction(wasmValA);

const wasmPtrB = new GetElementPtrInst({
  name: "ptr_b",
  baseType: floatType,
  ptrType: WASMCodegen.types.ptr,
  pointer: "b",
  indices: [{ type: WASMCodegen.types.i32, value: i }]
});
wasmBody.addInstruction(wasmPtrB);

const wasmValB = new LoadInst({
  name: "val_b",
  type: floatType,
  pointerType: WASMCodegen.types.ptr,
  pointer: wasmPtrB,
  align: 4
});
wasmBody.addInstruction(wasmValB);

const wasmSum = new BinaryInst({
  name: "sum",
  opcode: WASMCodegen.opcodes.fadd,
  type: floatType,
  lhs: wasmValA,
  rhs: wasmValB
});
wasmBody.addInstruction(wasmSum);

const wasmPtrResult = new GetElementPtrInst({
  name: "ptr_result",
  baseType: floatType,
  ptrType: WASMCodegen.types.ptr,
  pointer: "result",
  indices: [{ type: WASMCodegen.types.i32, value: i }]
});
wasmBody.addInstruction(wasmPtrResult);

const wasmStore = new StoreInst({
  valueType: floatType,
  value: wasmSum,
  pointerType: WASMCodegen.types.ptr,
  pointer: wasmPtrResult,
  align: 4
});
wasmBody.addInstruction(wasmStore);

// CPU: Increment loop counter
const iNext = new BinaryInst({
  name: "i_next",
  opcode: WASMCodegen.opcodes.add,
  type: WASMCodegen.types.i32,
  lhs: i,
  rhs: 1
});
wasmBody.addInstruction(iNext);

wasmBody.setTerminator(new BrInst({ target: wasmLoop }));
wasmExit.setTerminator(new RetInst({}));

wasmFunc.addBasicBlock(wasmEntry);
wasmFunc.addBasicBlock(wasmLoop);
wasmFunc.addBasicBlock(wasmBody);
wasmFunc.addBasicBlock(wasmExit);
wasmModule.addFunction(wasmFunc);

// ============================================================
// COMPARISON
// ============================================================

console.log("═══ GPU VERSION (NVIDIA CUDA) ═══\n");
console.log("Key: Each thread processes ONE element");
console.log("     No loop - automatic parallelism!\n");
console.log(cudaCodegen.toString());
console.log("\n" + "=".repeat(70) + "\n");

console.log("═══ CPU/WebAssembly VERSION ═══\n");
console.log("Key: Sequential loop processes ALL elements");
console.log("     Manual iteration required\n");
console.log(wasmCodegen.toString());

console.log("\n" + "=".repeat(70));
console.log("\n📊 EXECUTION MODEL:\n");
console.log("GPU:  Launch 1024 threads → Each processes 1 element → Done in parallel");
console.log("CPU:  Launch 1 thread → Loops 1024 times → Done sequentially");
console.log("\n💡 KEY DIFFERENCE:");
console.log("GPU: threadIdx/blockIdx (automatic) → NO LOOP NEEDED");
console.log("CPU: for loop (manual) → EXPLICIT ITERATION");
