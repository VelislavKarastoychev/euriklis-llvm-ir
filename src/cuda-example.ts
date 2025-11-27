import {
  LLVMCodegen,
  NVVMCodegen,
  LLVMFunction,
  Parameter,
  BasicBlock,
  BinaryInst,
  RetInst,
  LoadInst,
  StoreInst,
  GetElementPtrInst,
  ICmpInst,
  BrInst,
  FloatType,
} from ".";

/**
 * Example CUDA kernel: vector addition WITH COMPLETE MEMORY OPERATIONS
 * C equivalent:
 * __global__ void vectorAdd(float* a, float* b, float* c, int n) {
 *   int idx = blockIdx.x * blockDim.x + threadIdx.x;
 *   if (idx < n) {
 *     c[idx] = a[idx] + b[idx];
 *   }
 * }
 */
function cudaVectorAddKernel() {
  const codegen = new NVVMCodegen("vector_add");
  const module = codegen.getModule();

  const floatType = new FloatType("float");

  // Create kernel function
  const kernel = new LLVMFunction({
    name: "vectorAdd",
    returnType: LLVMCodegen.types.void
  });

  // Parameters: float* a, float* b, float* c, int n
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "a" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "b" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "c" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.i32, name: "n" }));

  const entry = new BasicBlock("entry");
  const compute = new BasicBlock("compute");
  const exit = new BasicBlock("exit");

  // === ENTRY BLOCK: Calculate global thread ID ===
  const blockIdxX = NVVMCodegen.cuda.blockIdxX("blockIdx.x");
  const blockDimX = NVVMCodegen.cuda.blockDimX("blockDim.x");
  const threadIdxX = NVVMCodegen.cuda.threadIdxX("threadIdx.x");
  entry.addInstruction(blockIdxX);
  entry.addInstruction(blockDimX);
  entry.addInstruction(threadIdxX);

  // idx = blockIdx.x * blockDim.x + threadIdx.x
  const blockOffset = new BinaryInst({
    name: "block.offset",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: blockIdxX,
    rhs: blockDimX
  });
  entry.addInstruction(blockOffset);

  const idx = new BinaryInst({
    name: "idx",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: blockOffset,
    rhs: threadIdxX
  });
  entry.addInstruction(idx);

  // Bounds check: if (idx < n)
  const cmp = new ICmpInst({
    name: "cmp",
    predicate: LLVMCodegen.predicates.slt,
    type: LLVMCodegen.types.i32,
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

  // === COMPUTE BLOCK: Load, add, store ===

  // Get pointer to a[idx]
  const ptrA = new GetElementPtrInst({
    name: "ptr.a",
    baseType: floatType,
    ptrType: LLVMCodegen.types.ptr,
    pointer: "a",
    indices: [
      { type: LLVMCodegen.types.i32, value: idx }
    ]
  });
  compute.addInstruction(ptrA);

  // Load a[idx]
  const valA = new LoadInst({
    name: "val.a",
    type: floatType,
    pointerType: LLVMCodegen.types.ptr,
    pointer: ptrA,
    align: 4
  });
  compute.addInstruction(valA);

  // Get pointer to b[idx]
  const ptrB = new GetElementPtrInst({
    name: "ptr.b",
    baseType: floatType,
    ptrType: LLVMCodegen.types.ptr,
    pointer: "b",
    indices: [
      { type: LLVMCodegen.types.i32, value: idx }
    ]
  });
  compute.addInstruction(ptrB);

  // Load b[idx]
  const valB = new LoadInst({
    name: "val.b",
    type: floatType,
    pointerType: LLVMCodegen.types.ptr,
    pointer: ptrB,
    align: 4
  });
  compute.addInstruction(valB);

  // Add: result = a[idx] + b[idx]
  const result = new BinaryInst({
    name: "result",
    opcode: LLVMCodegen.opcodes.fadd,  // floating point add
    type: floatType,
    lhs: valA,
    rhs: valB
  });
  compute.addInstruction(result);

  // Get pointer to c[idx]
  const ptrC = new GetElementPtrInst({
    name: "ptr.c",
    baseType: floatType,
    ptrType: LLVMCodegen.types.ptr,
    pointer: "c",
    indices: [
      { type: LLVMCodegen.types.i32, value: idx }
    ]
  });
  compute.addInstruction(ptrC);

  // Store: c[idx] = result
  const store = new StoreInst({
    valueType: floatType,
    value: result,
    pointerType: LLVMCodegen.types.ptr,
    pointer: ptrC,
    align: 4
  });
  compute.addInstruction(store);

  compute.setTerminator(new BrInst({ target: exit }));

  // === EXIT BLOCK ===
  exit.setTerminator(new RetInst({}));

  kernel.addBasicBlock(entry);
  kernel.addBasicBlock(compute);
  kernel.addBasicBlock(exit);
  module.addFunction(kernel);

  console.log("=== CUDA Vector Add Kernel (COMPLETE with Load/Store/GEP) ===");
  console.log(codegen.toString());
  console.log("\n");
}

/**
 * Example: Simple kernel demonstrating all CUDA built-in variables
 */
function cudaBuiltinsDemo() {
  const codegen = new NVVMCodegen("cuda_builtins");
  const module = codegen.getModule();

  const kernel = new LLVMFunction({
    name: "demoBuiltins",
    returnType: LLVMCodegen.types.void
  });

  const entry = new BasicBlock("entry");

  // Thread indices
  const tidX = NVVMCodegen.cuda.threadIdxX("tid.x");
  const tidY = NVVMCodegen.cuda.threadIdxY("tid.y");
  const tidZ = NVVMCodegen.cuda.threadIdxZ("tid.z");
  entry.addInstruction(tidX);
  entry.addInstruction(tidY);
  entry.addInstruction(tidZ);

  // Block indices
  const bidX = NVVMCodegen.cuda.blockIdxX("bid.x");
  const bidY = NVVMCodegen.cuda.blockIdxY("bid.y");
  const bidZ = NVVMCodegen.cuda.blockIdxZ("bid.z");
  entry.addInstruction(bidX);
  entry.addInstruction(bidY);
  entry.addInstruction(bidZ);

  // Block dimensions
  const bdimX = NVVMCodegen.cuda.blockDimX("bdim.x");
  const bdimY = NVVMCodegen.cuda.blockDimY("bdim.y");
  const bdimZ = NVVMCodegen.cuda.blockDimZ("bdim.z");
  entry.addInstruction(bdimX);
  entry.addInstruction(bdimY);
  entry.addInstruction(bdimZ);

  // Grid dimensions
  const gdimX = NVVMCodegen.cuda.gridDimX("gdim.x");
  const gdimY = NVVMCodegen.cuda.gridDimY("gdim.y");
  const gdimZ = NVVMCodegen.cuda.gridDimZ("gdim.z");
  entry.addInstruction(gdimX);
  entry.addInstruction(gdimY);
  entry.addInstruction(gdimZ);

  // Example: Calculate 2D global thread ID
  // global_x = blockIdx.x * blockDim.x + threadIdx.x
  const globalX = new BinaryInst({
    name: "tmp.mul.x",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: bidX,
    rhs: bdimX
  });
  entry.addInstruction(globalX);

  const globalThreadX = new BinaryInst({
    name: "global.tid.x",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: globalX,
    rhs: tidX
  });
  entry.addInstruction(globalThreadX);

  // global_y = blockIdx.y * blockDim.y + threadIdx.y
  const globalY = new BinaryInst({
    name: "tmp.mul.y",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: bidY,
    rhs: bdimY
  });
  entry.addInstruction(globalY);

  const globalThreadY = new BinaryInst({
    name: "global.tid.y",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: globalY,
    rhs: tidY
  });
  entry.addInstruction(globalThreadY);

  entry.setTerminator(new RetInst({}));

  kernel.addBasicBlock(entry);
  module.addFunction(kernel);

  console.log("=== CUDA Built-ins Demo (2D Global Thread ID) ===");
  console.log(codegen.toString());
  console.log("\n");
}

/**
 * Example: Matrix multiplication kernel structure
 */
function cudaMatMulKernel() {
  const codegen = new NVVMCodegen("matmul");
  const module = codegen.getModule();

  // void matMul(float* A, float* B, float* C, int width)
  const kernel = new LLVMFunction({
    name: "matMul",
    returnType: LLVMCodegen.types.void
  });

  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "A" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "B" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "C" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.i32, name: "width" }));

  const entry = new BasicBlock("entry");

  // Calculate row = blockIdx.y * blockDim.y + threadIdx.y
  const blockIdxY = NVVMCodegen.cuda.blockIdxY("blockIdx.y");
  const blockDimY = NVVMCodegen.cuda.blockDimY("blockDim.y");
  const threadIdxY = NVVMCodegen.cuda.threadIdxY("threadIdx.y");
  entry.addInstruction(blockIdxY);
  entry.addInstruction(blockDimY);
  entry.addInstruction(threadIdxY);

  const rowTemp = new BinaryInst({
    name: "row.temp",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: blockIdxY,
    rhs: blockDimY
  });
  entry.addInstruction(rowTemp);

  const row = new BinaryInst({
    name: "row",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: rowTemp,
    rhs: threadIdxY
  });
  entry.addInstruction(row);

  // Calculate col = blockIdx.x * blockDim.x + threadIdx.x
  const blockIdxX = NVVMCodegen.cuda.blockIdxX("blockIdx.x");
  const blockDimX = NVVMCodegen.cuda.blockDimX("blockDim.x");
  const threadIdxX = NVVMCodegen.cuda.threadIdxX("threadIdx.x");
  entry.addInstruction(blockIdxX);
  entry.addInstruction(blockDimX);
  entry.addInstruction(threadIdxX);

  const colTemp = new BinaryInst({
    name: "col.temp",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: blockIdxX,
    rhs: blockDimX
  });
  entry.addInstruction(colTemp);

  const col = new BinaryInst({
    name: "col",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: colTemp,
    rhs: threadIdxX
  });
  entry.addInstruction(col);

  // (Actual matrix multiplication logic would go here)

  entry.setTerminator(new RetInst({}));

  kernel.addBasicBlock(entry);
  module.addFunction(kernel);

  console.log("=== CUDA Matrix Multiplication Kernel (Structure) ===");
  console.log(codegen.toString());
}

/**
 * Example: Using alloca for shared memory with __syncthreads()
 * __shared__ memory uses address space 3 in NVPTX
 *
 * Demonstrates a common CUDA pattern:
 * 1. Each thread loads from global memory to shared memory
 * 2. __syncthreads() ensures all threads have completed loading
 * 3. Threads can safely read from shared memory
 */
function cudaSharedMemoryExample() {
  const codegen = new NVVMCodegen("shared_memory");
  const module = codegen.getModule();

  const floatType = new FloatType("float");

  const kernel = new LLVMFunction({
    name: "sharedMemExample",
    returnType: LLVMCodegen.types.void
  });

  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "input" }));
  kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "output" }));

  const entry = new BasicBlock("entry");

  // Get thread index
  const tidx = NVVMCodegen.cuda.threadIdxX("tid.x");
  entry.addInstruction(tidx);

  // In a real implementation, you would:
  // 1. Allocate shared memory: __shared__ float shared[256];
  //    %shared = alloca [256 x float], align 4, addrspace(3)
  //
  // 2. Load from global to shared:
  //    shared[tid.x] = input[tid.x];
  //
  // 3. Synchronize threads:
  const sync = NVVMCodegen.cuda.syncThreads();
  entry.addInstruction(sync);
  //
  // 4. Use shared memory (all threads can now safely read):
  //    output[tid.x] = shared[tid.x] * 2.0f;

  entry.setTerminator(new RetInst({}));
  kernel.addBasicBlock(entry);
  module.addFunction(kernel);

  console.log("=== CUDA Shared Memory Example with __syncthreads() ===");
  console.log(codegen.toString());
  console.log("\n");
  console.log("Common CUDA pattern:");
  console.log("  1. Load global → shared memory");
  console.log("  2. __syncthreads() - wait for all threads");
  console.log("  3. Read from shared memory safely");
  console.log("\nGenerated LLVM IR shows:");
  console.log("  call void @llvm.nvvm.barrier0()");
  console.log("\n");
}

// Run examples
console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║          CUDA/NVPTX Kernel Examples                      ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

cudaVectorAddKernel();
cudaBuiltinsDemo();
cudaMatMulKernel();
cudaSharedMemoryExample();
