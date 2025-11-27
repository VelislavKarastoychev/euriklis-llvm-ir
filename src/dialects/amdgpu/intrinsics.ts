import { CallInst } from "../../core/instructions";
import { i1, i32, i64, LLVMType, FloatType } from "../../core/types";
import { BinaryInst, BinaryOpcodes } from "../../core/instructions";

/**
 * AMDGPU/ROCm intrinsics for HIP kernel development
 * Maps to llvm.amdgcn.* intrinsics
 */
export class AMDGPUIntrinsics {
  // ============================================================================
  // Workitem ID (equivalent to CUDA threadIdx)
  // ============================================================================

  /**
   * Get workitem ID in X dimension (threadIdx.x equivalent)
   * @returns CallInst that calls @llvm.amdgcn.workitem.id.x()
   */
  static workitemIdX(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.workitem.id.x",
      args: []
    });
  }

  /**
   * Get workitem ID in Y dimension (threadIdx.y equivalent)
   */
  static workitemIdY(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.workitem.id.y",
      args: []
    });
  }

  /**
   * Get workitem ID in Z dimension (threadIdx.z equivalent)
   */
  static workitemIdZ(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.workitem.id.z",
      args: []
    });
  }

  // ============================================================================
  // Workgroup ID (equivalent to CUDA blockIdx)
  // ============================================================================

  /**
   * Get workgroup ID in X dimension (blockIdx.x equivalent)
   * @returns CallInst that calls @llvm.amdgcn.workgroup.id.x()
   */
  static workgroupIdX(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.workgroup.id.x",
      args: []
    });
  }

  /**
   * Get workgroup ID in Y dimension (blockIdx.y equivalent)
   */
  static workgroupIdY(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.workgroup.id.y",
      args: []
    });
  }

  /**
   * Get workgroup ID in Z dimension (blockIdx.z equivalent)
   */
  static workgroupIdZ(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.workgroup.id.z",
      args: []
    });
  }

  // ============================================================================
  // Helper: Global Thread ID (similar to CUDA globalThreadId1D)
  // ============================================================================

  /**
   * Calculate global thread ID in 1D: workgroup.id.x * workgroup.size.x + workitem.id.x
   * Returns all intermediate instructions for manual insertion
   */
  static globalThreadId1D(
    workgroupIdName: string,
    workgroupSizeName: string,
    workitemIdName: string,
    mulName: string,
    addName: string
  ): {
    workgroupId: CallInst;
    workitemId: CallInst;
    mul: BinaryInst;
    add: BinaryInst;
  } {
    const workgroupId = AMDGPUIntrinsics.workgroupIdX(workgroupIdName);
    const workitemId = AMDGPUIntrinsics.workitemIdX(workitemIdName);

    // Note: workgroup.size must be passed as kernel argument or metadata
    // For now, we assume it's passed as a parameter
    const mul = new BinaryInst({
      name: mulName,
      opcode: BinaryOpcodes.mul,
      type: i32,
      lhs: workgroupId,
      rhs: workgroupSizeName
    });

    const add = new BinaryInst({
      name: addName,
      opcode: BinaryOpcodes.add,
      type: i32,
      lhs: mul,
      rhs: workitemId
    });

    return { workgroupId, workitemId, mul, add };
  }

  // ============================================================================
  // Synchronization
  // ============================================================================

  /**
   * Workgroup barrier synchronization (__syncthreads() equivalent)
   * @returns CallInst that calls @llvm.amdgcn.s.barrier()
   */
  static barrier(): CallInst {
    return new CallInst({
      returnType: new (class extends LLVMType {
        toString() {
          return "void";
        }
      })(),
      functionName: "llvm.amdgcn.s.barrier",
      args: []
    });
  }

  // ============================================================================
  // Wavefront Operations (AMD's equivalent to CUDA warps)
  // Note: AMD wavefronts are 64 threads on GCN/RDNA, 32/64 on RDNA2+
  // ============================================================================

  /**
   * Ballot operation - returns a 64-bit mask of active lanes
   * @param name Result name
   * @param predicate i1 predicate to vote on
   * @returns CallInst with i64 return type
   */
  static ballot(name: string, predicate: string): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "llvm.amdgcn.ballot",
      args: [
        { type: i1, value: predicate }
      ]
    });
  }

  /**
   * Read value from the first active lane in the wavefront
   * @param name Result name
   * @param value i32 value to broadcast from first lane
   */
  static readlaneFirstI32(name: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.readfirstlane",
      args: [
        { type: i32, value }
      ]
    });
  }

  /**
   * Read value from specific lane in the wavefront
   * @param name Result name
   * @param value i32 value to read
   * @param lane Lane index to read from
   */
  static readlaneI32(name: string, value: string, lane: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.readlane",
      args: [
        { type: i32, value },
        { type: i32, value: lane }
      ]
    });
  }

  /**
   * Permute lanes using DPP (Data-Parallel Primitives)
   * This is AMD's equivalent to CUDA shuffle operations
   * Note: DPP intrinsics are architecture-specific and may require specific LLVM versions
   * @param name Result name
   * @param src Source i32 value
   * @param dppCtrl DPP control word (e.g., 0x111 for row_shr:1)
   */
  static movDppI32(name: string, src: string, dppCtrl: number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.update.dpp.i32",
      args: [
        { type: i32, value: src },  // old value
        { type: i32, value: src },  // source value
        { type: i32, value: dppCtrl },
        { type: i32, value: 15 },  // row_mask
        { type: i32, value: 15 },  // bank_mask
        { type: i1, value: 0 }     // bound_ctrl
      ]
    });
  }

  /**
   * Permute lanes using DPP for float values
   * Note: For float shuffles, it's often better to bitcast to i32, shuffle, then bitcast back
   * This version uses readlane as a simpler alternative
   */
  static shuffleF32(name: string, src: string, laneId: number): CallInst {
    const floatType = new FloatType("float");
    // For simplicity, we'll use a different approach that's more portable
    // In real code, you'd bitcast float->i32, use readlane, then bitcast back
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.amdgcn.ds.swizzle",
      args: [
        { type: floatType, value: src },
        { type: i32, value: laneId }
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
      functionName: "llvm.amdgcn.sqrt.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast reciprocal square root for float (1/sqrt(x))
   */
  static rsqrtf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.amdgcn.rsq.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast sine approximation for float
   */
  static sinf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.amdgcn.sin.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fast cosine approximation for float
   */
  static cosf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.amdgcn.cos.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  /**
   * Fused multiply-add: a * b + c (single rounding)
   */
  static fmaf(name: string, a: string, b: string, c: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.amdgcn.fma.f32",
      args: [
        { type: floatType, value: a },
        { type: floatType, value: b },
        { type: floatType, value: c }
      ]
    });
  }

  /**
   * Fast reciprocal (1/x)
   */
  static rcpf(name: string, value: string): CallInst {
    const floatType = new FloatType("float");
    return new CallInst({
      name,
      returnType: floatType,
      functionName: "llvm.amdgcn.rcp.f32",
      args: [
        { type: floatType, value }
      ]
    });
  }

  // ============================================================================
  // Atomic Operations (LDS - Local Data Share / Shared Memory)
  // ============================================================================

  /**
   * Atomic add to local memory (LDS) - returns old value
   * @param name Result name
   * @param ptr Pointer in address space 3 (LDS)
   * @param value i32 value to add
   */
  static atomicAddLDSI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.ds.add.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }

  /**
   * Atomic increment to local memory (LDS) with saturation - returns old value
   * @param name Result name
   * @param ptr Pointer in address space 3 (LDS)
   * @param max Maximum value (wraps to 0 when reached)
   */
  static atomicIncLDSI32(name: string, ptr: string, max: string | number): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.atomic.inc.i32.p3",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value: max }
      ]
    });
  }

  /**
   * Atomic exchange (swap) to local memory (LDS) - returns old value
   * @param name Result name
   * @param ptr Pointer in address space 3 (LDS)
   * @param value New value to store
   */
  static atomicXchgLDSI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.ds.swap.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }

  /**
   * Atomic min to local memory (LDS) - returns old value
   * @param name Result name
   * @param ptr Pointer in address space 3 (LDS)
   * @param value Value to compare and take minimum
   */
  static atomicMinLDSI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.ds.min.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }

  /**
   * Atomic max to local memory (LDS) - returns old value
   * @param name Result name
   * @param ptr Pointer in address space 3 (LDS)
   * @param value Value to compare and take maximum
   */
  static atomicMaxLDSI32(name: string, ptr: string, value: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "llvm.amdgcn.ds.max.i32",
      args: [
        { type: new (class extends LLVMType {
          toString() { return "ptr addrspace(3)"; }
        })(), value: ptr },
        { type: i32, value }
      ]
    });
  }
}
