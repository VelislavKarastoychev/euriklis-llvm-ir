import { CallInst } from "../../core/instructions";
import { i32, i64, LLVMType, FloatType, voidType } from "../../core/types";

/**
 * SPIR-V/OpenCL intrinsics for Intel GPU and cross-vendor GPU programming
 * Uses OpenCL C++ mangled names as external spir_func declarations
 *
 * LLVM SPIR-V uses external function declarations with mangled names like:
 *   declare spir_func i64 @_Z13get_global_idj(i32)
 *
 * The SPIR-V translator (llvm-spirv) or backend will convert these to SPIR-V ops.
 */
export class SPIRVIntrinsics {
  // ============================================================================
  // Work-Item/Group ID Functions
  // OpenCL: size_t get_*(uint dimindx)
  // ============================================================================

  /**
   * Get work-item ID in dimension (get_local_id)
   * Mangled: _Z12get_local_idj
   */
  static getLocalId(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "_Z12get_local_idj",
      args: [{ type: i32, value: dim }]
    });
  }

  static getLocalIdX(name: string): CallInst {
    return SPIRVIntrinsics.getLocalId(name, 0);
  }

  static getLocalIdY(name: string): CallInst {
    return SPIRVIntrinsics.getLocalId(name, 1);
  }

  static getLocalIdZ(name: string): CallInst {
    return SPIRVIntrinsics.getLocalId(name, 2);
  }

  /**
   * Get work-group ID in dimension (get_group_id)
   * Mangled: _Z12get_group_idj
   */
  static getGroupId(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "_Z12get_group_idj",
      args: [{ type: i32, value: dim }]
    });
  }

  static getGroupIdX(name: string): CallInst {
    return SPIRVIntrinsics.getGroupId(name, 0);
  }

  static getGroupIdY(name: string): CallInst {
    return SPIRVIntrinsics.getGroupId(name, 1);
  }

  static getGroupIdZ(name: string): CallInst {
    return SPIRVIntrinsics.getGroupId(name, 2);
  }

  /**
   * Get work-group size in dimension (get_local_size)
   * Mangled: _Z14get_local_sizej
   */
  static getLocalSize(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "_Z14get_local_sizej",
      args: [{ type: i32, value: dim }]
    });
  }

  static getLocalSizeX(name: string): CallInst {
    return SPIRVIntrinsics.getLocalSize(name, 0);
  }

  static getLocalSizeY(name: string): CallInst {
    return SPIRVIntrinsics.getLocalSize(name, 1);
  }

  static getLocalSizeZ(name: string): CallInst {
    return SPIRVIntrinsics.getLocalSize(name, 2);
  }

  /**
   * Get global work size in dimension (get_global_size)
   * Mangled: _Z15get_global_sizej
   */
  static getGlobalSize(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "_Z15get_global_sizej",
      args: [{ type: i32, value: dim }]
    });
  }

  /**
   * Get global work-item ID in dimension (get_global_id)
   * This is the most commonly used - unique thread ID across all work-groups
   * Mangled: _Z13get_global_idj
   */
  static getGlobalId(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "_Z13get_global_idj",
      args: [{ type: i32, value: dim }]
    });
  }

  static getGlobalIdX(name: string): CallInst {
    return SPIRVIntrinsics.getGlobalId(name, 0);
  }

  static getGlobalIdY(name: string): CallInst {
    return SPIRVIntrinsics.getGlobalId(name, 1);
  }

  static getGlobalIdZ(name: string): CallInst {
    return SPIRVIntrinsics.getGlobalId(name, 2);
  }

  /**
   * Get number of work-groups in dimension (get_num_groups)
   * Mangled: _Z14get_num_groupsj
   */
  static getNumGroups(name: string, dim: number): CallInst {
    return new CallInst({
      name,
      returnType: i64,
      functionName: "_Z14get_num_groupsj",
      args: [{ type: i32, value: dim }]
    });
  }

  // ============================================================================
  // Synchronization
  // OpenCL: void barrier(cl_mem_fence_flags flags)
  // Mangled: _Z7barrierj
  // ============================================================================

  /**
   * Work-group barrier with local memory fence
   * Equivalent to: barrier(CLK_LOCAL_MEM_FENCE)
   * Mangled: _Z7barrierj
   */
  static barrier(): CallInst {
    return new CallInst({
      returnType: voidType,
      functionName: "_Z7barrierj",
      args: [
        { type: i32, value: 1 }  // CLK_LOCAL_MEM_FENCE = 1
      ]
    });
  }

  /**
   * Work-group barrier with global memory fence
   */
  static barrierGlobal(): CallInst {
    return new CallInst({
      returnType: voidType,
      functionName: "_Z7barrierj",
      args: [
        { type: i32, value: 2 }  // CLK_GLOBAL_MEM_FENCE = 2
      ]
    });
  }

  /**
   * Work-group barrier with both local and global memory fence
   */
  static barrierAll(): CallInst {
    return new CallInst({
      returnType: voidType,
      functionName: "_Z7barrierj",
      args: [
        { type: i32, value: 3 }  // CLK_LOCAL_MEM_FENCE | CLK_GLOBAL_MEM_FENCE
      ]
    });
  }

  // ============================================================================
  // Sub-Group Operations (Intel GPU / OpenCL 2.0+)
  // Note: These are Intel-specific extensions, may not be available on all devices
  // ============================================================================

  /**
   * Get sub-group local ID (lane ID)
   * Note: Intel extension, may not be universally supported
   * Returns ID within sub-group (0 to sub_group_size-1)
   */
  static getSubGroupLocalId(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "_Z22get_sub_group_local_idv",
      args: []
    });
  }

  /**
   * Get sub-group size
   * Note: Intel extension
   */
  static getSubGroupSize(name: string): CallInst {
    return new CallInst({
      name,
      returnType: i32,
      functionName: "_Z18get_sub_group_sizev",
      args: []
    });
  }

  /**
   * Sub-group barrier
   * Note: Intel extension
   */
  static subGroupBarrier(): CallInst {
    return new CallInst({
      returnType: voidType,
      functionName: "_Z17sub_group_barrierj",
      args: [
        { type: i32, value: 1 }  // CLK_LOCAL_MEM_FENCE
      ]
    });
  }

  // ============================================================================
  // Math Intrinsics
  // OpenCL uses standard LLVM intrinsics for math, not mangled names
  // ============================================================================

  /**
   * Fast square root for float
   * Uses standard LLVM intrinsic
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
   * Uses standard LLVM intrinsic
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
   * Uses standard LLVM intrinsic
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
   * Uses standard LLVM intrinsic
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
}
