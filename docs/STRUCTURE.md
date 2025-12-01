# Handbook Structure

The handbook has been split into modular files for easier editing and token-efficient processing.

## File Organization

```
docs/
├── handbook.tex                    # Main file (includes all sections)
├── handbook-original.tex           # Backup of original monolithic file
├── preamble.tex                    # LaTeX packages, colors, settings
├── cover.tex                       # Cover page and author information
│
├── frontmatter/
│   └── preface.tex                # Preface chapter
│
├── part1-introduction/
│   ├── part.tex                   # Part I header
│   ├── chapter1-what-is-llvm-ir.tex
│   └── chapter2-why-llvm-for-typescript.tex
│
├── part2-getting-started/
│   ├── part.tex                   # Part II header
│   ├── chapter3-installation.tex
│   └── chapter4-implementing-functions.tex
│
├── part3-multi-arch/
│   ├── part.tex                   # Part III header
│   ├── chapter5-compiling-architectures.tex
│   └── chapter6-gpu-programming.tex
│
├── part4-reference/
│   ├── part.tex                   # Part IV header
│   ├── chapter7-instruction-reference.tex
│   ├── chapter8-memory-model.tex
│   └── chapter9-type-system.tex
│
└── part5-advanced/
    ├── part.tex                   # Part V header
    ├── chapter10-gpu-memory.tex
    └── chapter11-future-work.tex
```

## Compilation

```bash
cd docs
pdflatex handbook.tex
pdflatex handbook.tex  # Run twice for TOC and references
```

## Editing Workflow

To edit a specific chapter:

1. **Identify the file** from the structure above
2. **Edit the chapter file** directly (e.g., `part3-multi-arch/chapter5-compiling-architectures.tex`)
3. **Compile** from the main `handbook.tex`
4. **No need to modify** `handbook.tex` unless adding/removing chapters

## Benefits

- **Token efficient**: AI assistants can read individual chapters without loading the entire 2500+ line file
- **Parallel editing**: Multiple people can work on different chapters simultaneously
- **Version control**: Git diffs are cleaner and more meaningful
- **Modularity**: Easy to reorganize, add, or remove sections
- **Focused changes**: Edits are isolated to specific files

## Adding New Content

### Add a new chapter:
1. Create `partX-name/chapterN-topic.tex`
2. Add `\input{partX-name/chapterN-topic.tex}` to `handbook.tex`

### Add a new part:
1. Create folder `partX-name/`
2. Create `partX-name/part.tex` with `\part{Title}`
3. Add chapters as above
4. Add inputs to `handbook.tex` in the appropriate section

### Modify cover or preamble:
- **Packages/colors/settings**: Edit `preamble.tex`
- **Cover design**: Edit `cover.tex`
- **Author info page**: Edit `cover.tex` (second page)

## Common Tasks

### Extend a specific section
```bash
# Example: Extending Chapter 5
vim part3-multi-arch/chapter5-compiling-architectures.tex
pdflatex handbook.tex
pdflatex handbook.tex
```

### Preview single chapter during editing
Use `\includeonly{}` in `handbook.tex` to compile only specific files (faster iteration).

### Restore original
```bash
cp handbook-original.tex handbook.tex
# Then re-modularize if needed
```

## File Sizes

| File | Purpose | Approx Lines |
|------|---------|--------------|
| `preamble.tex` | LaTeX setup | ~60 |
| `cover.tex` | Cover pages | ~130 |
| `handbook.tex` | Main structure | ~65 |
| Chapter files | Content | 50-350 each |

**Total**: Same content, better organized
