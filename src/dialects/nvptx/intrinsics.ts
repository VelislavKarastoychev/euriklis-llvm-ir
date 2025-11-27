import { CallInst, AllocaInst, BinaryInst } from "../../core/instructions";
import { i1, i32, voidType, LLVMType, FloatType } from "../../core/types";
import { BinaryOpcodes } from "../../core/instructions";

/**
 * NVPTX/CUDA intrinsic functions for thread and block indexing
 */
export class NVPTXIntrinsics {
  /**
   * Synchronize all threads in a block (__syncthreads())
   * Blocks until all threads in the thread block have reached this point
   * and all global and shared memory accesses made by these threads prior
   * to __syncthreads() are visible to all threads in the block.
   *
   * @returns CallInst that performs barrier synchronization
   */
  static syncThreads(): CallInst {
    return new CallInst({
      returnType: voidType,
      functionName: "llvm.nvvm.barrier0"
    });
  }
  /**
   * Get thread index in X dimension (threadIdx.x)
   * @returns CallInst that reads threadIdx.x
   */
  static threadIdxX(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.tid.x"
    });
  }

  /**
   * Get thread index in Y dimension (threadIdx.y)
   * @returns CallInst that reads threadIdx.y
   */
  static threadIdxY(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.tid.y"
    });
  }

  /**
   * Get thread index in Z dimension (threadIdx.z)
   * @returns CallInst that reads threadIdx.z
   */
  static threadIdxZ(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.tid.z"
    });
  }

  /**
   * Get block index in X dimension (blockIdx.x)
   * @returns CallInst that reads blockIdx.x
   */
  static blockIdxX(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.ctaid.x"
    });
  }

  /**
   * Get block index in Y dimension (blockIdx.y)
   * @returns CallInst that reads blockIdx.y
   */
  static blockIdxY(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.ctaid.y"
    });
  }

  /**
   * Get block index in Z dimension (blockIdx.z)
   * @returns CallInst that reads blockIdx.z
   */
  static blockIdxZ(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.ctaid.z"
    });
  }

  /**
   * Get block dimension in X (blockDim.x)
   * @returns CallInst that reads blockDim.x
   */
  static blockDimX(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.ntid.x"
    });
  }

  /**
   * Get block dimension in Y (blockDim.y)
   * @returns CallInst that reads blockDim.y
   */
  static blockDimY(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.ntid.y"
    });
  }

  /**
   * Get block dimension in Z (blockDim.z)
   * @returns CallInst that reads blockDim.z
   */
  static blockDimZ(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.ntid.z"
    });
  }

  /**
   * Get grid dimension in X (gridDim.x)
   * @returns CallInst that reads gridDim.x
   */
  static gridDimX(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.nctaid.x"
    });
  }

  /**
   * Get grid dimension in Y (gridDim.y)
   * @returns CallInst that reads gridDim.y
   */
  static gridDimY(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.nctaid.y"
    });
  }

  /**
   * Get grid dimension in Z (gridDim.z)
   * @returns CallInst that reads gridDim.z
   */
  static gridDimZ(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.read.ptx.sreg.nctaid.z"
    });
  }

  /**
   * Calculate global thread ID in 1D grid
   * Helper: blockIdx.x * blockDim.x + threadIdx.x
   *
   * Returns all instructions needed to calculate global thread ID.
   * Add these to your basic block in order:
   *
   * @example
   * const tid = NVPTXIntrinsics.globalThreadId1D("bid.x", "bdim.x", "tid.x", "block.offset", "global.tid");
   * entry.addInstruction(tid.blockIdx);
   * entry.addInstruction(tid.blockDim);
   * entry.addInstruction(tid.threadIdx);
   * entry.addInstruction(tid.mul);
   * entry.addInstruction(tid.add);
   * // Now use tid.add as the global thread ID
   */
  static globalThreadId1D(
    blockIdxName: string,
    blockDimName: string,
    threadIdxName: string,
    mulName: string,
    addName: string
  ): {
    blockIdx: CallInst;
    blockDim: CallInst;
    threadIdx: CallInst;
    mul: BinaryInst;
    add: BinaryInst;
  } {
    const blockIdx = this.blockIdxX(blockIdxName);
    const blockDim = this.blockDimX(blockDimName);
    const threadIdx = this.threadIdxX(threadIdxName);

    // blockIdx.x * blockDim.x
    const mul = new BinaryInst({
      name: mulName,
      opcode: BinaryOpcodes.mul,
      type: i32,
      lhs: blockIdx,
      rhs: blockDim
    });

    // (blockIdx.x * blockDim.x) + threadIdx.x
    const add = new BinaryInst({
      name: addName,
      opcode: BinaryOpcodes.add,
      type: i32,
      lhs: mul,
      rhs: threadIdx
    });

    return {
      blockIdx,
      blockDim,
      threadIdx,
      mul,
      add
    };
  }

  /**
   * Allocate shared memory (CUDA __shared__)
   * Uses addrspace(3) for NVPTX shared memory
   *
   * Example:
   * const shared = NVPTXIntrinsics.allocShared("shared", new ArrayType(float, 256), 4);
   * // Generates: %shared = alloca [256 x float], align 4, addrspace(3)
   *
   * @param name Name of the shared memory variable
   * @param type Type of the shared memory (usually ArrayType)
   * @param align Alignment in bytes (optional, defaults to 4)
   * @returns AllocaInst configured for CUDA shared memory
   */
  static allocShared(name: string, type: LLVMType, align: number = 4): AllocaInst {
    return new AllocaInst({
      name,
      type,
      align,
      addrspace: 3 // NVPTX shared memory address space
    });
  }

  // ========== Warp Vote Functions ==========

  /**
   * Returns true if predicate is true for all active threads in the warp
   * Equivalent to __all_sync(mask, predicate) in CUDA
   * @param name Result name
   * @param mask Active thread mask (usually 0xffffffff)
   * @param predicate i1 predicate value
   */
  static warpAll(name: string, mask: string | number, predicate: string): CallInst {
    return new CallInst({
      name,
      returnType: i1,  // Returns i1, not i32
      functionName: "llvm.nvvm.vote.all.sync",
      args: [
        { type: i32, value: mask },
        { type: i1, value: predicate }  // Predicate is i1
      ]
    });
  }

  /**
   * Returns true if predicate is true for any active thread in the warp
   * Equivalent to __any_sync(mask, predicate) in CUDA
   * @param name Result name
   * @param mask Active thread mask (usually 0xffffffff)
   * @param predicate i1 predicate value
   */
  static warpAny(name: string, mask: string | number, predicate: string): CallInst {
    return new CallInst({
      name,
      returnType: i1,  // Returns i1, not i32
      functionName: "llvm.nvvm.vote.any.sync",
      args: [
        { type: i32, value: mask },
        { type: i1, value: predicate }  // Predicate is i1
      ]
    });
  }

  /**
   * Returns ballot of predicate for all active threads in the warp
   * Equivalent to __ballot_sync(mask, predicate) in CUDA
   * @param name Result name
   * @param mask Active thread mask (usually 0xffffffff)
   * @param predicate i1 predicate value
   * @returns i32 ballot result (bit per thread)
   */
  static warpBallot(name: string, mask: string | number, predicate: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,  // Ballot returns i32 (bit vector)
      functionName: "llvm.nvvm.vote.ballot.sync",
      args: [
        { type: i32, value: mask },
        { type: i1, value: predicate }  // Predicate is i1
      ]
    });
  }

  // ========== Warp Shuffle Functions ==========

  /**
   * Shuffle i32 value from source lane
   * Equivalent to __shfl_sync(mask, value, srcLane) in CUDA
   */
  static warpShuffleIdxI32(name: string, mask: string | number, value: string, srcLane: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.shfl.sync.idx.i32",
      args: [
        { type: i32, value: mask },
        { type: i32, value: value },
        { type: i32, value: srcLane },
        { type: i32, value: 0x1f } // clamp (5 bits for warp size 32)
      ]
    });
  }

  /**
   * Shuffle float value from source lane
   * Equivalent to __shfl_sync(mask, value, srcLane) in CUDA for floats
   */
  static warpShuffleIdxF32(name: string, mask: string | number, value: string, srcLane: string | number): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.shfl.sync.idx.f32",
      args: [
        { type: i32, value: mask },
        { type: floatType, value: value },
        { type: i32, value: srcLane },
        { type: i32, value: 0x1f }
      ]
    });
  }

  /**
   * Shuffle i32 value up by delta
   * Equivalent to __shfl_up_sync(mask, value, delta) in CUDA
   */
  static warpShuffleUpI32(name: string, mask: string | number, value: string, delta: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.shfl.sync.up.i32",
      args: [
        { type: i32, value: mask },
        { type: i32, value: value },
        { type: i32, value: delta },
        { type: i32, value: 0 }
      ]
    });
  }

  /**
   * Shuffle float value up by delta
   * Equivalent to __shfl_up_sync(mask, value, delta) in CUDA for floats
   */
  static warpShuffleUpF32(name: string, mask: string | number, value: string, delta: string | number): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.shfl.sync.up.f32",
      args: [
        { type: i32, value: mask },
        { type: floatType, value: value },
        { type: i32, value: delta },
        { type: i32, value: 0 }
      ]
    });
  }

  /**
   * Shuffle i32 value down by delta
   * Equivalent to __shfl_down_sync(mask, value, delta) in CUDA
   */
  static warpShuffleDownI32(name: string, mask: string | number, value: string, delta: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.shfl.sync.down.i32",
      args: [
        { type: i32, value: mask },
        { type: i32, value: value },
        { type: i32, value: delta },
        { type: i32, value: 0x1f }
      ]
    });
  }

  /**
   * Shuffle float value down by delta
   * Equivalent to __shfl_down_sync(mask, value, delta) in CUDA for floats
   */
  static warpShuffleDownF32(name: string, mask: string | number, value: string, delta: string | number): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.shfl.sync.down.f32",
      args: [
        { type: i32, value: mask },
        { type: floatType, value: value },
        { type: i32, value: delta },
        { type: i32, value: 0x1f }
      ]
    });
  }

  /**
   * Shuffle i32 value XOR lane
   * Equivalent to __shfl_xor_sync(mask, value, laneMask) in CUDA
   */
  static warpShuffleXorI32(name: string, mask: string | number, value: string, laneMask: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.nvvm.shfl.sync.bfly.i32",
      args: [
        { type: i32, value: mask },
        { type: i32, value: value },
        { type: i32, value: laneMask },
        { type: i32, value: 0x1f }
      ]
    });
  }

  /**
   * Shuffle float value XOR lane
   * Equivalent to __shfl_xor_sync(mask, value, laneMask) in CUDA for floats
   */
  static warpShuffleXorF32(name: string, mask: string | number, value: string, laneMask: string | number): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.shfl.sync.bfly.f32",
      args: [
        { type: i32, value: mask },
        { type: floatType, value: value },
        { type: i32, value: laneMask },
        { type: i32, value: 0x1f }
      ]
    });
  }

  // ========== Math Intrinsics ==========

  /**
   * Fast single-precision square root
   * Equivalent to __fsqrt_rn(x) in CUDA
   */
  static sqrtf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.sqrt.rn.f",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast single-precision reciprocal square root
   * Equivalent to rsqrtf(x) in CUDA
   */
  static rsqrtf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.rsqrt.approx.f",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast single-precision sine
   * Equivalent to __sinf(x) in CUDA
   */
  static sinf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.sin.approx.f",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast single-precision cosine
   * Equivalent to __cosf(x) in CUDA
   */
  static cosf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.cos.approx.f",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fused multiply-add: a * b + c
   * Equivalent to fmaf(a, b, c) in CUDA
   */
  static fmaf(name: string, a: string, b: string, c: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.fma.rn.f",
      args: [
        { type: floatType, value: a },
        { type: floatType, value: b },
        { type: floatType, value: c }
      ]
    });
  }

  /**
   * Fast single-precision reciprocal
   * Equivalent to __frcp_rn(x) in CUDA
   */
  static rcpf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.nvvm.rcp.approx.f",
      args: [
        { type: floatType, value }
      ]
    });
  }
}
