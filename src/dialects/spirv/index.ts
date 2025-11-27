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
   * Generate SPIR-V compatible LLVM IR with OpenCL kernel metadata and external function declarations
   */
  toString(): string {
    const baseOutput = super.toString();

    // Extract external function declarations from the IR
    // Look for all @_Z* and @llvm.* calls that need declarations
    const externalFunctions = new Set<string>();
    const callPattern = /call\s+(?:spir_func\s+)?(\w+)\s+@([_A-Za-z][_A-Za-z0-9.]*)\s*\(([^)]*)\)/g;

    let match;
    while ((match = callPattern.exec(baseOutput)) !== null) {
      const [_, returnType, funcName, argsWithValues] = match;

      // Add declaration for OpenCL builtins and LLVM intrinsics
      if (funcName.startsWith('_Z') || funcName.startsWith('llvm.')) {
        // Extract just the types from "type value, type value" format
        const paramTypes = argsWithValues
          .split(',')
          .map(arg => {
            const trimmed = arg.trim();
            // Extract type (everything before the last space or %)
            const typeMatch = trimmed.match(/^([\w<>]+(?:\s+[\w<>]+)*?)(?:\s+[%@]|\s+[-0-9])/);
            return typeMatch ? typeMatch[1] : trimmed.split(/\s+/)[0];
          })
          .filter(t => t)
          .join(', ');

        externalFunctions.add(`declare ${funcName.startsWith('_Z') ? 'spir_func ' : ''}${returnType} @${funcName}(${paramTypes})`);
      }
    }

    // Build final output with declarations before functions
    let output = "";
    const lines = baseOutput.split('\n');
    let inFunctionDef = false;

    for (const line of lines) {
      // Insert declarations before first function definition
      if (!inFunctionDef && line.startsWith('define ')) {
        // Add all external function declarations
        if (externalFunctions.size > 0) {
          output += Array.from(externalFunctions).sort().join('\n') + '\n\n';
        }
        inFunctionDef = true;
      }
      output += line + '\n';
    }

    // Collect all kernel functions
    const kernels = this.module.getChildren().filter(
      (child): child is LLVMFunction =>
        child instanceof LLVMFunction && child.isKernelFunction()
    );

    // Add OpenCL kernel metadata if we have kernels
    if (kernels.length > 0) {
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
