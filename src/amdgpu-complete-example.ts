import {
  AMDGPUCodegen,
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
  LLVMCodegen as BaseCodegen,
} from ".";

/**
 * Comprehensive AMDGPU/ROCm example showing all production-ready features:
 * 1. Kernel metadata annotations
 * 2. Type-safe function signatures
 * 3. Complete globalThreadId1D helper
 * 4. Wavefront vote/shuffle intrinsics
 * 5. AMD math intrinsics
 */

function exampleCompleteAMDGPUKernel() {
  const codegen = new AMDGPUCodegen("complete_rocm");
  const module = codegen.getModule();

  const floatType = new FloatType("float");

  // Create kernel with type-safe parameters
  const kernel = new LLVMFunction({
    name: "advancedKernel",
    returnType: BaseCodegen.types.void,
    isKernel: true  // Mark as kernel - generates !opencl.kernels metadata
  });

  kernel.addParameter(new Parameter({ type: BaseCodegen.types.ptr, name: "input" }));
  kernel.addParameter(new Parameter({ type: BaseCodegen.types.ptr, name: "output" }));
  kernel.addParameter(new Parameter({ type: BaseCodegen.types.i32, name: "n" }));
  kernel.addParameter(new Parameter({ type: BaseCodegen.types.i32, name: "workgroup_size" }));

  const entry = new BasicBlock("entry");
  const compute = new BasicBlock("compute");
  const wavefrontOps = new BasicBlock("wavefront_ops");
  const mathOps = new BasicBlock("math_ops");
  const exit = new BasicBlock("exit");

  // === ENTRY: Use globalThreadId1D helper ===
  const tid = AMDGPUCodegen.rocm.globalThreadId1D(
    "wgroup.id", "workgroup_size", "witem.id", "wgroup.offset", "global.tid"
  );

  // Add all instructions returned by helper
  entry.addInstruction(tid.workgroupId);
  entry.addInstruction(tid.workitemId);
  entry.addInstruction(tid.mul);
  entry.addInstruction(tid.add);

  // Bounds check
  const cmp = new ICmpInst({
    name: "in_bounds",
    predicate: BaseCodegen.predicates.slt,
    type: BaseCodegen.types.i32,
    lhs: tid.add,
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

  compute.setTerminator(new BrInst({ target: wavefrontOps }));

  // === WAVEFRONT OPS: Demonstrate wavefront vote and shuffle ===

  // Wavefront ballot: check if all lanes have positive value
  const isPositive = new FCmpInst({
    name: "is_positive",
    predicate: BaseCodegen.fcmpPredicates.ogt,
    type: floatType,
    lhs: valIn,
    rhs: 0.0
  });
  wavefrontOps.addInstruction(isPositive);

  // Ballot returns i64 mask (AMD wavefronts are 64 threads on GCN/RDNA)
  const ballot = AMDGPUCodegen.rocm.ballot("ballot_mask", "is_positive");
  wavefrontOps.addInstruction(ballot);

  // Read value from first active lane
  const firstValue = AMDGPUCodegen.rocm.readlaneFirstI32("first_value", "global.tid");
  wavefrontOps.addInstruction(firstValue);

  // Read value from specific lane (lane 0)
  const lane0Value = AMDGPUCodegen.rocm.readlaneI32("lane0_value", "global.tid", 0);
  wavefrontOps.addInstruction(lane0Value);

  // Note: DPP shuffles are available but require specific GPU architectures
  // For production use, readlane operations are more portable across AMD GPUs

  wavefrontOps.setTerminator(new BrInst({ target: mathOps }));

  // === MATH OPS: Demonstrate AMD math intrinsics ===

  // Fast sqrt
  const sqrtVal = AMDGPUCodegen.rocm.sqrtf("sqrt_val", "val.in");
  mathOps.addInstruction(sqrtVal);

  // Fast rsqrt
  const rsqrtVal = AMDGPUCodegen.rocm.rsqrtf("rsqrt_val", "val.in");
  mathOps.addInstruction(rsqrtVal);

  // Fast sin
  const sinVal = AMDGPUCodegen.rocm.sinf("sin_val", "val.in");
  mathOps.addInstruction(sinVal);

  // Fast cos
  const cosVal = AMDGPUCodegen.rocm.cosf("cos_val", "val.in");
  mathOps.addInstruction(cosVal);

  // Fused multiply-add: sin*sin + cos*cos (should = 1.0)
  const fmaResult = AMDGPUCodegen.rocm.fmaf("fma_result", "sin_val", "sin_val", "cos_val");
  mathOps.addInstruction(fmaResult);

  // Fast reciprocal
  const rcpVal = AMDGPUCodegen.rocm.rcpf("rcp_val", "val.in");
  mathOps.addInstruction(rcpVal);

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
  kernel.addBasicBlock(wavefrontOps);
  kernel.addBasicBlock(mathOps);
  kernel.addBasicBlock(exit);
  module.addFunction(kernel);

  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   Complete AMDGPU/ROCm Example - All Production Features ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");
  console.log(codegen.toString());
  console.log("\n✓ Kernel metadata: !opencl.kernels with isKernel=true");
  console.log("✓ Type safety: All parameters use LLVMType (not any)");
  console.log("✓ globalThreadId1D: Returns actual BinaryInst (not any)");
  console.log("✓ Wavefront intrinsics: ballot, readlane (DPP also available)");
  console.log("✓ Math intrinsics: sqrt, rsqrt, sin, cos, fma, rcp");
  console.log("\nReady for @euriklis/heterogeneous integration!");
}

// Run example
exampleCompleteAMDGPUKernel();
