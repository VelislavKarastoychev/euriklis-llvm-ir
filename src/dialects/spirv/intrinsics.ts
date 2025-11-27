import { CallInst } from "../../core/instructions";
import { i32, i64, LLVMType, FloatType } from "../../core/types";

/**
 * SPIR-V/OpenCL intrinsics for Intel GPU and cross-vendor GPU programming
 * Maps to OpenCL built-in functions via LLVM SPIR-V backend
 */
export class SPIRVIntrinsics {
  // ============================================================================
  // Work-Item ID (equivalent to CUDA threadIdx)
  // ============================================================================

  /**
   * Get work-item ID in specified dimension
   * Equivalent to: get_local_id(dim) in OpenCL
   * @param name Result name
   * @param dim Dimension (0=x, 1=y, 2=z)
   */
  static getLocalId(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.spir.get_local_id",
      args: [
        { type: i32, value: dim }
      ]
    });
  }

  /**
   * Get work-item ID in X dimension
   */
  static getLocalIdX(name: string): CallInst {
    return SPIRVIntrinsics.getLocalId(name, 0);
  }

  /**
   * Get work-item ID in Y dimension
   */
  static getLocalIdY(name: string): CallInst {
    return SPIRVIntrinsics.getLocalId(name, 1);
  }

  /**
   * Get work-item ID in Z dimension
   */
  static getLocalIdZ(name: string): CallInst {
    return SPIRVIntrinsics.getLocalId(name, 2);
  }

  // ============================================================================
  // Work-Group ID (equivalent to CUDA blockIdx)
  // ============================================================================

  /**
   * Get work-group ID in specified dimension
   * Equivalent to: get_group_id(dim) in OpenCL
   * @param name Result name
   * @param dim Dimension (0=x, 1=y, 2=z)
   */
  static getGroupId(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.spir.get_group_id",
      args: [
        { type: i32, value: dim }
      ]
    });
  }

  /**
   * Get work-group ID in X dimension
   */
  static getGroupIdX(name: string): CallInst {
    return SPIRVIntrinsics.getGroupId(name, 0);
  }

  /**
   * Get work-group ID in Y dimension
   */
  static getGroupIdY(name: string): CallInst {
    return SPIRVIntrinsics.getGroupId(name, 1);
  }

  /**
   * Get work-group ID in Z dimension
   */
  static getGroupIdZ(name: string): CallInst {
    return SPIRVIntrinsics.getGroupId(name, 2);
  }

  // ============================================================================
  // Work-Group Size (equivalent to CUDA blockDim)
  // ============================================================================

  /**
   * Get work-group size in specified dimension
   * Equivalent to: get_local_size(dim) in OpenCL
   * @param name Result name
   * @param dim Dimension (0=x, 1=y, 2=z)
   */
  static getLocalSize(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.spir.get_local_size",
      args: [
        { type: i32, value: dim }
      ]
    });
  }

  /**
   * Get work-group size in X dimension
   */
  static getLocalSizeX(name: string): CallInst {
    return SPIRVIntrinsics.getLocalSize(name, 0);
  }

  /**
   * Get work-group size in Y dimension
   */
  static getLocalSizeY(name: string): CallInst {
    return SPIRVIntrinsics.getLocalSize(name, 1);
  }

  /**
   * Get work-group size in Z dimension
   */
  static getLocalSizeZ(name: string): CallInst {
    return SPIRVIntrinsics.getLocalSize(name, 2);
  }

  // ============================================================================
  // Global Work Size (equivalent to CUDA gridDim * blockDim)
  // ============================================================================

  /**
   * Get global work size in specified dimension
   * Equivalent to: get_global_size(dim) in OpenCL
   * @param name Result name
   * @param dim Dimension (0=x, 1=y, 2=z)
   */
  static getGlobalSize(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.spir.get_global_size",
      args: [
        { type: i32, value: dim }
      ]
    });
  }

  // ============================================================================
  // Global ID (equivalent to CUDA blockIdx * blockDim + threadIdx)
  // ============================================================================

  /**
   * Get global work-item ID in specified dimension
   * Equivalent to: get_global_id(dim) in OpenCL
   * This is the most commonly used - gives unique thread ID across all work-groups
   * @param name Result name
   * @param dim Dimension (0=x, 1=y, 2=z)
   */
  static getGlobalId(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.spir.get_global_id",
      args: [
        { type: i32, value: dim }
      ]
    });
  }

  /**
   * Get global ID in X dimension
   */
  static getGlobalIdX(name: string): CallInst {
    return SPIRVIntrinsics.getGlobalId(name, 0);
  }

  /**
   * Get global ID in Y dimension
   */
  static getGlobalIdY(name: string): CallInst {
    return SPIRVIntrinsics.getGlobalId(name, 1);
  }

  /**
   * Get global ID in Z dimension
   */
  static getGlobalIdZ(name: string): CallInst {
    return SPIRVIntrinsics.getGlobalId(name, 2);
  }

  // ============================================================================
  // Number of Work-Groups (equivalent to CUDA gridDim)
  // ============================================================================

  /**
   * Get number of work-groups in specified dimension
   * Equivalent to: get_num_groups(dim) in OpenCL
   * @param name Result name
   * @param dim Dimension (0=x, 1=y, 2=z)
   */
  static getNumGroups(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.spir.get_num_groups",
      args: [
        { type: i32, value: dim }
      ]
    });
  }

  // ============================================================================
  // Synchronization
  // ============================================================================

  /**
   * Work-group barrier synchronization
   * Equivalent to: barrier(CLK_LOCAL_MEM_FENCE) in OpenCL
   * All work-items in a work-group must reach this point before any continue
   */
  static barrier(): CallInst {
    return new CallInst({
      returnType: new (class extends LLVMType {
        toString() { return "void"; }
      })(),
      functionName: "llvm.spir.barrier",
      args: [
        { type: i32, value: 1 }  // CLK_LOCAL_MEM_FENCE
      ]
    });
  }

  /**
   * Memory fence for local memory
   */
  static memFenceLocal(): CallInst {
    return new CallInst({
      returnType: new (class extends LLVMType {
        toString() { return "void"; }
      })(),
      functionName: "llvm.spir.mem_fence",
      args: [
        { type: i32, value: 1 }  // CLK_LOCAL_MEM_FENCE
      ]
    });
  }

  /**
   * Memory fence for global memory
   */
  static memFenceGlobal(): CallInst {
    return new CallInst({
      returnType: new (class extends LLVMType {
        toString() { return "void"; }
      })(),
      functionName: "llvm.spir.mem_fence",
      args: [
        { type: i32, value: 2 }  // CLK_GLOBAL_MEM_FENCE
      ]
    });
  }

  // ============================================================================
  // Sub-Group Operations (Intel GPU specific - similar to CUDA warps)
  // Intel GPUs have sub-groups (SIMD execution units)
  // ============================================================================

  /**
   * Get sub-group local ID (lane ID within sub-group)
   */
  static getSubGroupLocalId(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.get_sub_group_local_id",
      args: []
    });
  }

  /**
   * Get sub-group size (number of work-items in sub-group)
   */
  static getSubGroupSize(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.get_sub_group_size",
      args: []
    });
  }

  /**
   * Sub-group barrier
   */
  static subGroupBarrier(): CallInst {
    return new CallInst({
      returnType: new (class extends LLVMType {
        toString() { return "void"; }
      })(),
      functionName: "llvm.spir.sub_group_barrier",
      args: []
    });
  }

  /**
   * Sub-group broadcast (like CUDA shuffle)
   * @param name Result name
   * @param value Value to broadcast
   * @param localId Sub-group local ID to broadcast from
   */
  static subGroupBroadcastI32(name: string, value: string, localId: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.sub_group_broadcast.i32",
      args: [
        { type: i32, value },
        { type: i32, value: localId }
      ]
    });
  }

  /**
   * Sub-group broadcast for float
   */
  static subGroupBroadcastF32(name: string, value: string, localId: string | number): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.spir.sub_group_broadcast.f32",
      args: [
        { type: floatType, value },
        { type: i32, value: localId }
      ]
    });
  }

  /**
   * Sub-group reduce add (sum across sub-group)
   */
  static subGroupReduceAddI32(name: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.sub_group_reduce_add.i32",
      args: [
        { type: i32, value }
      ]
    });
  }

  /**
   * Sub-group reduce add for float
   */
  static subGroupReduceAddF32(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.spir.sub_group_reduce_add.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  // ============================================================================
  // Math Intrinsics (Fast GPU Math)
  // ============================================================================

  /**
   * Fast square root for float
   */
  static sqrtf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.sqrt.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast sine for float
   */
  static sinf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.sin.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast cosine for float
   */
  static cosf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.cos.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fused multiply-add: a * b + c
   */
  static fmaf(name: string, a: string, b: string, c: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.fma.f32",
      args: [
        { type: floatType, value: a },
        { type: floatType, value: b },
        { type: floatType, value: c }
      ]
    });
  }

  // ============================================================================
  // Atomic Operations (Local/Global Memory)
  // ============================================================================

  /**
   * Atomic add to local memory (address space 3)
   * @param name Result name (old value)
   * @param ptr Pointer in local address space
   * @param value Value to add
   */
  static atomicAddLocalI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.atomic.add.local.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }

  /**
   * Atomic add to global memory (address space 1)
   */
  static atomicAddGlobalI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.atomic.add.global.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(1)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }

  /**
   * Atomic compare-and-swap (CAS) to local memory
   */
  static atomicCmpXchgLocalI32(name: string, ptr: string, cmp: string, newVal: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.atomic.cmpxchg.local.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value: cmp },
        { type: i32, value: newVal }
      ]
    });
  }

  /**
   * Atomic min to local memory
   */
  static atomicMinLocalI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.atomic.min.local.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }

  /**
   * Atomic max to local memory
   */
  static atomicMaxLocalI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.spir.atomic.max.local.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }
}
