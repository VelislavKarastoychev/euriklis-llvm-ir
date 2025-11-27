import {
  LLVMCodegen,
  NVVMCodegen,
  AMDGPUCodegen,
  LLVMFunction,
  Parameter,
  BasicBlock,
  BinaryInst,
  RetInst,
  ICmpInst,
  BrInst,
} from ".";

// Example 1: Basic LLVM IR generation - NO MORE % PREFIXES!
function exampleBasicLLVM() {
  const codegen = new LLVMCodegen("my_module");
  const module = codegen.getModule();

  // Create a simple add function: i32 @add(i32 %a, i32 %b)
  const addFunc = new LLVMFunction({
    name: "add",
    returnType: LLVMCodegen.types.i32
  });
  addFunc.addParameter(new Parameter({
    type: LLVMCodegen.types.i32,
    name: "a"
  }));
  addFunc.addParameter(new Parameter({
    type: LLVMCodegen.types.i32,
    name: "b"
  }));

  // Create entry basic block
  const entry = new BasicBlock("entry");

  // %result = add i32 %a, %b
  // NOTE: No % needed! Just use "a" and "b"
  entry.addInstruction(new BinaryInst({
    name: "result",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: "a",  // Automatically becomes %a
    rhs: "b"   // Automatically becomes %b
  }));

  // ret i32 %result
  entry.setTerminator(new RetInst({
    type: LLVMCodegen.types.i32,
    value: "result"  // Automatically becomes %result
  }));

  addFunc.addBasicBlock(entry);
  module.addFunction(addFunc);

  console.log("=== Basic LLVM IR (clean API - no % needed!) ===");
  console.log(codegen.toString());
}

// Example 2: Using constants - numbers are automatically handled
function exampleWithConstants() {
  const codegen = new LLVMCodegen("constants_demo");
  const module = codegen.getModule();

  const func = new LLVMFunction({
    name: "multiply_by_two",
    returnType: LLVMCodegen.types.i32
  });
  func.addParameter(new Parameter({
    type: LLVMCodegen.types.i32,
    name: "x"
  }));

  const entry = new BasicBlock("entry");

  // %result = mul i32 %x, 2
  // NOTE: "x" becomes %x, but 2 stays as 2 (constant)
  entry.addInstruction(new BinaryInst({
    name: "result",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: "x",  // Variable - becomes %x
    rhs: 2     // Constant - stays as 2
  }));

  entry.setTerminator(new RetInst({
    type: LLVMCodegen.types.i32,
    value: "result"
  }));

  func.addBasicBlock(entry);
  module.addFunction(func);

  console.log("\n=== Constants Demo ===");
  console.log(codegen.toString());
}

// Example 3: Chaining instructions
function exampleChaining() {
  const codegen = new LLVMCodegen("chaining_demo");
  const module = codegen.getModule();

  const func = new LLVMFunction({
    name: "complex_math",
    returnType: LLVMCodegen.types.i32
  });
  func.addParameter(new Parameter({
    type: LLVMCodegen.types.i32,
    name: "x"
  }));

  const entry = new BasicBlock("entry");

  // %mul = mul i32 %x, 3
  const mulInst = new BinaryInst({
    name: "mul",
    opcode: LLVMCodegen.opcodes.mul,
    type: LLVMCodegen.types.i32,
    lhs: "x",
    rhs: 3
  });
  entry.addInstruction(mulInst);

  // %add = add i32 %mul, 10
  // Can reference instruction by name string or by the instruction itself!
  const addInst = new BinaryInst({
    name: "add",
    opcode: LLVMCodegen.opcodes.add,
    type: LLVMCodegen.types.i32,
    lhs: mulInst,  // Pass instruction directly! Auto-extracts %mul
    rhs: 10
  });
  entry.addInstruction(addInst);

  // %result = sub i32 %add, 5
  entry.addInstruction(new BinaryInst({
    name: "result",
    opcode: LLVMCodegen.opcodes.sub,
    type: LLVMCodegen.types.i32,
    lhs: addInst,  // Can pass previous instruction
    rhs: 5
  }));

  entry.setTerminator(new RetInst({
    type: LLVMCodegen.types.i32,
    value: "result"
  }));

  func.addBasicBlock(entry);
  module.addFunction(func);

  console.log("\n=== Chaining Demo: ((x * 3) + 10) - 5 ===");
  console.log(codegen.toString());
}

// Example 4: Control flow with branches
function exampleControlFlow() {
  const codegen = new LLVMCodegen("control_flow_demo");
  const module = codegen.getModule();

  const func = new LLVMFunction({
    name: "abs",
    returnType: LLVMCodegen.types.i32
  });
  func.addParameter(new Parameter({
    type: LLVMCodegen.types.i32,
    name: "x"
  }));

  const entry = new BasicBlock("entry");
  const negativeBlock = new BasicBlock("negative");
  const returnBlock = new BasicBlock("return");

  // entry:
  // %cmp = icmp slt i32 %x, 0
  const cmpInst = new ICmpInst({
    name: "cmp",
    predicate: LLVMCodegen.predicates.slt,
    type: LLVMCodegen.types.i32,
    lhs: "x",
    rhs: 0
  });
  entry.addInstruction(cmpInst);

  // br i1 %cmp, label %negative, label %return
  entry.setTerminator(new BrInst({
    condition: cmpInst,  // Pass instruction directly!
    conditionType: LLVMCodegen.types.i1,
    target: negativeBlock,
    falseTarget: returnBlock
  }));

  // negative:
  // %neg = sub i32 0, %x
  negativeBlock.addInstruction(new BinaryInst({
    name: "neg",
    opcode: LLVMCodegen.opcodes.sub,
    type: LLVMCodegen.types.i32,
    lhs: 0,
    rhs: "x"
  }));
  negativeBlock.setTerminator(new BrInst({
    target: returnBlock
  }));

  // return:
  // (simplified - would need phi node in real code)
  returnBlock.setTerminator(new RetInst({
    type: LLVMCodegen.types.i32,
    value: "x"
  }));

  func.addBasicBlock(entry);
  func.addBasicBlock(negativeBlock);
  func.addBasicBlock(returnBlock);
  module.addFunction(func);

  console.log("\n=== Control Flow Demo (abs function) ===");
  console.log(codegen.toString());
}

// Example 5: NVPTX (CUDA) IR generation
function exampleNVPTX() {
  const codegen = new NVVMCodegen("cuda_module");
  const module = codegen.getModule();

  const kernel = new LLVMFunction({
    name: "my_kernel",
    returnType: LLVMCodegen.types.void
  });
  kernel.addParameter(new Parameter({
    type: LLVMCodegen.types.ptr,
    name: "input"
  }));
  kernel.addParameter(new Parameter({
    type: LLVMCodegen.types.ptr,
    name: "output"
  }));

  const entry = new BasicBlock("entry");
  entry.setTerminator(new RetInst({}));

  kernel.addBasicBlock(entry);
  module.addFunction(kernel);

  console.log("\n=== NVPTX (CUDA) IR ===");
  console.log(codegen.toString());
}

// Run examples
exampleBasicLLVM();
exampleWithConstants();
exampleChaining();
exampleControlFlow();
exampleNVPTX();
