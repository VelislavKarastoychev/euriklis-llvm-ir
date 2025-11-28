# @euriklis/llvm-ir

**Generate LLVM IR for CPUs and GPUs from TypeScript**

A type-safe, production-ready library for programmatically generating LLVM IR targeting x86-64, NVIDIA CUDA, AMD ROCm, and Intel GPUs. Perfect for building compilers, DSL code generators, and heterogeneous computing tools.

```typescript
import { NVVMCodegen, LLVMFunction, BasicBlock } from "@euriklis/llvm-ir";

const codegen = new NVVMCodegen("my_kernel");
const kernel = new LLVMFunction({ name: "vectorAdd", returnType: codegen.types.void });

// Get CUDA thread ID - generates proper NVVM intrinsics
const tid = NVVMCodegen.cuda.threadIdxX("tid");
// Generates: %tid = call i32 @llvm.nvvm.read.ptx.sreg.tid.x()
```

## Why Use This?

- ✅ **No manual IR string concatenation** - Type-safe API prevents syntax errors
- ✅ **Multi-GPU from one API** - Switch between NVIDIA/AMD/Intel with one line
- ✅ **Production-ready intrinsics** - All GPU built-ins validated with LLVM
- ✅ **Full IntelliSense** - Auto-complete for types, opcodes, intrinsics
- ✅ **Automatic value tracking** - No `%` prefix management needed

## Features

| Feature | Support |
|---------|---------|
| **CPU** | x86-64 (default target) |
| **NVIDIA GPU** | CUDA/NVPTX with warp ops, math, atomics |
| **AMD GPU** | ROCm/AMDGPU with wavefront ops, atomics |
| **Intel GPU** | SPIR-V/OpenCL with sub-groups, barriers |
| **Type Safety** | Full TypeScript types + IntelliSense |
| **Validation** | All IR verified with `llc` compiler |

## Installation

```bash
bun add @euriklis/llvm-ir
```

## Quick Start

### CPU (x86-64)

```typescript
import { LLVMCodegen, LLVMFunction, Parameter, BasicBlock, BinaryInst, RetInst } from "@euriklis/llvm-ir";

const codegen = new LLVMCodegen("my_module");

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
  lhs: "a",  // No % needed - automatic!
  rhs: "b"
}));
entry.setTerminator(new RetInst({ type: LLVMCodegen.types.i32, value: "result" }));

addFunc.addBasicBlock(entry);
codegen.getModule().addFunction(addFunc);

console.log(codegen.toString());
// Generates: define i32 @add(i32 %a, i32 %b) { ... }
```

### GPU (NVIDIA CUDA)

```typescript
import { NVVMCodegen, LLVMFunction, BasicBlock } from "@euriklis/llvm-ir";

const codegen = new NVVMCodegen("cuda_kernel");
const kernel = new LLVMFunction({
  name: "myKernel",
  returnType: LLVMCodegen.types.void
});

const entry = new BasicBlock("entry");

// Get thread ID - generates NVVM intrinsic
const tid = NVVMCodegen.cuda.threadIdxX("tid");
entry.addInstruction(tid);
// Generates: %tid = call i32 @llvm.nvvm.read.ptx.sreg.tid.x()

// Barrier synchronization
const sync = NVVMCodegen.cuda.syncThreads();
entry.addInstruction(sync);
// Generates: call void @llvm.nvvm.barrier0()

entry.setTerminator(new RetInst({}));
kernel.addBasicBlock(entry);
codegen.getModule().addFunction(kernel);

console.log(codegen.toString());
```

### GPU (AMD ROCm)

```typescript
import { AMDGPUCodegen } from "@euriklis/llvm-ir";

const codegen = new AMDGPUCodegen("rocm_kernel");
const witemId = AMDGPUCodegen.rocm.workitemIdX("tid");
// Generates: %tid = call i32 @llvm.amdgcn.workitem.id.x()
```

### GPU (Intel / OpenCL)

```typescript
import { SPIRVCodegen, ZExtInst } from "@euriklis/llvm-ir";

const codegen = new SPIRVCodegen("opencl_kernel");
const globalId = SPIRVCodegen.opencl.getGlobalIdX("gid");
// Generates: %gid = call i64 @_Z13get_global_idj(i32 0)
// Note: Returns i64, use ZExtInst for i32→i64 conversions

const barrier = SPIRVCodegen.opencl.barrier();
// Generates: call void @_Z7barrierj(i32 1)
```

## Key Concepts

### No Manual % Prefixes

The library handles LLVM's value naming automatically:

```typescript
// Variables → %variable
lhs: "x"      // becomes %x

// Constants → no prefix
rhs: 42       // stays as 42

// Instructions → auto-reference
const mul = new BinaryInst({ name: "result", ... });
lhs: mul      // uses %result
```

### Object-Based API

All constructors use named parameters:

```typescript
new BinaryInst({
  name: "result",
  opcode: LLVMCodegen.opcodes.add,
  type: LLVMCodegen.types.i32,
  lhs: "a",
  rhs: "b"
});
// Clear and type-safe!
```

### Module Structure

```
Module
├── Function
│   ├── Parameter
│   └── BasicBlock
│       ├── Instruction
│       └── Terminator (return/branch)
└── GlobalVariable
```

## Common Patterns

### Arithmetic & Logic

```typescript
// Binary operations
new BinaryInst({
  name: "result",
  opcode: LLVMCodegen.opcodes.add,  // add, sub, mul, div, and, or, xor
  type: LLVMCodegen.types.i32,
  lhs: "a",
  rhs: "b"
});

// Comparisons
new ICmpInst({
  name: "cmp",
  predicate: LLVMCodegen.predicates.slt,  // eq, ne, slt, sgt, etc.
  type: LLVMCodegen.types.i32,
  lhs: "x",
  rhs: 0
});
```

### Memory Access

```typescript
// Load
new LoadInst({ name: "val", type: floatType, pointer: "ptr", align: 4 });

// Store
new StoreInst({ value: "result", pointer: "ptr", align: 4 });

// Array indexing
new GetElementPtrInst({
  name: "ptr",
  baseType: floatType,
  pointer: "array",
  indices: [{ type: i32, value: "idx" }]
});
```

### Control Flow

```typescript
// Conditional branch
new BrInst({ condition: "cmp", target: trueBlock, falseTarget: falseBlock });

// Return
new RetInst({ type: i32, value: "result" });
```

## GPU Intrinsics Reference

### NVIDIA CUDA (NVVMCodegen.cuda.*)

```typescript
// Thread & Block IDs
threadIdxX/Y/Z(name)    // Thread index within block
blockIdxX/Y/Z(name)     // Block index within grid
blockDimX/Y/Z(name)     // Block dimensions
gridDimX/Y/Z(name)      // Grid dimensions

// Synchronization
syncThreads()           // __syncthreads() barrier

// Warp Operations
warpAll/Any/Ballot(name, mask, predicate)
warpShuffleIdxF32/I32(name, mask, value, srcLane)

// Math
sqrtf/rsqrtf/sinf/cosf/fmaf(name, ...)
```

### AMD ROCm (AMDGPUCodegen.rocm.*)

```typescript
// Work-Item & Group IDs
workitemIdX/Y/Z(name)   // Work-item ID (like threadIdx)
workgroupIdX/Y/Z(name)  // Work-group ID (like blockIdx)

// Synchronization
barrier()               // Work-group barrier

// Wavefront Operations
ballot(name, predicate)
readlaneI32(name, value, lane)

// Atomics
dsAddI32/F32(name, ptr, value, ordering)

// Math
sqrtf/rsqrtf/sinf/cosf/fmaf/rcpf(name, ...)
```

### Intel GPU / OpenCL (SPIRVCodegen.opencl.*)

```typescript
// Work-Item & Group IDs
getGlobalIdX/Y/Z(name)  // Global work-item ID (i64)
getLocalIdX/Y/Z(name)   // Local work-item ID (threadIdx)
getGroupIdX/Y/Z(name)   // Work-group ID (blockIdx)
getLocalSizeX/Y/Z(name) // Work-group size (blockDim)

// Synchronization
barrier()               // Work-group barrier

// Sub-Groups (Intel extension)
getSubGroupLocalId(name)
getSubGroupSize(name)
subGroupBarrier()

// Math
sqrtf/sinf/cosf/fmaf(name, ...)
```

**Important:** OpenCL functions return `i64` types. Use `ZExtInst` for i32→i64 conversions.

## Use Cases

Perfect for building:

- **Domain-Specific Language (DSL) compilers** - Generate optimized GPU code from your custom language
- **JIT compilers** - Runtime code generation for heterogeneous computing
- **Auto-differentation tools** - Generate gradient kernels for machine learning
- **Tensor compilers** - Optimize linear algebra operations across GPUs
- **Code transformation tools** - Modify or optimize existing LLVM IR
- **Research projects** - Experiment with LLVM backends and GPU programming models

## Complete Examples

Full working examples in the repository:

- **[example.ts](src/example.ts)** - Basic CPU IR generation
- **[cuda-example.ts](src/cuda-example.ts)** - NVIDIA CUDA kernel basics
- **[nvvm-complete-example.ts](src/nvvm-complete-example.ts)** - Complete CUDA with warp ops, shared memory
- **[amdgpu-complete-example.ts](src/amdgpu-complete-example.ts)** - Complete AMD ROCm with wavefront ops
- **[spirv-complete-example.ts](src/spirv-complete-example.ts)** - Complete Intel GPU/OpenCL with sub-groups

Each example demonstrates thread indexing, control flow, memory operations, barriers, SIMD operations, and math intrinsics.

## Type System

```typescript
// Built-in types (LLVMCodegen.types.*)
void, i1, i8, i16, i32, i64, i128, float, double, ptr

// Custom types
new IntType(256)                           // i256
new FloatType("half")                      // half precision
new ArrayType(i32, 10)                     // [10 x i32]
new StructType([i32, float])               // { i32, float }
new PointerType(3)                         // ptr addrspace(3) - CUDA shared memory
```

## GPU Targets

Switch GPU vendor with one line:

```typescript
// NVIDIA CUDA
import { NVVMCodegen } from "@euriklis/llvm-ir";
const cuda = new NVVMCodegen("module");
// Access: NVVMCodegen.cuda.*

// AMD ROCm
import { AMDGPUCodegen } from "@euriklis/llvm-ir";
const rocm = new AMDGPUCodegen("module");
// Access: AMDGPUCodegen.rocm.*

// Intel GPU / OpenCL
import { SPIRVCodegen } from "@euriklis/llvm-ir";
const intel = new SPIRVCodegen("module");
// Access: SPIRVCodegen.opencl.*
```

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

## API Quick Reference

### Core Classes

| Class | Description |
|-------|-------------|
| `LLVMCodegen` | Base IR generator (x86-64) |
| `NVVMCodegen` | NVIDIA CUDA IR generator |
| `AMDGPUCodegen` | AMD ROCm IR generator |
| `SPIRVCodegen` | Intel GPU/OpenCL IR generator |
| `LLVMFunction` | Function definition |
| `BasicBlock` | Code block with instructions |
| `Parameter` | Function parameter |

### Common Instructions

| Instruction | Purpose |
|-------------|---------|
| `BinaryInst` | add, sub, mul, div, and, or, xor |
| `ICmpInst` / `FCmpInst` | Integer/float comparisons |
| `LoadInst` / `StoreInst` | Memory operations |
| `GetElementPtrInst` | Array indexing |
| `CallInst` | Function calls |
| `RetInst` | Return from function |
| `BrInst` | Conditional/unconditional branches |
| `PhiInst` | SSA phi nodes |
| `ZExtInst` / `SExtInst` | Type conversions |

### GPU Intrinsics

Access via static properties:

```typescript
// NVIDIA
NVVMCodegen.cuda.threadIdxX(name)
NVVMCodegen.cuda.syncThreads()

// AMD
AMDGPUCodegen.rocm.workitemIdX(name)
AMDGPUCodegen.rocm.barrier()

// Intel
SPIRVCodegen.opencl.getGlobalIdX(name)
SPIRVCodegen.opencl.barrier()
```

See [complete examples](src/) for detailed usage.

## Development

```bash
# Install dependencies
bun install

# Run tests (requires llc for validation)
bun test

# Run examples
bun src/example.ts                     # CPU
bun src/cuda-example.ts                # NVIDIA
bun src/amdgpu-complete-example.ts     # AMD
bun src/spirv-complete-example.ts      # Intel
```

## Requirements

- **Runtime**: Bun or Node.js 18+
- **Testing**: LLVM tools (`llc`) for IR validation (optional)

Install LLVM:
```bash
# Ubuntu/Debian
sudo apt install llvm

# macOS
brew install llvm

# Arch Linux
sudo pacman -S llvm
```

## Contributing

Contributions welcome! Areas for improvement:

- Additional GPU intrinsics (atomics for SPIR-V, texture ops, etc.)
- More target architectures (WebAssembly, ARM, RISC-V)
- IR optimization passes
- Better error messages and validation
- Documentation improvements

## Support

- 📖 [Examples](src/) - Complete working code
- 🐛 [Issues](https://github.com/VelislavKarastoychev/euriklis-llvm-ir/issues) - Bug reports and feature requests
- 📧 Email: vskarastoychev@gmail.com

## License

MIT

## Author

**Velislav Karastoychev**
vskarastoychev@gmail.com
https://github.com/VelislavKarastoychev/euriklis-llvm-ir

---

**Built with TypeScript. Powered by LLVM. Ready for heterogeneous computing.** 🚀
