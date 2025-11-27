import { Module, LLVMFunction, BasicBlock } from "./module";
import { Terminator, PhiInst, Instruction } from "./instructions";

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validation warnings (non-fatal issues)
 */
export class ValidationWarning {
  constructor(public message: string) {}

  toString(): string {
    return `Warning: ${this.message}`;
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validator for LLVM IR
 */
export class Validator {
  private errors: ValidationError[] = [];
  private warnings: ValidationWarning[] = [];

  /**
   * Validate a module
   */
  validateModule(module: Module): ValidationResult {
    this.errors = [];
    this.warnings = [];

    const children = module.getChildren();

    // Check if module is empty
    if (children.length === 0) {
      this.warnings.push(new ValidationWarning("Module is empty"));
    }

    // Validate all functions
    for (const child of children) {
      if (child instanceof LLVMFunction) {
        this.validateFunction(child);
      }
    }

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Validate a function
   */
  private validateFunction(func: LLVMFunction): void {
    const blocks = func.getBasicBlocks();

    // Check if function has basic blocks
    if (blocks.length === 0) {
      this.warnings.push(
        new ValidationWarning(`Function @${func.getName()} has no basic blocks`)
      );
      return;
    }

    // Validate each basic block
    for (const block of blocks) {
      this.validateBasicBlock(block, func.getName());
    }
  }

  /**
   * Validate a basic block
   */
  private validateBasicBlock(block: BasicBlock, funcName: string): void {
    // Get instructions via reflection
    const instructions = (block as any).instructions as Instruction[];
    const terminator = (block as any).terminator;

    // Check if block has a terminator
    if (!terminator) {
      this.errors.push(
        new ValidationError(
          `Basic block %${block.getName()} in function @${funcName} has no terminator instruction`
        )
      );
    }

    // Check if terminator is actually a Terminator
    if (terminator && !(terminator instanceof Terminator)) {
      this.errors.push(
        new ValidationError(
          `Basic block %${block.getName()} in function @${funcName} has non-terminator as terminator`
        )
      );
    }

    // Check that phi instructions are at the beginning
    let foundNonPhi = false;
    for (const inst of instructions) {
      if (inst instanceof PhiInst) {
        if (foundNonPhi) {
          this.errors.push(
            new ValidationError(
              `Phi instruction must be at the beginning of basic block %${block.getName()} in function @${funcName}`
            )
          );
        }
      } else {
        foundNonPhi = true;
      }
    }

    // Warn if block is empty (only terminator)
    if (instructions.length === 0 && terminator) {
      this.warnings.push(
        new ValidationWarning(
          `Basic block %${block.getName()} in function @${funcName} is empty (only has terminator)`
        )
      );
    }
  }

  /**
   * Quick validation that throws on first error
   */
  static validate(module: Module): void {
    const validator = new Validator();
    const result = validator.validateModule(module);

    if (!result.valid) {
      throw result.errors[0];
    }
  }

  /**
   * Validate and return detailed results
   */
  static validateDetailed(module: Module): ValidationResult {
    const validator = new Validator();
    return validator.validateModule(module);
  }
}
