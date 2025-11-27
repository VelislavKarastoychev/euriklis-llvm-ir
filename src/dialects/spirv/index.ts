import { LLVMCodegen } from "../../core/codegen";
import { SPIRVIntrinsics } from "./intrinsics";
import { LLVMFunction } from "../../core/module";

/**
 * SPIR-V code generator
 * Targets Intel GPUs, OpenCL, Vulkan via SPIR-V intermediate representation
 */
export class SPIRVCodegen extends LLVMCodegen {
  // Static reference to SPIR-V/OpenCL intrinsics for easy access
  static readonly opencl = SPIRVIntrinsics;

  constructor(moduleName: string) {
    super(moduleName);

    // SPIR-V target configuration (64-bit)
    this.targetTriple = "spir64-unknown-unknown";
    this.dataLayout = "e-p:64:64:64-i1:8:8-i8:8:8-i16:16:16-i32:32:32-i64:64:64-f32:32:32-f64:64:64-v16:16:16-v24:32:32-v32:32:32-v48:64:64-v64:64:64-v96:128:128-v128:128:128-v192:256:256-v256:256:256-v512:512:512-v1024:1024:1024";
  }

  /**
   * Helper to mark a function as a kernel
   * This generates the necessary !kernel metadata for OpenCL/SPIR-V
   */
  static markAsKernel(func: LLVMFunction): void {
    func.setKernel(true);
  }

  /**
   * Generate SPIR-V compatible LLVM IR with OpenCL kernel metadata
   */
  toString(): string {
    let output = super.toString();

    // Collect all kernel functions
    const kernels = this.module.getChildren().filter(
      (child): child is LLVMFunction =>
        child instanceof LLVMFunction && child.isKernelFunction()
    );

    // Add OpenCL kernel metadata if we have kernels
    if (kernels.length > 0) {
      output += "\n";

      // Generate metadata for each kernel
      kernels.forEach((kernel, index) => {
        output += `!${index} = !{ptr @${kernel.getName()}, !"kernel", i32 1}\n`;
      });

      // Add the opencl.kernels metadata node
      const kernelRefs = kernels.map((_, i) => `!${i}`).join(", ");
      output += `!opencl.kernels = !{${kernelRefs}}\n`;

      // Add OpenCL version metadata
      output += `!opencl.ocl.version = !{!${kernels.length}}\n`;
      output += `!${kernels.length} = !{i32 2, i32 0}\n`;  // OpenCL 2.0
    }

    return output;
  }
}

export { SPIRVIntrinsics };
