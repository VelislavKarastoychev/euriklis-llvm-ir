import { WASMCodegen } from "./dialects/wasm";
import { LLVMFunction, Parameter, BasicBlock, BinaryInst, ICmpInst, BrInst, LoadInst, StoreInst, GetElementPtrInst, RetInst, PhiInst, FloatType } from "./core";

/**
 * WebAssembly Vector Addition - Sequential Loop
 *
 * Unlike GPUs, WebAssembly uses LOOPS instead of thread parallelism
 * This is similar to regular CPU code
 */

const codegen = new WASMCodegen("vector_add_wasm");
const module = codegen.getModule();
const floatType = new FloatType("float");

// void vectorAdd(float* a, float* b, float* result, int n)
const addFunc = new LLVMFunction({
  name: "vectorAdd",
  returnType: WASMCodegen.types.void
});

addFunc.addParameter(new Parameter({ type: WASMCodegen.types.ptr, name: "a" }));
addFunc.addParameter(new Parameter({ type: WASMCodegen.types.ptr, name: "b" }));
addFunc.addParameter(new Parameter({ type: WASMCodegen.types.ptr, name: "result" }));
addFunc.addParameter(new Parameter({ type: WASMCodegen.types.i32, name: "n" }));

const entry = new BasicBlock("entry");
const loop = new BasicBlock("loop");
const loopBody = new BasicBlock("loop_body");
const loopExit = new BasicBlock("loop_exit");

// Entry: jump to loop
entry.setTerminator(new BrInst({ target: loop }));

// Loop header with PHI (i = 0 initially, i_next from loop_body)
const i = new PhiInst({
  name: "i",
  type: WASMCodegen.types.i32,
  incomingValues: [
    { value: 0, block: entry },
    { value: "i_next", block: loopBody }
  ]
});
loop.addInstruction(i);

// Check if i < n
const cmp = new ICmpInst({
  name: "cmp",
  predicate: WASMCodegen.predicates.slt,
  type: WASMCodegen.types.i32,
  lhs: i,
  rhs: "n"
});
loop.addInstruction(cmp);

loop.setTerminator(new BrInst({
  condition: cmp,
  conditionType: WASMCodegen.types.i1,
  target: loopBody,
  falseTarget: loopExit
}));

// Loop body: result[i] = a[i] + b[i]
const ptrA = new GetElementPtrInst({
  name: "ptr_a",
  baseType: floatType,
  ptrType: WASMCodegen.types.ptr,
  pointer: "a",
  indices: [{ type: WASMCodegen.types.i32, value: i }]
});
loopBody.addInstruction(ptrA);

const valA = new LoadInst({
  name: "val_a",
  type: floatType,
  pointerType: WASMCodegen.types.ptr,
  pointer: ptrA,
  align: 4
});
loopBody.addInstruction(valA);

const ptrB = new GetElementPtrInst({
  name: "ptr_b",
  baseType: floatType,
  ptrType: WASMCodegen.types.ptr,
  pointer: "b",
  indices: [{ type: WASMCodegen.types.i32, value: i }]
});
loopBody.addInstruction(ptrB);

const valB = new LoadInst({
  name: "val_b",
  type: floatType,
  pointerType: WASMCodegen.types.ptr,
  pointer: ptrB,
  align: 4
});
loopBody.addInstruction(valB);

const sum = new BinaryInst({
  name: "sum",
  opcode: WASMCodegen.opcodes.fadd,
  type: floatType,
  lhs: valA,
  rhs: valB
});
loopBody.addInstruction(sum);

const ptrResult = new GetElementPtrInst({
  name: "ptr_result",
  baseType: floatType,
  ptrType: WASMCodegen.types.ptr,
  pointer: "result",
  indices: [{ type: WASMCodegen.types.i32, value: i }]
});
loopBody.addInstruction(ptrResult);

const store = new StoreInst({
  valueType: floatType,
  value: sum,
  pointerType: WASMCodegen.types.ptr,
  pointer: ptrResult,
  align: 4
});
loopBody.addInstruction(store);

// i++
const iNext = new BinaryInst({
  name: "i_next",
  opcode: WASMCodegen.opcodes.add,
  type: WASMCodegen.types.i32,
  lhs: i,
  rhs: 1
});
loopBody.addInstruction(iNext);

loopBody.setTerminator(new BrInst({ target: loop }));

// Exit
loopExit.setTerminator(new RetInst({}));

addFunc.addBasicBlock(entry);
addFunc.addBasicBlock(loop);
addFunc.addBasicBlock(loopBody);
addFunc.addBasicBlock(loopExit);
module.addFunction(addFunc);

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║   WebAssembly Vector Addition (Sequential Loop)         ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");
console.log(codegen.toString());
console.log("\n// Unlike GPUs:");
console.log("// - No threadIdx/blockIdx");
console.log("// - Use for loops instead");
console.log("// - Sequential execution (fast in browsers!)");
console.log("// - Can use WebAssembly threads (atomics) for parallelism");
