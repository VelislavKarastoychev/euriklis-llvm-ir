# @euriklis/llvm-ir

A TypeScript library for programmatically generating LLVM IR with support for multiple GPU dialects (NVPTX/CUDA, AMDGPU, SPIR-V). Build LLVM IR using a clean, type-safe API with full IntelliSense support.

## Features

- 🎯 **Type-safe LLVM IR generation** - Object-based constructors with full TypeScript types
- 🔧 **Clean API** - No manual `%` prefix management, automatic value handling
- 🎮 **Multi-GPU Support** - Production-ready for NVIDIA CUDA, AMD ROCm, and Intel GPUs
- 🚀 **Complete Intrinsics** - Thread indexing, atomics, SIMD ops, barriers, fast math for all GPU vendors
- 🌳 **Tree-based IR** - Proper parent/child hierarchy with CFG support for basic blocks
- 💡 **IntelliSense** - Static constants for types, opcodes, and predicates
- ✅ **Verified** - All generated IR validated with llc compilation tests

## Installation

```bash
bun add @euriklis/llvm-ir
```

## Quick Start

```typescript
import { LLVMCodegen, LLVMFunction, Parameter, BasicBlock, BinaryInst, RetInst } from "@euriklis/llvm-ir";

const codegen = new LLVMCodegen("my_module");
const module = codegen.getModule();

// Create function: i32 @add(i32 %a, i32 %b)
const addFunc = new LLVMFunction({
  name: "add",
  returnType: LLVMCodegen.types.i32
});

addFunc.addParameter(new Parameter({
  type: LLVMCodegen.types.i32,
  name: "a"
}));

addFunc.addParameter(new Parameter({
  type: LLVMCodegen.types.i32,
  name: "b"
}));

const entry = new BasicBlock("entry");

// %result = add i32 %a, %b
// Note: No % needed! Just use "a" and "b"
entry.addInstruction(new BinaryInst({
  name: "result",
  opcode: LLVMCodegen.opcodes.add,
  type: LLVMCodegen.types.i32,
  lhs: "a",  // Automatically becomes %a
  rhs: "b"   // Automatically becomes %b
}));

entry.setTerminator(new RetInst({
  type: LLVMCodegen.types.i32,
  value: "result"
}));

addFunc.addBasicBlock(entry);
module.addFunction(addFunc);

console.log(codegen.toString());
```

**Output:**
```llvm
; ModuleID = 'my_module'
source_filename = "my_module"
target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-i128:128-f80:128-n8:16:32:64-S128"
target triple = "x86_64-unknown-linux-gnu"

define i32 @add(i32 %a, i32 %b) {
entry:
  %result = add i32 %a, %b
  ret i32 %result
}
```

## Core Concepts

### 1. Tree Structure (IR Hierarchy)

LLVM IR is organized as a **tree** with parent-child relationships:

```
Module (root)
├── GlobalVariable
├── Function
│   ├── Parameter
│   ├── Parameter
│   ├── BasicBlock (entry)
│   │   ├── Instruction
│   │   ├── Instruction
│   │   └── Terminator
│   └── BasicBlock
└── Function
```

Each node has:
- **One parent** (or null for Module)
- **Many children** (ordered array)

### 2. Control Flow Graph (CFG)

Basic blocks form a **graph** structure via branch instructions:

```typescript
const entry = new BasicBlock("entry");
const thenBlock = new BasicBlock("then");
const elseBlock = new BasicBlock("else");

// Branch creates CFG edges
entry.setTerminator(new BrInst({
  condition: cmp,
  conditionType: LLVMCodegen.types.i1,
  target: thenBlock,      // Successor
  falseTarget: elseBlock  // Successor
}));
```

This creates cycles for loops, making it a **graph**, not a pure tree.

### 3. Value System (Automatic % Management)

The library automatically handles LLVM's naming conventions:

```typescript
// Variables → %variable
lhs: "x"  // becomes %x

// Constants → no prefix
rhs: 2    // stays as 2

// Instructions → extract %name
const mul = new BinaryInst({ name: "mul", ... });
lhs: mul  // automatically uses %mul
```

**Value Types:**
- `LocalValue` - Local SSA values with `%` prefix
- `ConstantValue` - Literal constants (no prefix)
- `GlobalValue` - Globals with `@` prefix

### 4. Object-Based API

All constructors use named parameters for clarity:

```typescript
// ✅ Good - clear what each parameter means
new BinaryInst({
  name: "result",
  opcode: LLVMCodegen.opcodes.add,
  type: LLVMCodegen.types.i32,
  lhs: "a",
  rhs: "b"
});

// ❌ Bad - hard to remember order
new BinaryInst("result", "add", "i32", "%a", "%b");
```

## Instructions

### Binary Operations

```typescript
const add = new BinaryInst({
  name: "sum",
  opcode: LLVMCodegen.opcodes.add,  // Integer operations
  type: LLVMCodegen.types.i32,
  lhs: "x",
  rhs: 10
});

const fadd = new BinaryInst({
  name: "fsum",
  opcode: LLVMCodegen.opcodes.fadd,  // Float operations
  type: LLVMCodegen.types.float,
  lhs: "a",
  rhs: "b"
});
```

**Available opcodes:**
- Integer: `add`, `sub`, `mul`, `udiv`, `sdiv`, `urem`, `srem`
- Float: `fadd`, `fsub`, `fmul`, `fdiv`, `frem`
- Bitwise: `shl`, `lshr`, `ashr`, `and`, `or`, `xor`

### Comparisons

```typescript
const cmp = new ICmpInst({
  name: "cmp",
  predicate: LLVMCodegen.predicates.slt,  // signed less than
  type: LLVMCodegen.types.i32,
  lhs: "x",
  rhs: 0
});
```

**Predicates:** `eq`, `ne`, `ugt`, `uge`, `ult`, `ule`, `sgt`, `sge`, `slt`, `sle`

### Memory Operations

#### Load
```typescript
const load = new LoadInst({
  name: "value",
  type: LLVMCodegen.types.float,
  pointerType: LLVMCodegen.types.ptr,
  pointer: "ptr",
  align: 4
});
```

#### Store
```typescript
const store = new StoreInst({
  valueType: LLVMCodegen.types.float,
  value: "result",
  pointerType: LLVMCodegen.types.ptr,
  pointer: "ptr",
  align: 4
});
```

#### Alloca (Stack Allocation)
```typescript
const alloca = new AllocaInst({
  name: "local",
  type: LLVMCodegen.types.i32,
  align: 4
});
```

#### GetElementPtr (Array Indexing)
```typescript
const gep = new GetElementPtrInst({
  name: "ptr",
  baseType: floatType,
  ptrType: LLVMCodegen.types.ptr,
  pointer: "array",
  indices: [
    { type: LLVMCodegen.types.i32, value: idx }
  ]
});
```

### Control Flow

#### Return
```typescript
// Return void
entry.setTerminator(new RetInst({}));

// Return value
entry.setTerminator(new RetInst({
  type: LLVMCodegen.types.i32,
  value: "result"
}));
```

#### Branch
```typescript
// Unconditional
block.setTerminator(new BrInst({ target: nextBlock }));

// Conditional
block.setTerminator(new BrInst({
  condition: cmp,
  conditionType: LLVMCodegen.types.i1,
  target: trueBlock,
  falseTarget: falseBlock
}));
```

### Function Calls

```typescript
const call = new CallInst({
  name: "result",
  returnType: LLVMCodegen.types.i32,
  functionName: "my_function",
  args: [
    { type: LLVMCodegen.types.i32, value: "x" },
    { type: LLVMCodegen.types.float, value: 3.14 }
  ]
});
```

## CUDA/NVPTX Support

Generate GPU kernels with full CUDA built-in support:

```typescript
import { NVVMCodegen, LLVMFunction, Parameter, BasicBlock } from "@euriklis/llvm-ir";

const codegen = new NVVMCodegen("cuda_kernel");
const module = codegen.getModule();

const kernel = new LLVMFunction({
  name: "vectorAdd",
  returnType: LLVMCodegen.types.void
});

kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "a" }));
kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "b" }));
kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "c" }));

const entry = new BasicBlock("entry");

// Get CUDA thread/block indices
const tidx = NVVMCodegen.cuda.threadIdxX("tid.x");
const bidx = NVVMCodegen.cuda.blockIdxX("bid.x");
const bdim = NVVMCodegen.cuda.blockDimX("bdim.x");

entry.addInstruction(tidx);
entry.addInstruction(bidx);
entry.addInstruction(bdim);

// Calculate global index: blockIdx.x * blockDim.x + threadIdx.x
const offset = new BinaryInst({
  name: "offset",
  opcode: LLVMCodegen.opcodes.mul,
  type: LLVMCodegen.types.i32,
  lhs: bidx,
  rhs: bdim
});
entry.addInstruction(offset);

const idx = new BinaryInst({
  name: "idx",
  opcode: LLVMCodegen.opcodes.add,
  type: LLVMCodegen.types.i32,
  lhs: offset,
  rhs: tidx
});
entry.addInstruction(idx);

// ... rest of kernel implementation

entry.setTerminator(new RetInst({}));
kernel.addBasicBlock(entry);
module.addFunction(kernel);

console.log(codegen.toString());
```

### CUDA Intrinsics

All CUDA built-in variables are available via `NVVMCodegen.cuda.*`:

**Thread Indexing:**
```typescript
NVVMCodegen.cuda.threadIdxX(name)  // threadIdx.x
NVVMCodegen.cuda.threadIdxY(name)  // threadIdx.y
NVVMCodegen.cuda.threadIdxZ(name)  // threadIdx.z
```

**Block Indexing:**
```typescript
NVVMCodegen.cuda.blockIdxX(name)   // blockIdx.x
NVVMCodegen.cuda.blockIdxY(name)   // blockIdx.y
NVVMCodegen.cuda.blockIdxZ(name)   // blockIdx.z
```

**Block Dimensions:**
```typescript
NVVMCodegen.cuda.blockDimX(name)   // blockDim.x
NVVMCodegen.cuda.blockDimY(name)   // blockDim.y
NVVMCodegen.cuda.blockDimZ(name)   // blockDim.z
```

**Grid Dimensions:**
```typescript
NVVMCodegen.cuda.gridDimX(name)    // gridDim.x
NVVMCodegen.cuda.gridDimY(name)    // gridDim.y
NVVMCodegen.cuda.gridDimZ(name)    // gridDim.z
```

**Synchronization:**
```typescript
NVVMCodegen.cuda.syncThreads()     // __syncthreads() - barrier synchronization
```

These generate proper LLVM intrinsic calls:
```llvm
%tid.x = call i32 @llvm.nvvm.read.ptx.sreg.tid.x()
%bid.x = call i32 @llvm.nvvm.read.ptx.sreg.ctaid.x()
%bdim.x = call i32 @llvm.nvvm.read.ptx.sreg.ntid.x()
call void @llvm.nvvm.barrier0()  ; __syncthreads()
```

**Example with shared memory synchronization:**
```typescript
const entry = new BasicBlock("entry");

// Get thread index
const tidx = NVVMCodegen.cuda.threadIdxX("tid.x");
entry.addInstruction(tidx);

// Load from global memory to shared memory
// ... (load operations) ...

// Synchronize all threads in the block
const sync = NVVMCodegen.cuda.syncThreads();
entry.addInstruction(sync);

// Now all threads can safely read from shared memory
// ... (use shared memory) ...
```

## Complete Example: CUDA Vector Addition

```typescript
import {
  NVVMCodegen,
  LLVMFunction,
  Parameter,
  BasicBlock,
  BinaryInst,
  ICmpInst,
  BrInst,
  GetElementPtrInst,
  LoadInst,
  StoreInst,
  RetInst,
  FloatType
} from "@euriklis/llvm-ir";

const codegen = new NVVMCodegen("vector_add");
const module = codegen.getModule();
const floatType = new FloatType("float");

// void vectorAdd(float* a, float* b, float* c, int n)
const kernel = new LLVMFunction({
  name: "vectorAdd",
  returnType: LLVMCodegen.types.void
});

kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "a" }));
kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "b" }));
kernel.addParameter(new Parameter({ type: LLVMCodegen.types.ptr, name: "c" }));
kernel.addParameter(new Parameter({ type: LLVMCodegen.types.i32, name: "n" }));

const entry = new BasicBlock("entry");
const compute = new BasicBlock("compute");
const exit = new BasicBlock("exit");

// === Calculate global thread ID ===
const tidx = NVVMCodegen.cuda.threadIdxX("tid.x");
const bidx = NVVMCodegen.cuda.blockIdxX("bid.x");
const bdim = NVVMCodegen.cuda.blockDimX("bdim.x");
entry.addInstruction(tidx);
entry.addInstruction(bidx);
entry.addInstruction(bdim);

const offset = new BinaryInst({
  name: "offset",
  opcode: LLVMCodegen.opcodes.mul,
  type: LLVMCodegen.types.i32,
  lhs: bidx,
  rhs: bdim
});
entry.addInstruction(offset);

const idx = new BinaryInst({
  name: "idx",
  opcode: LLVMCodegen.opcodes.add,
  type: LLVMCodegen.types.i32,
  lhs: offset,
  rhs: tidx
});
entry.addInstruction(idx);

// === Bounds check ===
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

// === Load and compute ===
const ptrA = new GetElementPtrInst({
  name: "ptr.a",
  baseType: floatType,
  ptrType: LLVMCodegen.types.ptr,
  pointer: "a",
  indices: [{ type: LLVMCodegen.types.i32, value: idx }]
});
compute.addInstruction(ptrA);

const valA = new LoadInst({
  name: "val.a",
  type: floatType,
  pointerType: LLVMCodegen.types.ptr,
  pointer: ptrA,
  align: 4
});
compute.addInstruction(valA);

const ptrB = new GetElementPtrInst({
  name: "ptr.b",
  baseType: floatType,
  ptrType: LLVMCodegen.types.ptr,
  pointer: "b",
  indices: [{ type: LLVMCodegen.types.i32, value: idx }]
});
compute.addInstruction(ptrB);

const valB = new LoadInst({
  name: "val.b",
  type: floatType,
  pointerType: LLVMCodegen.types.ptr,
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
  ptrType: LLVMCodegen.types.ptr,
  pointer: "c",
  indices: [{ type: LLVMCodegen.types.i32, value: idx }]
});
compute.addInstruction(ptrC);

const store = new StoreInst({
  valueType: floatType,
  value: result,
  pointerType: LLVMCodegen.types.ptr,
  pointer: ptrC,
  align: 4
});
compute.addInstruction(store);

compute.setTerminator(new BrInst({ target: exit }));

// === Exit ===
exit.setTerminator(new RetInst({}));

kernel.addBasicBlock(entry);
kernel.addBasicBlock(compute);
kernel.addBasicBlock(exit);
module.addFunction(kernel);

console.log(codegen.toString());
```

## Type System

### Built-in Types

Access via `LLVMCodegen.types.*`:

```typescript
LLVMCodegen.types.void   // void
LLVMCodegen.types.i1     // i1
LLVMCodegen.types.i8     // i8
LLVMCodegen.types.i16    // i16
LLVMCodegen.types.i32    // i32
LLVMCodegen.types.i64    // i64
LLVMCodegen.types.i128   // i128
LLVMCodegen.types.float  // float
LLVMCodegen.types.double // double
LLVMCodegen.types.ptr    // ptr (opaque pointer)
```

### Custom Types

```typescript
import { IntType, FloatType, PointerType, ArrayType, StructType } from "@euriklis/llvm-ir";

// Custom integer width
const i256 = new IntType(256);

// Float types
const half = new FloatType("half");
const fp128 = new FloatType("fp128");

// Array type
const arrayType = new ArrayType(LLVMCodegen.types.i32, 10);  // [10 x i32]

// Struct type
const structType = new StructType([
  LLVMCodegen.types.i32,
  LLVMCodegen.types.float
]);  // { i32, float }

// Pointer with address space
const sharedPtr = new PointerType(3);  // ptr addrspace(3) - CUDA shared memory
```

## GPU Programming

### Quick GPU Example

```typescript
import { NVVMCodegen, AMDGPUCodegen, SPIRVCodegen } from "@euriklis/llvm-ir";

// NVIDIA CUDA
const cuda = new NVVMCodegen("cuda_kernel");
const tidCuda = NVVMCodegen.cuda.threadIdxX("tid");
const syncCuda = NVVMCodegen.cuda.syncThreads();

// AMD ROCm
const rocm = new AMDGPUCodegen("rocm_kernel");
const tidAmd = AMDGPUCodegen.rocm.workitemIdX("tid");
const syncAmd = AMDGPUCodegen.rocm.barrier();

// Intel GPU / OpenCL
const opencl = new SPIRVCodegen("opencl_kernel");
const globalId = SPIRVCodegen.opencl.getGlobalIdX("global.id");  // Returns i64!
const syncIntel = SPIRVCodegen.opencl.barrier();

// Important: get_global_id returns i64, use ZExtInst for i32→i64 conversions
import { ZExtInst } from "@euriklis/llvm-ir";
const nExt = new ZExtInst({
  name: "n.ext",
  sourceType: LLVMCodegen.types.i32,
  value: "n",
  targetType: LLVMCodegen.types.i64
});
```

### Target Architectures

#### x86-64 (Default)
```typescript
import { LLVMCodegen } from "@euriklis/llvm-ir";
const codegen = new LLVMCodegen("module");
// Target: x86_64-unknown-linux-gnu
```

#### NVIDIA CUDA (NVPTX)
```typescript
import { NVVMCodegen } from "@euriklis/llvm-ir";
const codegen = new NVVMCodegen("module");
// Target: nvptx64-nvidia-cuda
// Intrinsics: NVVMCodegen.cuda.*
```

#### AMD ROCm (AMDGPU)
```typescript
import { AMDGPUCodegen } from "@euriklis/llvm-ir";
const codegen = new AMDGPUCodegen("module");
// Target: amdgcn-amd-amdhsa
// Intrinsics: AMDGPUCodegen.rocm.*
```

#### Intel GPU / OpenCL (SPIR-V)
```typescript
import { SPIRVCodegen } from "@euriklis/llvm-ir";
const codegen = new SPIRVCodegen("module");
// Target: spir64-unknown-unknown
// Intrinsics: SPIRVCodegen.opencl.*
// Features: Automatic external function declarations for OpenCL built-ins
```

**SPIR-V Features:**
- Automatic `declare spir_func` statements for all OpenCL intrinsics
- Real OpenCL C++ mangled names (e.g., `_Z13get_global_idj`)
- Standard LLVM math intrinsics (llvm.sqrt.f32, etc.)
- Proper type conversions with `zext`/`sext` (get_global_id returns i64)
- Ready for llvm-spirv translator

## GPU Feature Comparison

| Feature | NVIDIA (NVPTX) | AMD (AMDGPU) | Intel (SPIR-V) |
|---------|----------------|---------------|----------------|
| **Thread Indexing** | `threadIdx` | `workitemId` | `get_local_id` |
| **Block/Group ID** | `blockIdx` | `workgroupId` | `get_group_id` |
| **Block/Group Size** | `blockDim` | (parameter) | `get_local_size` |
| **Global ID Helper** | globalThreadId1D | globalThreadId1D | `get_global_id` (built-in) |
| **SIMD Width** | Warp (32 threads) | Wavefront (64 threads) | Sub-group (8-32 threads) |
| **SIMD Operations** | Vote, shuffle, ballot | Vote, shuffle, DPP | Sub-group query/barrier |
| **Synchronization** | `__syncthreads` | `barrier` | `barrier` |
| **Atomics** | Full (LDS/global) | Full (LDS/global) | Not yet implemented |
| **Math Intrinsics** | sqrt, sin, cos, fma, etc. | sqrt, sin, cos, fma, rcp | sqrt, sin, cos, fma |
| **Address Spaces** | 0-5 | 0-6 | 0-4 (OpenCL) |

All three dialects are **production-ready** with comprehensive intrinsic libraries and llc-validated IR generation.

## API Reference

### Core Classes

- **`LLVMCodegen`** - Base code generator with target configuration
- **`Module`** - Top-level IR container
- **`LLVMFunction`** - Function definition
- **`Parameter`** - Function parameter
- **`BasicBlock`** - Container for instructions with CFG edges
- **`GlobalVariable`** - Global variable declaration

### Instructions

- **`BinaryInst`** - Binary operations (add, mul, etc.)
- **`ICmpInst`** - Integer comparison
- **`FCmpInst`** - Floating-point comparison
- **`LoadInst`** - Load from memory
- **`StoreInst`** - Store to memory
- **`AllocaInst`** - Stack allocation
- **`GetElementPtrInst`** - Pointer arithmetic / array indexing
- **`CallInst`** - Function call
- **`RetInst`** - Return from function
- **`BrInst`** - Branch (conditional/unconditional)
- **`PhiInst`** - SSA phi node for control flow merging

### Types

- **`IntType`** - Integer types (i1, i8, i32, etc.)
- **`FloatType`** - Floating-point types (float, double)
- **`PointerType`** - Pointer types
- **`ArrayType`** - Array types
- **`VectorType`** - SIMD vector types
- **`StructType`** - Struct types
- **`FunctionType`** - Function signature types

### Values

- **`LocalValue`** - Local SSA value with `%` prefix
- **`ConstantValue`** - Constant literal
- **`GlobalValue`** - Global with `@` prefix

### Dialects

#### NVIDIA CUDA (NVPTX)
- **`NVVMCodegen`** - NVIDIA CUDA/NVPTX code generator
- **`NVPTXIntrinsics`** - CUDA built-ins: threadIdx, blockIdx, blockDim, gridDim, warp operations, math intrinsics

#### AMD ROCm (AMDGPU)
- **`AMDGPUCodegen`** - AMD GPU/ROCm code generator
- **`AMDGPUIntrinsics`** - HIP/ROCm built-ins: workitemId, workgroupId, wavefront operations, atomics, math intrinsics

#### Intel GPU / OpenCL (SPIR-V)
- **`SPIRVCodegen`** - SPIR-V/OpenCL code generator with automatic external function declarations
- **`SPIRVIntrinsics`** - OpenCL built-ins: get_global_id, get_local_id, get_group_id, sub-group operations (query/barrier), work-group barriers, math intrinsics

## Architecture

The library uses a **hybrid tree/graph structure**:

1. **Tree (containment)**: Module → Functions → BasicBlocks → Instructions
2. **Graph (control flow)**: BasicBlocks connect via branch instructions

This matches LLVM's actual IR structure and allows proper representation of loops and complex control flow.

## Examples

Complete working examples in the `src/` directory:

- **`example.ts`** - Basic x86-64 IR generation
- **`cuda-example.ts`** - NVIDIA CUDA kernel basics
- **`nvvm-complete-example.ts`** - Complete NVPTX with warp ops, math intrinsics
- **`amdgpu-complete-example.ts`** - Complete AMD ROCm with wavefront ops, atomics
- **`spirv-complete-example.ts`** - Complete Intel GPU/OpenCL with sub-group ops

All examples demonstrate:
- Thread/work-item indexing
- Control flow and branches
- Memory operations (load/store/GEP)
- Synchronization (barriers)
- SIMD operations (warps/wavefronts/sub-groups)
- Fast math intrinsics
- Atomic operations

## Development

```bash
# Install dependencies
bun install

# Build the package
bun run build

# Run tests (requires llc for integration tests)
bun test

# Run examples
bun src/example.ts                     # x86-64 basics
bun src/cuda-example.ts                # CUDA basics
bun src/nvvm-complete-example.ts       # Complete NVIDIA GPU
bun src/amdgpu-complete-example.ts     # Complete AMD GPU
bun src/spirv-complete-example.ts      # Complete Intel GPU / OpenCL
```

## License

MIT

## Author

Velislav Simov Karastoychev <vskarastoychev@gmail.com>

## Repository

https://github.com/VelislavKarastoychev/euriklis-llvm-ir
