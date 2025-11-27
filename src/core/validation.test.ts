import { test, expect, describe } from "bun:test";
import {
  Module,
  LLVMFunction,
  BasicBlock,
  Parameter,
  RetInst,
  BrInst,
  BinaryInst,
  PhiInst,
  Validator,
  ValidationError,
  i32,
  LLVMCodegen,
} from "../index";

describe("Validation", () => {
  test("valid function with terminator", () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });

    const entry = new BasicBlock("entry");
    entry.setTerminator(new RetInst({
      type: i32,
      value: 0
    }));

    func.addBasicBlock(entry);
    module.addFunction(func);

    const result = Validator.validateDetailed(module);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test("invalid: missing terminator", () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });

    const entry = new BasicBlock("entry");
    // No terminator!

    func.addBasicBlock(entry);
    module.addFunction(func);

    const result = Validator.validateDetailed(module);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("no terminator");
  });

  test("validate() method throws on error", () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });

    const entry = new BasicBlock("entry");
    // No terminator!

    func.addBasicBlock(entry);
    module.addFunction(func);

    expect(() => Validator.validate(module)).toThrow(ValidationError);
  });

  test("module.validate() convenience method", async () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });

    const entry = new BasicBlock("entry");
    // No terminator!

    func.addBasicBlock(entry);
    module.addFunction(func);

    await expect(module.validate()).rejects.toThrow();
  });

  test("warning: empty module", () => {
    const module = new Module("empty");

    const result = Validator.validateDetailed(module);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("empty");
  });

  test("warning: function with no basic blocks", () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });
    // No basic blocks!
    module.addFunction(func);

    const result = Validator.validateDetailed(module);
    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("no basic blocks");
  });

  test("invalid: phi not at beginning", () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });

    const entry = new BasicBlock("entry");
    const loop = new BasicBlock("loop");

    // Add a regular instruction first
    entry.addInstruction(new BinaryInst({
      name: "x",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: 1,
      rhs: 2
    }));

    // Then add phi (INVALID!)
    entry.addInstruction(new PhiInst({
      name: "bad",
      type: i32,
      incomingValues: [
        { value: 0, block: entry },
        { value: 1, block: loop }
      ]
    }));

    entry.setTerminator(new RetInst({ type: i32, value: 0 }));

    func.addBasicBlock(entry);
    module.addFunction(func);

    const result = Validator.validateDetailed(module);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.message.includes("Phi instruction must be at the beginning"))).toBe(true);
  });

  test("valid: phi at beginning", () => {
    const module = new Module("test");
    const func = new LLVMFunction({
      name: "foo",
      returnType: i32
    });

    const entry = new BasicBlock("entry");
    const loop = new BasicBlock("loop");

    // Phi first (VALID!)
    loop.addInstruction(new PhiInst({
      name: "i",
      type: i32,
      incomingValues: [
        { value: 0, block: entry },
        { value: "next", block: loop }
      ]
    }));

    // Then regular instruction
    loop.addInstruction(new BinaryInst({
      name: "next",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: "i",
      rhs: 1
    }));

    entry.setTerminator(new BrInst({ target: loop }));
    loop.setTerminator(new BrInst({ target: loop }));

    func.addBasicBlock(entry);
    func.addBasicBlock(loop);
    module.addFunction(func);

    const result = Validator.validateDetailed(module);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
