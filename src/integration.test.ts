import { test, expect, describe } from "bun:test";
import { $ } from "bun";
import {
  LLVMCodegen,
  NVVMCodegen,
  AMDGPUCodegen,
  SPIRVCodegen,
  ARMCodegen,
  RISCVCodegen,
  WASMCodegen,
  LLVMFunction,
  Parameter,
  BasicBlock,
  BinaryInst,
  RetInst,
  ICmpInst,
  FCmpInst,
  BrInst,
  LoadInst,
  StoreInst,
  GetElementPtrInst,
  ZExtInst,
  FloatType,
  i32,
  i64,
  float,
  ptr,
} from "./index";

/**
 * Integration tests that verify generated IR with actual LLVM tools
 * These tests require llc (LLVM compiler) to be installed
 *
 * To run these tests, install LLVM:
 * - Ubuntu/Debian: sudo apt install llvm
 * - macOS: brew install llvm
 * - Arch: sudo pacman -S llvm
 */

describe("Integration Tests with LLVM", () => {
  test("basic x86_64 function compiles with llc", async () => {
    // Check if llc is available
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new LLVMCodegen("test_module");
    const module = codegen.getModule();

    // Create simple add function
    const addFunc = new LLVMFunction({
      name: "add",
      returnType: i32
    });
    addFunc.addParameter(new Parameter({ type: i32, name: "a" }));
    addFunc.addParameter(new Parameter({ type: i32, name: "b" }));

    const entry = new BasicBlock("entry");
    entry.addInstruction(new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: "a",
      rhs: "b"
    }));
    entry.setTerminator(new RetInst({
      type: i32,
      value: "result"
    }));

    addFunc.addBasicBlock(entry);
    module.addFunction(addFunc);

    // Write IR to temp file
    const ir = codegen.toString();
    const tmpFile = `/tmp/test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc
    try {
      await $`llc ${tmpFile} -o /dev/null`;
      expect(true).toBe(true); // If we got here, it compiled successfully
    } finally {
      // Cleanup
      await $`rm -f ${tmpFile}`;
    }
  });

  test("NVPTX kernel compiles with llc", async () => {
    // Check if llc is available
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new NVVMCodegen("cuda_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    // Create simple CUDA kernel
    const kernel = new LLVMFunction({
      name: "vectorAdd",
      returnType: LLVMCodegen.types.void
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "a" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "b" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "c" }));
    kernel.addParameter(new Parameter({ type: i32, name: "n" }));

    const entry = new BasicBlock("entry");
    const compute = new BasicBlock("compute");
    const exit = new BasicBlock("exit");

    // Calculate thread index
    const tidx = NVVMCodegen.cuda.threadIdxX("tid.x");
    const bidx = NVVMCodegen.cuda.blockIdxX("bid.x");
    const bdim = NVVMCodegen.cuda.blockDimX("bdim.x");
    entry.addInstruction(tidx);
    entry.addInstruction(bidx);
    entry.addInstruction(bdim);

    const blockOffset = new BinaryInst({
      name: "block.offset",
      opcode: LLVMCodegen.opcodes.mul,
      type: i32,
      lhs: bidx,
      rhs: bdim
    });
    entry.addInstruction(blockOffset);

    const idx = new BinaryInst({
      name: "idx",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: blockOffset,
      rhs: tidx
    });
    entry.addInstruction(idx);

    // Bounds check
    const cmp = new ICmpInst({
      name: "cmp",
      predicate: LLVMCodegen.predicates.slt,
      type: i32,
      lhs: idx,
      rhs: "n"
    });
    entry.addInstruction(cmp);

    entry.setTerminator(new BrInst({
      condition: cmp,
      conditionType: LLVMCodegen.types.i1,
      target: compute,
      falseTarget: exit
    }));

    // Compute block
    const ptrA = new GetElementPtrInst({
      name: "ptr.a",
      baseType: floatType,
      ptrType: ptr,
      pointer: "a",
      indices: [{ type: i32, value: idx }]
    });
    compute.addInstruction(ptrA);

    const valA = new LoadInst({
      name: "val.a",
      type: floatType,
      pointerType: ptr,
      pointer: ptrA,
      align: 4
    });
    compute.addInstruction(valA);

    const ptrB = new GetElementPtrInst({
      name: "ptr.b",
      baseType: floatType,
      ptrType: ptr,
      pointer: "b",
      indices: [{ type: i32, value: idx }]
    });
    compute.addInstruction(ptrB);

    const valB = new LoadInst({
      name: "val.b",
      type: floatType,
      pointerType: ptr,
      pointer: ptrB,
      align: 4
    });
    compute.addInstruction(valB);

    const result = new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.fadd,
      type: floatType,
      lhs: valA,
      rhs: valB
    });
    compute.addInstruction(result);

    const ptrC = new GetElementPtrInst({
      name: "ptr.c",
      baseType: floatType,
      ptrType: ptr,
      pointer: "c",
      indices: [{ type: i32, value: idx }]
    });
    compute.addInstruction(ptrC);

    const store = new StoreInst({
      valueType: floatType,
      value: result,
      pointerType: ptr,
      pointer: ptrC,
      align: 4
    });
    compute.addInstruction(store);

    compute.setTerminator(new BrInst({ target: exit }));

    exit.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    kernel.addBasicBlock(compute);
    kernel.addBasicBlock(exit);
    module.addFunction(kernel);

    // Write IR to temp file
    const ir = codegen.toString();
    const tmpFile = `/tmp/cuda_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc targeting NVPTX
    try {
      await $`llc -march=nvptx64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true); // If we got here, it compiled successfully
    } finally {
      // Cleanup
      await $`rm -f ${tmpFile}`;
    }
  });

  test("control flow with phi compiles", async () => {
    // Check if llc is available
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new LLVMCodegen("phi_test");
    const module = codegen.getModule();

    // Create function with loop using phi
    const func = new LLVMFunction({
      name: "sum",
      returnType: i32
    });
    func.addParameter(new Parameter({ type: i32, name: "n" }));

    const entry = new BasicBlock("entry");
    const loop = new BasicBlock("loop");
    const exit = new BasicBlock("exit");

    // Entry: branch to loop
    entry.setTerminator(new BrInst({ target: loop }));

    // Loop with phi
    const { PhiInst } = await import("./index");
    const i = new PhiInst({
      name: "i",
      type: i32,
      incomingValues: [
        { value: 0, block: entry },
        { value: "i.next", block: loop }
      ]
    });
    loop.addInstruction(i);

    const sum = new PhiInst({
      name: "sum",
      type: i32,
      incomingValues: [
        { value: 0, block: entry },
        { value: "sum.next", block: loop }
      ]
    });
    loop.addInstruction(sum);

    const i_next = new BinaryInst({
      name: "i.next",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: i,
      rhs: 1
    });
    loop.addInstruction(i_next);

    const sum_next = new BinaryInst({
      name: "sum.next",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: sum,
      rhs: i
    });
    loop.addInstruction(sum_next);

    const cmp = new ICmpInst({
      name: "cmp",
      predicate: LLVMCodegen.predicates.slt,
      type: i32,
      lhs: i_next,
      rhs: "n"
    });
    loop.addInstruction(cmp);

    loop.setTerminator(new BrInst({
      condition: cmp,
      conditionType: LLVMCodegen.types.i1,
      target: loop,
      falseTarget: exit
    }));

    exit.setTerminator(new RetInst({
      type: i32,
      value: sum_next
    }));

    func.addBasicBlock(entry);
    func.addBasicBlock(loop);
    func.addBasicBlock(exit);
    module.addFunction(func);

    // Write IR to temp file
    const ir = codegen.toString();
    const tmpFile = `/tmp/phi_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc
    try {
      await $`llc ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      // Cleanup
      await $`rm -f ${tmpFile}`;
    }
  });

  test("FCmpInst with float comparisons compiles", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new NVVMCodegen("fcmp_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    // Create kernel that uses FCmpInst
    const kernel = new LLVMFunction({
      name: "testFCmp",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "input" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    const tidx = NVVMCodegen.cuda.threadIdxX("tid");
    entry.addInstruction(tidx);

    const ptrIn = new GetElementPtrInst({
      name: "ptr.in",
      baseType: floatType,
      ptrType: ptr,
      pointer: "input",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrIn);

    const val = new LoadInst({
      name: "val",
      type: floatType,
      pointerType: ptr,
      pointer: ptrIn,
      align: 4
    });
    entry.addInstruction(val);

    // Test FCmpInst with ordered comparison
    const isPositive = new FCmpInst({
      name: "is_positive",
      predicate: LLVMCodegen.fcmpPredicates.ogt,
      type: floatType,
      lhs: val,
      rhs: 0.0
    });
    entry.addInstruction(isPositive);

    const ptrOut = new GetElementPtrInst({
      name: "ptr.out",
      baseType: LLVMCodegen.types.i1,
      ptrType: ptr,
      pointer: "output",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrOut);

    const store = new StoreInst({
      valueType: LLVMCodegen.types.i1,
      value: isPositive,
      pointerType: ptr,
      pointer: ptrOut,
      align: 1
    });
    entry.addInstruction(store);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();
    const tmpFile = `/tmp/fcmp_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=nvptx64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("warp vote intrinsics compile correctly", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new NVVMCodegen("warp_vote_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    const kernel = new LLVMFunction({
      name: "testWarpVote",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "input" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    const tidx = NVVMCodegen.cuda.threadIdxX("tid");
    entry.addInstruction(tidx);

    const ptrIn = new GetElementPtrInst({
      name: "ptr.in",
      baseType: floatType,
      ptrType: ptr,
      pointer: "input",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrIn);

    const val = new LoadInst({
      name: "val",
      type: floatType,
      pointerType: ptr,
      pointer: ptrIn,
      align: 4
    });
    entry.addInstruction(val);

    // Use FCmpInst to create predicate
    const isPositive = new FCmpInst({
      name: "is_positive",
      predicate: LLVMCodegen.fcmpPredicates.ogt,
      type: floatType,
      lhs: val,
      rhs: 0.0
    });
    entry.addInstruction(isPositive);

    // Test warp vote intrinsics
    const allPositive = NVVMCodegen.cuda.warpAll("all_positive", 0xffffffff, "is_positive");
    entry.addInstruction(allPositive);

    const anyPositive = NVVMCodegen.cuda.warpAny("any_positive", 0xffffffff, "is_positive");
    entry.addInstruction(anyPositive);

    const ballot = NVVMCodegen.cuda.warpBallot("ballot", 0xffffffff, "is_positive");
    entry.addInstruction(ballot);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();
    const tmpFile = `/tmp/warp_vote_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=nvptx64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("warp shuffle intrinsics (I32 and F32) compile correctly", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new NVVMCodegen("warp_shuffle_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    const kernel = new LLVMFunction({
      name: "testWarpShuffle",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "inputF" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "inputI" }));

    const entry = new BasicBlock("entry");

    const tidx = NVVMCodegen.cuda.threadIdxX("tid");
    entry.addInstruction(tidx);

    // Load float value
    const ptrF = new GetElementPtrInst({
      name: "ptr.f",
      baseType: floatType,
      ptrType: ptr,
      pointer: "inputF",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrF);

    const valF = new LoadInst({
      name: "val.f",
      type: floatType,
      pointerType: ptr,
      pointer: ptrF,
      align: 4
    });
    entry.addInstruction(valF);

    // Load int value
    const ptrI = new GetElementPtrInst({
      name: "ptr.i",
      baseType: i32,
      ptrType: ptr,
      pointer: "inputI",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrI);

    const valI = new LoadInst({
      name: "val.i",
      type: i32,
      pointerType: ptr,
      pointer: ptrI,
      align: 4
    });
    entry.addInstruction(valI);

    // Test F32 shuffle variants
    const shuffleF32 = NVVMCodegen.cuda.warpShuffleIdxF32("shuffle_f32", 0xffffffff, "val.f", 0);
    entry.addInstruction(shuffleF32);

    const shuffleUpF32 = NVVMCodegen.cuda.warpShuffleUpF32("shuffle_up_f32", 0xffffffff, "val.f", 1);
    entry.addInstruction(shuffleUpF32);

    const shuffleDownF32 = NVVMCodegen.cuda.warpShuffleDownF32("shuffle_down_f32", 0xffffffff, "val.f", 1);
    entry.addInstruction(shuffleDownF32);

    const shuffleXorF32 = NVVMCodegen.cuda.warpShuffleXorF32("shuffle_xor_f32", 0xffffffff, "val.f", 0x1);
    entry.addInstruction(shuffleXorF32);

    // Test I32 shuffle variants
    const shuffleI32 = NVVMCodegen.cuda.warpShuffleIdxI32("shuffle_i32", 0xffffffff, "val.i", 0);
    entry.addInstruction(shuffleI32);

    const shuffleUpI32 = NVVMCodegen.cuda.warpShuffleUpI32("shuffle_up_i32", 0xffffffff, "val.i", 1);
    entry.addInstruction(shuffleUpI32);

    const shuffleDownI32 = NVVMCodegen.cuda.warpShuffleDownI32("shuffle_down_i32", 0xffffffff, "val.i", 1);
    entry.addInstruction(shuffleDownI32);

    const shuffleXorI32 = NVVMCodegen.cuda.warpShuffleXorI32("shuffle_xor_i32", 0xffffffff, "val.i", 0x1);
    entry.addInstruction(shuffleXorI32);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();
    const tmpFile = `/tmp/warp_shuffle_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=nvptx64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("CUDA math intrinsics compile correctly", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new NVVMCodegen("math_intrinsics_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    const kernel = new LLVMFunction({
      name: "testMathIntrinsics",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "input" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    const tidx = NVVMCodegen.cuda.threadIdxX("tid");
    entry.addInstruction(tidx);

    const ptrIn = new GetElementPtrInst({
      name: "ptr.in",
      baseType: floatType,
      ptrType: ptr,
      pointer: "input",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrIn);

    const val = new LoadInst({
      name: "val",
      type: floatType,
      pointerType: ptr,
      pointer: ptrIn,
      align: 4
    });
    entry.addInstruction(val);

    // Test all math intrinsics
    const sqrtVal = NVVMCodegen.cuda.sqrtf("sqrt_val", "val");
    entry.addInstruction(sqrtVal);

    const rsqrtVal = NVVMCodegen.cuda.rsqrtf("rsqrt_val", "val");
    entry.addInstruction(rsqrtVal);

    const sinVal = NVVMCodegen.cuda.sinf("sin_val", "val");
    entry.addInstruction(sinVal);

    const cosVal = NVVMCodegen.cuda.cosf("cos_val", "val");
    entry.addInstruction(cosVal);

    const fmaResult = NVVMCodegen.cuda.fmaf("fma_result", "sin_val", "sin_val", "cos_val");
    entry.addInstruction(fmaResult);

    const ptrOut = new GetElementPtrInst({
      name: "ptr.out",
      baseType: floatType,
      ptrType: ptr,
      pointer: "output",
      indices: [{ type: i32, value: tidx }]
    });
    entry.addInstruction(ptrOut);

    const store = new StoreInst({
      valueType: floatType,
      value: fmaResult,
      pointerType: ptr,
      pointer: ptrOut,
      align: 4
    });
    entry.addInstruction(store);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();
    const tmpFile = `/tmp/math_intrinsics_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=nvptx64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("NVVM kernel metadata annotations are generated", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new NVVMCodegen("kernel_metadata_test");
    const module = codegen.getModule();

    // Create kernel with isKernel: true
    const kernel = new LLVMFunction({
      name: "testKernel",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "data" }));

    const entry = new BasicBlock("entry");
    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify metadata is present
    expect(ir).toContain("!nvvm.annotations");
    expect(ir).toContain("!{ptr @testKernel, !\"kernel\", i32 1}");

    const tmpFile = `/tmp/kernel_metadata_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=nvptx64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });
});

describe("AMDGPU/ROCm Integration Tests", () => {
  test("AMDGPU kernel compiles with llc", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new AMDGPUCodegen("rocm_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    // Create simple ROCm kernel
    const kernel = new LLVMFunction({
      name: "vectorAdd",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "a" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "b" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "c" }));
    kernel.addParameter(new Parameter({ type: i32, name: "n" }));
    kernel.addParameter(new Parameter({ type: i32, name: "workgroup_size" }));

    const entry = new BasicBlock("entry");
    const compute = new BasicBlock("compute");
    const exit = new BasicBlock("exit");

    // Calculate thread index using AMDGPU intrinsics
    const witemId = AMDGPUCodegen.rocm.workitemIdX("witem.id");
    const wgroupId = AMDGPUCodegen.rocm.workgroupIdX("wgroup.id");
    entry.addInstruction(witemId);
    entry.addInstruction(wgroupId);

    const wgroupOffset = new BinaryInst({
      name: "wgroup.offset",
      opcode: LLVMCodegen.opcodes.mul,
      type: i32,
      lhs: wgroupId,
      rhs: "workgroup_size"
    });
    entry.addInstruction(wgroupOffset);

    const idx = new BinaryInst({
      name: "idx",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: wgroupOffset,
      rhs: witemId
    });
    entry.addInstruction(idx);

    // Bounds check
    const cmp = new ICmpInst({
      name: "cmp",
      predicate: LLVMCodegen.predicates.slt,
      type: i32,
      lhs: idx,
      rhs: "n"
    });
    entry.addInstruction(cmp);

    entry.setTerminator(new BrInst({
      condition: cmp,
      conditionType: LLVMCodegen.types.i1,
      target: compute,
      falseTarget: exit
    }));

    // Compute block
    const ptrA = new GetElementPtrInst({
      name: "ptr.a",
      baseType: floatType,
      ptrType: ptr,
      pointer: "a",
      indices: [{ type: i32, value: idx }]
    });
    compute.addInstruction(ptrA);

    const valA = new LoadInst({
      name: "val.a",
      type: floatType,
      pointerType: ptr,
      pointer: ptrA,
      align: 4
    });
    compute.addInstruction(valA);

    const ptrB = new GetElementPtrInst({
      name: "ptr.b",
      baseType: floatType,
      ptrType: ptr,
      pointer: "b",
      indices: [{ type: i32, value: idx }]
    });
    compute.addInstruction(ptrB);

    const valB = new LoadInst({
      name: "val.b",
      type: floatType,
      pointerType: ptr,
      pointer: ptrB,
      align: 4
    });
    compute.addInstruction(valB);

    const result = new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.fadd,
      type: floatType,
      lhs: valA,
      rhs: valB
    });
    compute.addInstruction(result);

    const ptrC = new GetElementPtrInst({
      name: "ptr.c",
      baseType: floatType,
      ptrType: ptr,
      pointer: "c",
      indices: [{ type: i32, value: idx }]
    });
    compute.addInstruction(ptrC);

    const store = new StoreInst({
      valueType: floatType,
      value: result,
      pointerType: ptr,
      pointer: ptrC,
      align: 4
    });
    compute.addInstruction(store);

    compute.setTerminator(new BrInst({ target: exit }));

    exit.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    kernel.addBasicBlock(compute);
    kernel.addBasicBlock(exit);
    module.addFunction(kernel);

    // Write IR to temp file
    const ir = codegen.toString();
    const tmpFile = `/tmp/rocm_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc targeting AMDGCN
    try {
      await $`llc -march=amdgcn ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("AMDGPU wavefront operations compile correctly", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new AMDGPUCodegen("wavefront_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    const kernel = new LLVMFunction({
      name: "testWavefront",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "input" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    const witemId = AMDGPUCodegen.rocm.workitemIdX("tid");
    entry.addInstruction(witemId);

    const ptrIn = new GetElementPtrInst({
      name: "ptr.in",
      baseType: floatType,
      ptrType: ptr,
      pointer: "input",
      indices: [{ type: i32, value: witemId }]
    });
    entry.addInstruction(ptrIn);

    const val = new LoadInst({
      name: "val",
      type: floatType,
      pointerType: ptr,
      pointer: ptrIn,
      align: 4
    });
    entry.addInstruction(val);

    // Test FCmpInst for predicate
    const isPositive = new FCmpInst({
      name: "is_positive",
      predicate: LLVMCodegen.fcmpPredicates.ogt,
      type: floatType,
      lhs: val,
      rhs: 0.0
    });
    entry.addInstruction(isPositive);

    // Test ballot (wavefront vote)
    const ballot = AMDGPUCodegen.rocm.ballot("ballot_mask", "is_positive");
    entry.addInstruction(ballot);

    // Test readlane operations
    const firstLane = AMDGPUCodegen.rocm.readlaneFirstI32("first_lane", "tid");
    entry.addInstruction(firstLane);

    const lane0 = AMDGPUCodegen.rocm.readlaneI32("lane0", "tid", 0);
    entry.addInstruction(lane0);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();
    const tmpFile = `/tmp/wavefront_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=amdgcn ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("AMDGPU math intrinsics compile correctly", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new AMDGPUCodegen("math_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    const kernel = new LLVMFunction({
      name: "testMath",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "input" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    const witemId = AMDGPUCodegen.rocm.workitemIdX("tid");
    entry.addInstruction(witemId);

    const ptrIn = new GetElementPtrInst({
      name: "ptr.in",
      baseType: floatType,
      ptrType: ptr,
      pointer: "input",
      indices: [{ type: i32, value: witemId }]
    });
    entry.addInstruction(ptrIn);

    const val = new LoadInst({
      name: "val",
      type: floatType,
      pointerType: ptr,
      pointer: ptrIn,
      align: 4
    });
    entry.addInstruction(val);

    // Test all math intrinsics
    const sqrtVal = AMDGPUCodegen.rocm.sqrtf("sqrt_val", "val");
    entry.addInstruction(sqrtVal);

    const rsqrtVal = AMDGPUCodegen.rocm.rsqrtf("rsqrt_val", "val");
    entry.addInstruction(rsqrtVal);

    const sinVal = AMDGPUCodegen.rocm.sinf("sin_val", "val");
    entry.addInstruction(sinVal);

    const cosVal = AMDGPUCodegen.rocm.cosf("cos_val", "val");
    entry.addInstruction(cosVal);

    const fmaResult = AMDGPUCodegen.rocm.fmaf("fma_result", "sin_val", "sin_val", "cos_val");
    entry.addInstruction(fmaResult);

    const rcpVal = AMDGPUCodegen.rocm.rcpf("rcp_val", "val");
    entry.addInstruction(rcpVal);

    const ptrOut = new GetElementPtrInst({
      name: "ptr.out",
      baseType: floatType,
      ptrType: ptr,
      pointer: "output",
      indices: [{ type: i32, value: witemId }]
    });
    entry.addInstruction(ptrOut);

    const store = new StoreInst({
      valueType: floatType,
      value: fmaResult,
      pointerType: ptr,
      pointer: ptrOut,
      align: 4
    });
    entry.addInstruction(store);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();
    const tmpFile = `/tmp/math_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=amdgcn ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("AMDGPU kernel metadata annotations are generated", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new AMDGPUCodegen("metadata_test");
    const module = codegen.getModule();

    // Create kernel with isKernel: true
    const kernel = new LLVMFunction({
      name: "testKernel",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "data" }));

    const entry = new BasicBlock("entry");
    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify metadata is present
    expect(ir).toContain("!opencl.kernels");
    expect(ir).toContain("!{ptr @testKernel, !\"kernel\", i32 1}");

    const tmpFile = `/tmp/metadata_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      await $`llc -march=amdgcn ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });
});

describe("SPIR-V/OpenCL/Intel GPU Integration Tests", () => {
  test("SPIR-V kernel with OpenCL intrinsics generates valid IR", async () => {
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }
    const codegen = new SPIRVCodegen("spirv_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    // Create simple OpenCL kernel
    const kernel = new LLVMFunction({
      name: "vectorAdd",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "a" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "b" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "c" }));
    kernel.addParameter(new Parameter({ type: i32, name: "n" }));

    const entry = new BasicBlock("entry");
    const compute = new BasicBlock("compute");
    const exit = new BasicBlock("exit");

    // Get global ID (OpenCL get_global_id)
    const globalId = SPIRVCodegen.opencl.getGlobalIdX("global.id");
    entry.addInstruction(globalId);

    // Extend n from i32 to i64 for comparison using proper zext
    const nExt = new ZExtInst({
      name: "n.ext",
      sourceType: i32,
      value: "n",
      targetType: i64
    });
    entry.addInstruction(nExt);

    // Bounds check
    const cmp = new ICmpInst({
      name: "cmp",
      predicate: LLVMCodegen.predicates.slt,
      type: i64,
      lhs: globalId,
      rhs: nExt
    });
    entry.addInstruction(cmp);

    entry.setTerminator(new BrInst({
      condition: cmp,
      conditionType: LLVMCodegen.types.i1,
      target: compute,
      falseTarget: exit
    }));

    // Compute block
    const ptrA = new GetElementPtrInst({
      name: "ptr.a",
      baseType: floatType,
      ptrType: ptr,
      pointer: "a",
      indices: [{ type: i64, value: globalId }]
    });
    compute.addInstruction(ptrA);

    const valA = new LoadInst({
      name: "val.a",
      type: floatType,
      pointerType: ptr,
      pointer: ptrA,
      align: 4
    });
    compute.addInstruction(valA);

    const ptrB = new GetElementPtrInst({
      name: "ptr.b",
      baseType: floatType,
      ptrType: ptr,
      pointer: "b",
      indices: [{ type: i64, value: globalId }]
    });
    compute.addInstruction(ptrB);

    const valB = new LoadInst({
      name: "val.b",
      type: floatType,
      pointerType: ptr,
      pointer: ptrB,
      align: 4
    });
    compute.addInstruction(valB);

    const result = new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.fadd,
      type: floatType,
      lhs: valA,
      rhs: valB
    });
    compute.addInstruction(result);

    const ptrC = new GetElementPtrInst({
      name: "ptr.c",
      baseType: floatType,
      ptrType: ptr,
      pointer: "c",
      indices: [{ type: i64, value: globalId }]
    });
    compute.addInstruction(ptrC);

    const store = new StoreInst({
      valueType: floatType,
      value: result,
      pointerType: ptr,
      pointer: ptrC,
      align: 4
    });
    compute.addInstruction(store);

    compute.setTerminator(new BrInst({ target: exit }));

    exit.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    kernel.addBasicBlock(compute);
    kernel.addBasicBlock(exit);
    module.addFunction(kernel);

    // Generate IR and verify OpenCL mangled names are present
    const ir = codegen.toString();
    expect(ir).toContain("_Z13get_global_idj"); // get_global_id mangled name
    expect(ir).toContain("target triple = \"spir64-unknown-unknown\"");
    expect(ir).toContain("zext i32 %n to i64"); // Verify proper zext is used

    // Verify IR is valid by parsing with llc
    const tmpFile = `/tmp/spirv_test_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    try {
      // Verify the IR is well-formed - llc should exit 0 for valid IR
      // Note: We can't compile to SPIR-V with llc, but we can verify IR validity
      // by targeting a generic architecture
      await $`llc -march=x86-64 ${tmpFile} -o /dev/null`;
      expect(true).toBe(true);
    } finally {
      await $`rm -f ${tmpFile}`;
    }
  });

  test("OpenCL work-item/work-group intrinsics are generated correctly", async () => {
    const codegen = new SPIRVCodegen("opencl_intrinsics_test");
    const module = codegen.getModule();

    const kernel = new LLVMFunction({
      name: "testIntrinsics",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    // Test all work-item/work-group intrinsics
    const globalId = SPIRVCodegen.opencl.getGlobalIdX("global.id");
    entry.addInstruction(globalId);

    const localId = SPIRVCodegen.opencl.getLocalIdX("local.id");
    entry.addInstruction(localId);

    const groupId = SPIRVCodegen.opencl.getGroupIdX("group.id");
    entry.addInstruction(groupId);

    const localSize = SPIRVCodegen.opencl.getLocalSizeX("local.size");
    entry.addInstruction(localSize);

    const globalSize = SPIRVCodegen.opencl.getGlobalSize("global.size", 0);
    entry.addInstruction(globalSize);

    const numGroups = SPIRVCodegen.opencl.getNumGroups("num.groups", 0);
    entry.addInstruction(numGroups);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify all OpenCL mangled names are present
    expect(ir).toContain("_Z13get_global_idj");   // get_global_id
    expect(ir).toContain("_Z12get_local_idj");    // get_local_id
    expect(ir).toContain("_Z12get_group_idj");    // get_group_id
    expect(ir).toContain("_Z14get_local_sizej");  // get_local_size
    expect(ir).toContain("_Z15get_global_sizej"); // get_global_size
    expect(ir).toContain("_Z14get_num_groupsj");  // get_num_groups
  });

  test("OpenCL barrier synchronization is generated correctly", async () => {
    const codegen = new SPIRVCodegen("barrier_test");
    const module = codegen.getModule();

    const kernel = new LLVMFunction({
      name: "testBarrier",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "data" }));

    const entry = new BasicBlock("entry");

    const localId = SPIRVCodegen.opencl.getLocalIdX("local.id");
    entry.addInstruction(localId);

    // Add barrier
    const barrier = SPIRVCodegen.opencl.barrier();
    entry.addInstruction(barrier);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify barrier is present
    expect(ir).toContain("_Z7barrierj");
  });

  test("OpenCL math intrinsics are generated correctly", async () => {
    const codegen = new SPIRVCodegen("math_intrinsics_test");
    const module = codegen.getModule();

    const floatType = new FloatType("float");

    const kernel = new LLVMFunction({
      name: "testMath",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "input" }));
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    const globalId = SPIRVCodegen.opencl.getGlobalIdX("global.id");
    entry.addInstruction(globalId);

    const ptrIn = new GetElementPtrInst({
      name: "ptr.in",
      baseType: floatType,
      ptrType: ptr,
      pointer: "input",
      indices: [{ type: i64, value: globalId }]
    });
    entry.addInstruction(ptrIn);

    const val = new LoadInst({
      name: "val",
      type: floatType,
      pointerType: ptr,
      pointer: ptrIn,
      align: 4
    });
    entry.addInstruction(val);

    // Test math intrinsics
    const sqrtVal = SPIRVCodegen.opencl.sqrtf("sqrt_val", "val");
    entry.addInstruction(sqrtVal);

    const sinVal = SPIRVCodegen.opencl.sinf("sin_val", "val");
    entry.addInstruction(sinVal);

    const cosVal = SPIRVCodegen.opencl.cosf("cos_val", "val");
    entry.addInstruction(cosVal);

    const fmaResult = SPIRVCodegen.opencl.fmaf("fma_result", "sin_val", "sin_val", "cos_val");
    entry.addInstruction(fmaResult);

    const ptrOut = new GetElementPtrInst({
      name: "ptr.out",
      baseType: floatType,
      ptrType: ptr,
      pointer: "output",
      indices: [{ type: i64, value: globalId }]
    });
    entry.addInstruction(ptrOut);

    const store = new StoreInst({
      valueType: floatType,
      value: fmaResult,
      pointerType: ptr,
      pointer: ptrOut,
      align: 4
    });
    entry.addInstruction(store);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify standard LLVM math intrinsics are present
    expect(ir).toContain("llvm.sqrt.f32");
    expect(ir).toContain("llvm.sin.f32");
    expect(ir).toContain("llvm.cos.f32");
    expect(ir).toContain("llvm.fma.f32");
  });

  test("SPIR-V kernel metadata annotations are generated", async () => {
    const codegen = new SPIRVCodegen("kernel_metadata_test");
    const module = codegen.getModule();

    // Create kernel with isKernel: true
    const kernel = new LLVMFunction({
      name: "testKernel",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "data" }));

    const entry = new BasicBlock("entry");
    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify metadata is present
    expect(ir).toContain("!opencl.kernels");
    expect(ir).toContain("!{ptr @testKernel, !\"kernel\", i32 1}");
    expect(ir).toContain("!opencl.ocl.version");
  });

  test("Intel sub-group operations are generated correctly", async () => {
    const codegen = new SPIRVCodegen("subgroup_test");
    const module = codegen.getModule();

    const kernel = new LLVMFunction({
      name: "testSubGroup",
      returnType: LLVMCodegen.types.void,
      isKernel: true
    });
    kernel.addParameter(new Parameter({ type: ptr, name: "output" }));

    const entry = new BasicBlock("entry");

    // Test sub-group intrinsics
    const subGroupLocalId = SPIRVCodegen.opencl.getSubGroupLocalId("sg.local.id");
    entry.addInstruction(subGroupLocalId);

    const subGroupSize = SPIRVCodegen.opencl.getSubGroupSize("sg.size");
    entry.addInstruction(subGroupSize);

    const subGroupBarrier = SPIRVCodegen.opencl.subGroupBarrier();
    entry.addInstruction(subGroupBarrier);

    entry.setTerminator(new RetInst({}));

    kernel.addBasicBlock(entry);
    module.addFunction(kernel);

    const ir = codegen.toString();

    // Verify Intel sub-group mangled names are present
    expect(ir).toContain("_Z22get_sub_group_local_idv");
    expect(ir).toContain("_Z18get_sub_group_sizev");
    expect(ir).toContain("_Z17sub_group_barrierj");
  });

  test("ARM/AArch64 function compiles with llc", async () => {
    // Check if llc is available
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }

    const codegen = new ARMCodegen("arm_test");
    const module = codegen.getModule();

    // Create simple add function
    const addFunc = new LLVMFunction({
      name: "add",
      returnType: i32
    });
    addFunc.addParameter(new Parameter({ type: i32, name: "a" }));
    addFunc.addParameter(new Parameter({ type: i32, name: "b" }));

    const entry = new BasicBlock("entry");
    entry.addInstruction(new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: "a",
      rhs: "b"
    }));
    entry.setTerminator(new RetInst({
      type: i32,
      value: "result"
    }));

    addFunc.addBasicBlock(entry);
    module.addFunction(addFunc);

    const ir = codegen.toString();

    // Verify ARM target triple
    expect(ir).toContain('target triple = "aarch64-unknown-linux-gnu"');

    // Write IR to temp file
    const tmpFile = `/tmp/test_arm_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc
    try {
      await $`llc ${tmpFile} -o /dev/null`;
      expect(true).toBe(true); // If we got here, it compiled successfully
    } finally {
      // Cleanup
      await $`rm -f ${tmpFile}`;
    }
  });

  test("RISC-V function compiles with llc", async () => {
    // Check if llc is available
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }

    const codegen = new RISCVCodegen("riscv_test");
    const module = codegen.getModule();

    // Create simple add function
    const addFunc = new LLVMFunction({
      name: "add",
      returnType: i32
    });
    addFunc.addParameter(new Parameter({ type: i32, name: "a" }));
    addFunc.addParameter(new Parameter({ type: i32, name: "b" }));

    const entry = new BasicBlock("entry");
    entry.addInstruction(new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: "a",
      rhs: "b"
    }));
    entry.setTerminator(new RetInst({
      type: i32,
      value: "result"
    }));

    addFunc.addBasicBlock(entry);
    module.addFunction(addFunc);

    const ir = codegen.toString();

    // Verify RISC-V target triple
    expect(ir).toContain('target triple = "riscv64-unknown-linux-gnu"');

    // Write IR to temp file
    const tmpFile = `/tmp/test_riscv_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc
    try {
      await $`llc ${tmpFile} -o /dev/null`;
      expect(true).toBe(true); // If we got here, it compiled successfully
    } finally {
      // Cleanup
      await $`rm -f ${tmpFile}`;
    }
  });

  test("WebAssembly function compiles with llc", async () => {
    // Check if llc is available
    try {
      await $`which llc`.quiet();
    } catch {
      console.log("Skipping test: llc not found");
      return;
    }

    const codegen = new WASMCodegen("wasm_test");
    const module = codegen.getModule();

    // Create simple add function
    const addFunc = new LLVMFunction({
      name: "add",
      returnType: i32
    });
    addFunc.addParameter(new Parameter({ type: i32, name: "a" }));
    addFunc.addParameter(new Parameter({ type: i32, name: "b" }));

    const entry = new BasicBlock("entry");
    entry.addInstruction(new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: "a",
      rhs: "b"
    }));
    entry.setTerminator(new RetInst({
      type: i32,
      value: "result"
    }));

    addFunc.addBasicBlock(entry);
    module.addFunction(addFunc);

    const ir = codegen.toString();

    // Verify WebAssembly target triple
    expect(ir).toContain('target triple = "wasm32-unknown-unknown"');

    // Write IR to temp file
    const tmpFile = `/tmp/test_wasm_${Date.now()}.ll`;
    await Bun.write(tmpFile, ir);

    // Compile with llc
    try {
      await $`llc ${tmpFile} -o /dev/null`;
      expect(true).toBe(true); // If we got here, it compiled successfully
    } finally {
      // Cleanup
      await $`rm -f ${tmpFile}`;
    }
  });
});
