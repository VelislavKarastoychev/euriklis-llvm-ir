import { LLVMCodegen } from "../../core/codegen";
import { AMDGPUIntrinsics } from "./intrinsics";
import { LLVMFunction } from "../../core/module";

/**
 * AMDGPU code generator
 * Targets AMD GPUs (ROCm/HIP)
 */
export class AMDGPUCodegen extends LLVMCodegen {
  // Static reference to AMDGPU intrinsics for easy access
  static readonly rocm = AMDGPUIntrinsics;

  constructor(moduleName: string) {
    super(moduleName);

    // AMDGPU target configuration for AMDGCN architecture
    this.targetTriple = "amdgcn-amd-amdhsa";
    this.dataLayout = "e-p:64:64-p1:64:64-p2:32:32-p3:32:32-p4:64:64-p5:32:32-p6:32:32-p7:160:256:256:32-p8:128:128-i64:64-v16:16-v24:32-v32:32-v48:64-v96:128-v192:256-v256:256-v512:512-v1024:1024-v2048:2048-n32:64-S32-A5-G1-ni:7:8";
  }

  /**
   * Helper to mark a function as a kernel
   * This generates the necessary !kernel metadata for ROCm/HIP
   */
  static markAsKernel(func: LLVMFunction): void {
    func.setKernel(true);
  }

  /**
   * Generate AMDGPU IR with ROCm-specific metadata
   */
  toString(): string {
    let output = super.toString();

    // Collect all kernel functions
    const kernels = this.module.getChildren().filter(
      (child): child is LLVMFunction =>
        child instanceof LLVMFunction && child.isKernelFunction()
    );

    // Add OpenCL/HIP kernel metadata if we have kernels
    if (kernels.length > 0) {
      output += "\n";

      // Generate metadata for each kernel
      kernels.forEach((kernel, index) => {
        output += `!${index} = !{ptr @${kernel.getName()}, !"kernel", i32 1}\n`;
      });

      // Add the opencl.kernels metadata node
      const kernelRefs = kernels.map((_, i) => `!${i}`).join(", ");
      output += `!opencl.kernels = !{${kernelRefs}}\n`;
    }

    return output;
  }
}

export { AMDGPUIntrinsics };
