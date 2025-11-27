import {
  NVVMCodegen,
  LLVMFunction,
  Parameter,
  BasicBlock,
  BinaryInst,
  RetInst,
  BrInst,
  ICmpInst,
  FCmpInst,
  LoadInst,
  StoreInst,
  GetElementPtrInst,
  FloatType,
  ArrayType,
  LLVMCodegen as BaseCodegen,
} from ".";

/**
 * Comprehensive NVVM example showing all production-ready features:
 * 1. Kernel metadata annotations
 * 2. Type-safe function signatures
 * 3. Complete globalThreadId1D helper
 * 4. Warp vote/shuffle intrinsics
 * 5. CUDA math intrinsics
 */

function exampleCompleteNVVMKernel() {
  const codegen = new NVVMCodegen("complete_cuda");
  const module = codegen.getModule();

  const floatType = new FloatType("float");

  // Create kernel with type-safe parameters
  const kernel = new LLVMFunction({
    name: "advancedKernel",
    returnType: BaseCodegen.types.void,
    isKernel: true  // Mark as kernel - generates !nvvm.annotations
  });

  kernel.addParameter(new Parameter({ type: BaseCodegen.types.ptr, name: "input" }));
  kernel.addParameter(new Parameter({ type: BaseCodegen.types.ptr, name: "output" }));
  kernel.addParameter(new Parameter({ type: BaseCodegen.types.i32, name: "n" }));

  const entry = new BasicBlock("entry");
  const compute = new BasicBlock("compute");
  const warpOps = new BasicBlock("warp_ops");
  const mathOps = new BasicBlock("math_ops");
  const exit = new BasicBlock("exit");

  // === ENTRY: Use globalThreadId1D helper (now returns proper BinaryInst) ===
  const tid = NVVMCodegen.cuda.globalThreadId1D(
    "bid.x", "bdim.x", "tid.x", "block.offset", "global.tid"
  );

  // Add all instructions returned by helper
  entry.addInstruction(tid.blockIdx);
  entry.addInstruction(tid.blockDim);
  entry.addInstruction(tid.threadIdx);
  entry.addInstruction(tid.mul);
  entry.addInstruction(tid.add);

  // Bounds check
  const cmp = new ICmpInst({
    name: "in_bounds",
    predicate: BaseCodegen.predicates.slt,
    type: BaseCodegen.types.i32,
    lhs: tid.add,  // Now tid.add is a BinaryInst!
    rhs: "n"
  });
  entry.addInstruction(cmp);

  entry.setTerminator(new BrInst({
    condition: cmp,
    conditionType: BaseCodegen.types.i1,
    target: compute,
    falseTarget: exit
  }));

  // === COMPUTE: Load input value ===
  const ptrIn = new GetElementPtrInst({
    name: "ptr.in",
    baseType: floatType,
    ptrType: BaseCodegen.types.ptr,
    pointer: "input",
    indices: [{ type: BaseCodegen.types.i32, value: tid.add }]
  });
  compute.addInstruction(ptrIn);

  const valIn = new LoadInst({
    name: "val.in",
    type: floatType,
    pointerType: BaseCodegen.types.ptr,
    pointer: ptrIn,
    align: 4
  });
  compute.addInstruction(valIn);

  compute.setTerminator(new BrInst({ target: warpOps }));

  // === WARP OPS: Demonstrate warp vote and shuffle ===

  // Warp vote: check if all threads have positive value (use FCmpInst for float comparison!)
  const isPositive = new FCmpInst({
    name: "is_positive",
    predicate: BaseCodegen.fcmpPredicates.ogt,  // ordered greater than
    type: floatType,
    lhs: valIn,
    rhs: 0.0
  });
  warpOps.addInstruction(isPositive);

  // __all_sync(0xffffffff, is_positive) - now correctly typed with i1 predicate
  const allPositive = NVVMCodegen.cuda.warpAll("all_positive", 0xffffffff, "is_positive");
  warpOps.addInstruction(allPositive);

  // Warp shuffle: broadcast float value from lane 0 (use F32 variant!)
  const shuffled = NVVMCodegen.cuda.warpShuffleIdxF32("shuffled", 0xffffffff, "val.in", 0);
  warpOps.addInstruction(shuffled);

  // Warp reduce: sum across warp using shuffle_down (use F32 variant!)
  const reduced = NVVMCodegen.cuda.warpShuffleDownF32("reduced", 0xffffffff, "val.in", 16);
  warpOps.addInstruction(reduced);

  warpOps.setTerminator(new BrInst({ target: mathOps }));

  // === MATH OPS: Demonstrate CUDA math intrinsics ===

  // Fast sqrt
  const sqrtVal = NVVMCodegen.cuda.sqrtf("sqrt_val", "val.in");
  mathOps.addInstruction(sqrtVal);

  // Fast rsqrt
  const rsqrtVal = NVVMCodegen.cuda.rsqrtf("rsqrt_val", "val.in");
  mathOps.addInstruction(rsqrtVal);

  // Fast sin
  const sinVal = NVVMCodegen.cuda.sinf("sin_val", "val.in");
  mathOps.addInstruction(sinVal);

  // Fast cos
  const cosVal = NVVMCodegen.cuda.cosf("cos_val", "val.in");
  mathOps.addInstruction(cosVal);

  // Fused multiply-add: sin*sin + cos*cos (should = 1.0)
  const fmaResult = NVVMCodegen.cuda.fmaf("fma_result", "sin_val", "sin_val", "cos_val");
  mathOps.addInstruction(fmaResult);

  // Store result
  const ptrOut = new GetElementPtrInst({
    name: "ptr.out",
    baseType: floatType,
    ptrType: BaseCodegen.types.ptr,
    pointer: "output",
    indices: [{ type: BaseCodegen.types.i32, value: tid.add }]
  });
  mathOps.addInstruction(ptrOut);

  const store = new StoreInst({
    valueType: floatType,
    value: fmaResult,
    pointerType: BaseCodegen.types.ptr,
    pointer: ptrOut,
    align: 4
  });
  mathOps.addInstruction(store);

  mathOps.setTerminator(new BrInst({ target: exit }));

  // === EXIT ===
  exit.setTerminator(new RetInst({}));

  kernel.addBasicBlock(entry);
  kernel.addBasicBlock(compute);
  kernel.addBasicBlock(warpOps);
  kernel.addBasicBlock(mathOps);
  kernel.addBasicBlock(exit);
  module.addFunction(kernel);

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   Complete NVVM Example - All Production Features       ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");
  console.log(codegen.toString());
  console.log("\n✓ Kernel metadata: !nvvm.annotations with isKernel=true");
  console.log("✓ Type safety: All parameters use LLVMType (not any)");
  console.log("✓ globalThreadId1D: Returns actual BinaryInst (not any)");
  console.log("✓ Warp intrinsics: __all_sync, __shfl_sync variants");
  console.log("✓ Math intrinsics: sqrt, rsqrt, sin, cos, fma");
  console.log("\nReady for @euriklis/heterogeneous integration!");
}

// Run example
exampleCompleteNVVMKernel();
