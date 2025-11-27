import {
  LLVMCodegen,
  Module,
  LLVMFunction,
  BasicBlock,
  Parameter,
  BinaryInst,
  RetInst,
  Validator,
  ValidationError,
  i32,
} from ".";

/**
 * Example demonstrating IR validation
 */

async function exampleValidation() {
  console.log("=== IR Validation Examples ===\n");

  // Example 1: Valid IR
  console.log("1. Valid IR:");
  const validModule = new Module("valid");
  const func = new LLVMFunction({
    name: "add",
    returnType: i32
  });
  func.addParameter(new Parameter({ type: i32, name: "a" }));
  func.addParameter(new Parameter({ type: i32, name: "b" }));

  const entry = new BasicBlock("entry");
  entry.addInstruction(new BinaryInst({
    name: "result",
    opcode: LLVMCodegen.opcodes.add,
    type: i32,
    lhs: "a",
    rhs: "b"
  }));
  entry.setTerminator(new RetInst({ type: i32, value: "result" }));

  func.addBasicBlock(entry);
  validModule.addFunction(func);

  // Method 1: Using Validator directly (synchronous)
  const result1 = Validator.validateDetailed(validModule);
  console.log("  Using Validator.validateDetailed():");
  console.log(`  Valid: ${result1.valid}`);
  console.log(`  Errors: ${result1.errors.length}`);
  console.log(`  Warnings: ${result1.warnings.length}`);
  console.log();

  // Method 2: Using module.validateDetailed() (async)
  const result2 = await validModule.validateDetailed();
  console.log("  Using module.validateDetailed():");
  console.log(`  Valid: ${result2.valid}`);
  console.log(`  Errors: ${result2.errors.length}`);
  console.log(`  Warnings: ${result2.warnings.length}`);
  console.log();

  // Example 2: Invalid IR - missing terminator
  console.log("2. Invalid IR (missing terminator):");
  const invalidModule = new Module("invalid");
  const badFunc = new LLVMFunction({
    name: "bad",
    returnType: i32
  });

  const badEntry = new BasicBlock("entry");
  // No terminator!

  badFunc.addBasicBlock(badEntry);
  invalidModule.addFunction(badFunc);

  const result3 = Validator.validateDetailed(invalidModule);
  console.log(`  Valid: ${result3.valid}`);
  console.log(`  Errors: ${result3.errors.length}`);
  console.log(`  Error message: ${result3.errors[0].message}`);
  console.log();

  // Example 3: Throwing on validation error
  console.log("3. Using validate() that throws:");
  try {
    Validator.validate(invalidModule);
    console.log("  No error thrown (unexpected!)");
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`  ✓ ValidationError thrown: ${error.message}`);
    }
  }
  console.log();

  // Example 4: Async module.validate() that throws
  console.log("4. Using async module.validate():");
  try {
    await invalidModule.validate();
    console.log("  No error thrown (unexpected!)");
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`  ✓ ValidationError thrown: ${error.message}`);
    }
  }
  console.log();

  console.log("=== Validation Methods Summary ===");
  console.log("Synchronous (use Validator directly):");
  console.log("  • Validator.validate(module)         - throws on error");
  console.log("  • Validator.validateDetailed(module) - returns detailed results");
  console.log();
  console.log("Asynchronous (use module methods):");
  console.log("  • await module.validate()            - throws on error");
  console.log("  • await module.validateDetailed()    - returns detailed results");
  console.log();
  console.log("Use synchronous for build scripts, async for runtime validation.");
}

// Run example
exampleValidation().catch(console.error);
