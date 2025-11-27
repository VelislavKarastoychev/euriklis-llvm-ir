import { LLVMCodegen } from "../../core/codegen";
import { LLVMFunction } from "../../core/module";
import { NVPTXIntrinsics } from "./intrinsics";

/**
 * NVPTX (CUDA) code generator
 * Targets NVIDIA GPUs via NVVM IR dialect
 */
export class NVVMCodegen extends LLVMCodegen {
  // CUDA/NVPTX intrinsics for thread/block indexing
  static readonly cuda = NVPTXIntrinsics;

  constructor(moduleName: string) {
    super(moduleName);

    // NVPTX target configuration
    this.targetTriple = "nvptx64-nvidia-cuda";
    this.dataLayout = "e-p:64:64:64-i1:8:8-i8:8:8-i16:16:16-i32:32:32-i64:64:64-i128:128:128-f32:32:32-f64:64:64-v16:16:16-v32:32:32-v64:64:64-v128:128:128-n16:32:64";
  }

  /**
   * Generate NVVM IR with CUDA-specific metadata
   */
  toString(): string {
    let output = super.toString();

    // Collect all kernel functions
    const kernels: LLVMFunction[] = [];
    for (const child of this.module.getChildren()) {
      if (child instanceof LLVMFunction && child.isKernelFunction()) {
        kernels.push(child);
      }
    }

    // Add NVVM kernel annotations
    if (kernels.length > 0) {
      output += "\n";

      // Add metadata declarations for each kernel
      kernels.forEach((kernel, idx) => {
        output += `!${idx} = !{ptr @${kernel.getName()}, !"kernel", i32 1}\n`;
      });

      // Add !nvvm.annotations metadata
      const metadataRefs = kernels.map((_, idx) => `!${idx}`).join(", ");
      output += `!nvvm.annotations = !{${metadataRefs}}\n`;
    }

    return output;
  }

  /**
   * Helper to mark a function as a CUDA kernel
   * This adds the necessary metadata for NVVM to recognize it as a kernel entry point
   */
  static markAsKernel(func: LLVMFunction): void {
    func.setKernel(true);
  }
}

// Re-export intrinsics for convenience
export { NVPTXIntrinsics } from "./intrinsics";
