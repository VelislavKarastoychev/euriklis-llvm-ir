import { test, expect, describe } from "bun:test";
import {
  LLVMCodegen,
  BinaryInst,
  ICmpInst,
  PhiInst,
  SelectInst,
  SwitchInst,
  BitCastInst,
  TruncInst,
  ZExtInst,
  SExtInst,
  FPTruncInst,
  FPExtInst,
  InsertElementInst,
  ExtractElementInst,
  ShuffleVectorInst,
  AtomicRMWInst,
  AtomicCmpXchgInst,
  FenceInst,
  AtomicOrdering,
  AtomicRMWOp,
  LoadInst,
  StoreInst,
  AllocaInst,
  GetElementPtrInst,
  CallInst,
  RetInst,
  BrInst,
  BasicBlock,
  LLVMFunction,
  Parameter,
  i32,
  i64,
  i8,
  i1,
  float,
  double,
  ptr,
  FloatType,
  ArrayType,
  VectorType,
} from "../index";

describe("Binary Instructions", () => {
  test("add instruction", () => {
    const inst = new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.add,
      type: i32,
      lhs: "a",
      rhs: "b"
    });
    expect(inst.toString()).toBe("%result = add i32 %a, %b");
  });

  test("fadd instruction with constants", () => {
    const inst = new BinaryInst({
      name: "result",
      opcode: LLVMCodegen.opcodes.fadd,
      type: float,
      lhs: "x",
      rhs: 2.5
    });
    expect(inst.toString()).toBe("%result = fadd float %x, 2.5");
  });

  test("mul instruction", () => {
    const inst = new BinaryInst({
      name: "product",
      opcode: LLVMCodegen.opcodes.mul,
      type: i32,
      lhs: "x",
      rhs: 3
    });
    expect(inst.toString()).toBe("%product = mul i32 %x, 3");
  });
});

describe("Comparison Instructions", () => {
  test("icmp slt", () => {
    const inst = new ICmpInst({
      name: "cmp",
      predicate: LLVMCodegen.predicates.slt,
      type: i32,
      lhs: "x",
      rhs: 0
    });
    expect(inst.toString()).toBe("%cmp = icmp slt i32 %x, 0");
  });

  test("icmp eq", () => {
    const inst = new ICmpInst({
      name: "is_zero",
      predicate: LLVMCodegen.predicates.eq,
      type: i32,
      lhs: "val",
      rhs: 0
    });
    expect(inst.toString()).toBe("%is_zero = icmp eq i32 %val, 0");
  });
});

describe("Phi Instructions", () => {
  test("phi with two incoming values", () => {
    const block1 = new BasicBlock("entry");
    const block2 = new BasicBlock("loop");

    const inst = new PhiInst({
      name: "result",
      type: i32,
      incomingValues: [
        { value: 0, block: block1 },
        { value: "next", block: block2 }
      ]
    });
    expect(inst.toString()).toBe("%result = phi i32 [ 0, %entry ], [ %next, %loop ]");
  });
});

describe("Select Instruction", () => {
  test("select with i1 condition", () => {
    const inst = new SelectInst({
      name: "result",
      conditionType: i1,
      condition: "cond",
      type: i32,
      trueValue: "a",
      falseValue: "b"
    });
    expect(inst.toString()).toBe("%result = select i1 %cond, i32 %a, i32 %b");
  });
});

describe("Switch Instruction", () => {
  test("switch with multiple cases", () => {
    const defaultBlock = new BasicBlock("default");
    const case1 = new BasicBlock("case1");
    const case2 = new BasicBlock("case2");

    const inst = new SwitchInst({
      valueType: i32,
      value: "x",
      defaultTarget: defaultBlock,
      cases: [
        { value: 0, target: case1 },
        { value: 1, target: case2 }
      ]
    });

    const expected = `switch i32 %x, label %default [
    i32 0, label %case1
    i32 1, label %case2
  ]`;
    expect(inst.toString()).toBe(expected);
  });
});

describe("Type Conversion Instructions", () => {
  test("bitcast", () => {
    const inst = new BitCastInst({
      name: "casted",
      sourceType: i32,
      value: "x",
      targetType: float
    });
    expect(inst.toString()).toBe("%casted = bitcast i32 %x to float");
  });

  test("trunc i64 to i32", () => {
    const inst = new TruncInst({
      name: "truncated",
      sourceType: i64,
      value: "x",
      targetType: i32
    });
    expect(inst.toString()).toBe("%truncated = trunc i64 %x to i32");
  });

  test("zext i8 to i32", () => {
    const inst = new ZExtInst({
      name: "extended",
      sourceType: i8,
      value: "x",
      targetType: i32
    });
    expect(inst.toString()).toBe("%extended = zext i8 %x to i32");
  });

  test("sext i8 to i32", () => {
    const inst = new SExtInst({
      name: "extended",
      sourceType: i8,
      value: "x",
      targetType: i32
    });
    expect(inst.toString()).toBe("%extended = sext i8 %x to i32");
  });

  test("fptrunc double to float", () => {
    const inst = new FPTruncInst({
      name: "truncated",
      sourceType: double,
      value: "x",
      targetType: float
    });
    expect(inst.toString()).toBe("%truncated = fptrunc double %x to float");
  });

  test("fpext float to double", () => {
    const inst = new FPExtInst({
      name: "extended",
      sourceType: float,
      value: "x",
      targetType: double
    });
    expect(inst.toString()).toBe("%extended = fpext float %x to double");
  });
});

describe("Vector Instructions", () => {
  test("insertelement", () => {
    const vecType = new VectorType(float, 4);
    const inst = new InsertElementInst({
      name: "vec",
      vectorType: vecType,
      vector: "old_vec",
      elementType: float,
      element: "val",
      indexType: i32,
      index: 0
    });
    expect(inst.toString()).toBe("%vec = insertelement <4 x float> %old_vec, float %val, i32 0");
  });

  test("extractelement", () => {
    const vecType = new VectorType(float, 4);
    const inst = new ExtractElementInst({
      name: "elem",
      vectorType: vecType,
      vector: "vec",
      indexType: i32,
      index: 2
    });
    expect(inst.toString()).toBe("%elem = extractelement <4 x float> %vec, i32 2");
  });

  test("shufflevector", () => {
    const vecType = new VectorType(float, 4);
    const maskType = new VectorType(i32, 4);
    const inst = new ShuffleVectorInst({
      name: "shuffled",
      vectorType: vecType,
      vector1: "v1",
      vector2: "v2",
      maskType: maskType,
      mask: "mask"
    });
    expect(inst.toString()).toBe("%shuffled = shufflevector <4 x float> %v1, <4 x float> %v2, <4 x i32> %mask");
  });
});

describe("Atomic Instructions", () => {
  test("atomicrmw add", () => {
    const inst = new AtomicRMWInst({
      name: "old",
      operation: AtomicRMWOp.add,
      pointerType: ptr,
      pointer: "counter",
      valueType: i32,
      value: 1,
      ordering: AtomicOrdering.seq_cst
    });
    expect(inst.toString()).toBe("%old = atomicrmw add ptr %counter, i32 1 seq_cst");
  });

  test("cmpxchg", () => {
    const inst = new AtomicCmpXchgInst({
      name: "result",
      pointerType: ptr,
      pointer: "ptr",
      valueType: i32,
      cmp: 0,
      new: 1,
      successOrdering: AtomicOrdering.seq_cst,
      failureOrdering: AtomicOrdering.acquire
    });
    expect(inst.toString()).toBe("%result = cmpxchg ptr %ptr, i32 0, i32 1 seq_cst acquire");
  });

  test("fence", () => {
    const inst = new FenceInst({
      ordering: AtomicOrdering.seq_cst
    });
    expect(inst.toString()).toBe("fence seq_cst");
  });
});

describe("Memory Instructions", () => {
  test("alloca", () => {
    const inst = new AllocaInst({
      name: "var",
      type: i32,
      align: 4
    });
    expect(inst.toString()).toBe("%var = alloca i32, align 4");
  });

  test("alloca with addrspace (CUDA shared memory)", () => {
    const arrType = new ArrayType(float, 256);
    const inst = new AllocaInst({
      name: "shared",
      type: arrType,
      align: 4,
      addrspace: 3
    });
    expect(inst.toString()).toBe("%shared = alloca [256 x float], align 4, addrspace(3)");
  });

  test("load", () => {
    const inst = new LoadInst({
      name: "val",
      type: i32,
      pointerType: ptr,
      pointer: "ptr",
      align: 4
    });
    expect(inst.toString()).toBe("%val = load i32, ptr %ptr, align 4");
  });

  test("store", () => {
    const inst = new StoreInst({
      valueType: i32,
      value: "val",
      pointerType: ptr,
      pointer: "ptr",
      align: 4
    });
    expect(inst.toString()).toBe("store i32 %val, ptr %ptr, align 4");
  });

  test("getelementptr", () => {
    const floatType = new FloatType("float");
    const inst = new GetElementPtrInst({
      name: "ptr",
      baseType: floatType,
      ptrType: ptr,
      pointer: "arr",
      indices: [{ type: i32, value: "idx" }]
    });
    expect(inst.toString()).toBe("%ptr = getelementptr inbounds float, ptr %arr, i32 %idx");
  });
});

describe("Control Flow Instructions", () => {
  test("ret void", () => {
    const inst = new RetInst({});
    expect(inst.toString()).toBe("ret void");
  });

  test("ret with value", () => {
    const inst = new RetInst({
      type: i32,
      value: "result"
    });
    expect(inst.toString()).toBe("ret i32 %result");
  });

  test("unconditional branch", () => {
    const target = new BasicBlock("next");
    const inst = new BrInst({ target });
    expect(inst.toString()).toBe("br label %next");
  });

  test("conditional branch", () => {
    const trueBlock = new BasicBlock("then");
    const falseBlock = new BasicBlock("else");
    const inst = new BrInst({
      condition: "cond",
      conditionType: i1,
      target: trueBlock,
      falseTarget: falseBlock
    });
    expect(inst.toString()).toBe("br i1 %cond, label %then, label %else");
  });
});

describe("Call Instruction", () => {
  test("call with no args", () => {
    const inst = new CallInst({
      returnType: i32,
      functionName: "foo"
    });
    expect(inst.toString()).toBe("call i32 @foo()");
  });

  test("call with return value", () => {
    const inst = new CallInst({
      name: "result",
      returnType: i32,
      functionName: "foo"
    });
    expect(inst.toString()).toBe("%result = call i32 @foo()");
  });

  test("call with args", () => {
    const inst = new CallInst({
      name: "result",
      returnType: i32,
      functionName: "add",
      args: [
        { type: i32, value: "a" },
        { type: i32, value: "b" }
      ]
    });
    expect(inst.toString()).toBe("%result = call i32 @add(i32 %a, i32 %b)");
  });
});
