# Architecture Selection Guide

## GPU vs CPU Architectures

Not all architectures have thread intrinsics! Choose based on your target platform.

## Architecture Comparison

| Architecture | Parallelism | Thread IDs | Use Case |
|--------------|-------------|------------|----------|
| **NVIDIA CUDA** | Thousands of GPU threads | ✅ threadIdx, blockIdx | GPU computing, ML training |
| **AMD ROCm** | Thousands of GPU threads | ✅ workitemId, workgroupId | AMD GPU computing |
| **Intel GPU/OpenCL** | Thousands of GPU threads | ✅ get_global_id, get_local_id | Intel GPU, cross-vendor |
| **x86-64** | Sequential (or explicit threads) | ❌ Use loops | Servers, desktops |
| **ARM/AArch64** | Sequential (or explicit threads) | ❌ Use loops | Mobile, Apple Silicon |
| **RISC-V** | Sequential (or explicit threads) | ❌ Use loops | Embedded, research |
| **WebAssembly** | Sequential (or Web Workers) | ❌ Use loops | Browsers, WASI |

## Code Patterns

### GPU Pattern (CUDA/ROCm/OpenCL)

```typescript
// ✅ Each thread processes ONE element
// ✅ Automatic parallelism
// ✅ Thousands of threads run simultaneously

const tid = NVVMCodegen.cuda.threadIdxX("tid");
const bid = NVVMCodegen.cuda.blockIdxX("bid");
const bdim = NVVMCodegen.cuda.blockDimX("bdim");

const idx = bid * bdim + tid;  // Global thread ID

// Each thread does one computation
result[idx] = a[idx] + b[idx];

// No loop needed! GPU runs this kernel 1000x in parallel
```

**Generated LLVM IR:**
```llvm
define void @kernel(ptr %a, ptr %b, ptr %result) {
  %tid = call i32 @llvm.nvvm.read.ptx.sreg.tid.x()
  %bid = call i32 @llvm.nvvm.read.ptx.sreg.ctaid.x()
  %bdim = call i32 @llvm.nvvm.read.ptx.sreg.ntid.x()
  %idx = ... ; calculate global index

  ; NO LOOP - each thread processes one element
  %ptr = getelementptr float, ptr %a, i32 %idx
  %val = load float, ptr %ptr
  ...
}
```

### CPU/WebAssembly Pattern

```typescript
// ✅ Sequential execution
// ✅ Process ALL elements in a loop
// ✅ Single-threaded (or manual threading)

for (int i = 0; i < n; i++) {
  result[i] = a[i] + b[i];
}

// Loop processes all elements
```

**Generated LLVM IR:**
```llvm
define void @vectorAdd(ptr %a, ptr %b, ptr %result, i32 %n) {
entry:
  br label %loop
loop:
  %i = phi i32 [ 0, %entry ], [ %i_next, %loop_body ]
  %cmp = icmp slt i32 %i, %n
  br i1 %cmp, label %loop_body, label %exit
loop_body:
  ; Process element i
  %ptr = getelementptr float, ptr %a, i32 %i
  %val = load float, ptr %ptr
  ...
  %i_next = add i32 %i, 1
  br label %loop
exit:
  ret void
}
```

## When to Use Each

### Use GPU Architectures (CUDA/ROCm/OpenCL) When:
- ✅ You have **massive parallelism** (millions of data points)
- ✅ **Same operation** on many elements (SIMD-friendly)
- ✅ Running on **GPU hardware** (NVIDIA/AMD/Intel GPUs)
- ✅ Machine learning, graphics, scientific computing

**Example:** Training neural networks, rendering, physics simulation

### Use CPU Architectures (x86/ARM) When:
- ✅ Running on **CPUs** (servers, desktops, mobile)
- ✅ **Complex control flow** (many branches, conditionals)
- ✅ **Sequential dependencies** (each step needs previous result)
- ✅ General-purpose computing

**Example:** Web servers, databases, operating systems

### Use WebAssembly When:
- ✅ Running in **browsers** (Chrome, Firefox, Safari)
- ✅ **Portable** code across platforms
- ✅ **Sandboxed** execution
- ✅ Near-native performance on web

**Example:** Browser games, video processing, crypto in browser

## Hybrid Approach

You can generate IR for **multiple targets** from the same TypeScript code:

```typescript
function createKernel(codegen: LLVMCodegen) {
  // This function works for ANY architecture!
  const func = new LLVMFunction({ name: "compute", ... });

  if (codegen instanceof NVVMCodegen) {
    // GPU: Use thread intrinsics
    const tid = NVVMCodegen.cuda.threadIdxX("tid");
    // ... parallel code
  } else {
    // CPU/WebAssembly: Use loops
    const loop = new BasicBlock("loop");
    // ... sequential code
  }

  return func;
}

// Generate for multiple targets
const cuda = createKernel(new NVVMCodegen("module"));
const wasm = createKernel(new WASMCodegen("module"));
const arm = createKernel(new ARMCodegen("module"));
```

## Threading Models

| Architecture | Threading |
|--------------|-----------|
| **GPU** | Implicit - GPU launches thousands of threads automatically |
| **CPU** | Explicit - Use pthreads, std::thread manually |
| **WebAssembly** | Explicit - Use Web Workers or WASI threads |

### WebAssembly Threads (Advanced)

WebAssembly DOES support threading via **atomics** and **shared memory**:

```typescript
// WebAssembly with atomics (similar to CPU threading)
import { CallInst } from "@euriklis/llvm-ir";

// Atomic add (for multi-threaded WebAssembly)
const atomicAdd = new CallInst({
  name: "result",
  returnType: WASMCodegen.types.i32,
  functionName: "llvm.wasm.atomic.rmw.add.i32",
  args: [
    { type: ptr, value: "counter" },
    { type: i32, value: 1 }
  ]
});
```

But this is **manual** threading (like CPU), not **automatic** like GPUs.

## Summary

**GPU = Automatic parallelism** (threadIdx/blockIdx)
- No loops needed
- Each thread = one element
- Thousands run simultaneously

**CPU/WebAssembly = Manual parallelism** (loops or explicit threads)
- Loops to process all elements
- Sequential by default
- Add threading manually if needed

**Our library supports both!** Just choose the right codegen class for your target.
