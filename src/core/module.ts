// Import LLVMType for type safety
import type { LLVMType } from "./types";

/**
 * Base class for all LLVM IR nodes in the AST
 * Uses parent/children tree structure for containment hierarchy
 */
export abstract class LLVMNode {
  protected parent: LLVMNode | null = null;
  protected children: LLVMNode[] = [];

  /**
   * Get the parent node in the tree
   */
  getParent(): LLVMNode | null {
    return this.parent;
  }

  /**
   * Set the parent node
   */
  setParent(parent: LLVMNode | null): void {
    this.parent = parent;
  }

  /**
   * Get all children of this node
   */
  getChildren(): LLVMNode[] {
    return this.children;
  }

  /**
   * Add a child node
   */
  addChild(child: LLVMNode): void {
    this.children.push(child);
    child.setParent(this);
  }

  /**
   * Remove a child node
   */
  removeChild(child: LLVMNode): boolean {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.setParent(null);
      return true;
    }
    return false;
  }

  /**
   * Convert this node and its children to LLVM IR string
   */
  abstract toString(): string;
}

/**
 * Base class for all LLVM values (things that have a name and type)
 */
export abstract class LLVMValue extends LLVMNode {
  protected name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }
}

/**
 * LLVM Module - top level container for globals and functions
 */
export class Module extends LLVMNode {
  private moduleName: string;

  constructor(name: string) {
    super();
    this.moduleName = name;
  }

  getModuleName(): string {
    return this.moduleName;
  }

  /**
   * Add a global variable to the module
   */
  addGlobal(global: GlobalVariable): void {
    this.addChild(global);
  }

  /**
   * Add a function to the module
   */
  addFunction(func: LLVMFunction): void {
    this.addChild(func);
  }

  /**
   * Validate the module IR
   * @throws ValidationError if validation fails
   */
  async validate(): Promise<void> {
    // Dynamic import to avoid circular dependency
    const { Validator } = await import("./validation");
    Validator.validate(this);
  }

  /**
   * Validate the module and return detailed results
   */
  async validateDetailed(): Promise<any> {
    // Dynamic import to avoid circular dependency
    const { Validator } = await import("./validation");
    return Validator.validateDetailed(this);
  }

  toString(): string {
    if (this.children.length === 0) {
      return `; ModuleID = '${this.moduleName}'\n`;
    }
    return `; ModuleID = '${this.moduleName}'\n\n` +
           this.children.map(child => child.toString()).join('\n\n');
  }
}

/**
 * Global variable declaration
 */
export class GlobalVariable extends LLVMValue {
  private isConstant: boolean;
  private initializer: string | null = null;

  constructor(name: string, isConstant: boolean = false) {
    super(name);
    this.isConstant = isConstant;
  }

  setInitializer(value: string): void {
    this.initializer = value;
  }

  toString(): string {
    const constKeyword = this.isConstant ? 'constant' : 'global';
    const init = this.initializer ?? 'zeroinitializer';
    return `@${this.name} = ${constKeyword} ${init}`;
  }
}

/**
 * Function parameter options
 */
export interface ParameterOptions {
  type: LLVMType;
  name: string;
}

/**
 * Function parameter
 */
export class Parameter extends LLVMValue {
  private paramType: LLVMType;

  constructor(options: ParameterOptions) {
    super(options.name);
    this.paramType = options.type;
  }

  getType(): LLVMType {
    return this.paramType;
  }

  toString(): string {
    return `${this.paramType.toString()} %${this.name}`;
  }
}

/**
 * Function options
 */
export interface LLVMFunctionOptions {
  name: string;
  returnType: LLVMType;
  /** CUDA/NVPTX: mark this function as a kernel */
  isKernel?: boolean;
  /** Custom metadata for dialect-specific annotations */
  metadata?: Map<string, any>;
}

/**
 * Function definition
 */
export class LLVMFunction extends LLVMValue {
  private returnType: LLVMType;
  private parameters: Parameter[] = [];
  private isKernel: boolean;
  private metadata: Map<string, any>;

  constructor(options: LLVMFunctionOptions) {
    super(options.name);
    this.returnType = options.returnType;
    this.isKernel = options.isKernel ?? false;
    this.metadata = options.metadata ?? new Map();
  }

  addParameter(param: Parameter): void {
    this.parameters.push(param);
  }

  addBasicBlock(block: BasicBlock): void {
    this.addChild(block);
  }

  getBasicBlocks(): BasicBlock[] {
    return this.children as BasicBlock[];
  }

  getReturnType(): LLVMType {
    return this.returnType;
  }

  getParameters(): Parameter[] {
    return this.parameters;
  }

  isKernelFunction(): boolean {
    return this.isKernel;
  }

  setKernel(isKernel: boolean): void {
    this.isKernel = isKernel;
  }

  getMetadata(): Map<string, any> {
    return this.metadata;
  }

  setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
  }

  toString(): string {
    const params = this.parameters.map(p => p.toString()).join(', ');
    const blocks = this.children.map(child => child.toString()).join('\n');

    return `define ${this.returnType.toString()} @${this.name}(${params}) {\n${blocks}\n}`;
  }
}

/**
 * Basic instruction interface (to avoid circular dependency)
 */
export interface IInstruction {
  toString(): string;
}

/**
 * Basic block - contains instructions and has control flow edges
 */
export class BasicBlock extends LLVMValue {
  private instructions: IInstruction[] = [];
  private terminator: IInstruction | null = null;

  // Control flow graph edges (graph structure, not tree)
  private successors: BasicBlock[] = [];
  private predecessors: BasicBlock[] = [];

  constructor(name: string) {
    super(name);
  }

  addInstruction(inst: IInstruction): void {
    this.instructions.push(inst);
  }

  setTerminator(term: IInstruction): void {
    this.terminator = term;
  }

  addSuccessor(block: BasicBlock): void {
    if (!this.successors.includes(block)) {
      this.successors.push(block);
      block.predecessors.push(this);
    }
  }

  getSuccessors(): BasicBlock[] {
    return this.successors;
  }

  getPredecessors(): BasicBlock[] {
    return this.predecessors;
  }

  toString(): string {
    const insts = this.instructions.map(i => `  ${i.toString()}`).join('\n');
    const term = this.terminator ? `  ${this.terminator.toString()}` : '';
    const body = [insts, term].filter(s => s).join('\n');

    return `${this.name}:\n${body}`;
  }
}
