# Understand Command Implementation

This is the main `/understand` command implementation based on the understand skill specification.

## Overview

The `/understand` command analyzes codebases to produce interactive knowledge graphs for understanding architecture, components, and relationships. It follows a comprehensive 7-phase process described in the SKILL.md specification.

## Usage

```bash
node understand.js [--full] [--auto-update] [--no-auto-update] [--review] [--language <lang>] [--exclude <patterns>] [directory]
```

### Arguments

- **`--full`** - Force a full rebuild, ignoring any existing graph
- **`--auto-update`** - Enable automatic graph updates on commit (writes `autoUpdate: true` to `$UA_DIR/config.json`)
- **`--no-auto-update`** - Disable automatic graph updates (writes `autoUpdate: false` to `$UA_DIR/config.json`)
- **`--review`** - Run full LLM graph-reviewer instead of inline deterministic validation
- **`--language <lang>`** - Generate all textual content in specified language (ISO 639-1 codes or friendly names)
- **`--exclude <patterns>`** - Comma-separated glob patterns for additional files/directories to exclude from analysis
- **`directory`** - Target directory to analyze (defaults to current working directory)

## Phases

The understand command follows these phases:

1. **Phase 0 - Pre-flight**: Determine analysis type, resolve directories, check for existing graphs
2. **Phase 0.5 - Ignore Configuration**: Setup .understandignore file
3. **Phase 1 - SCAN**: Scan project files to discover all files and detect languages/frameworks
4. **Phase 1.5 - BATCH**: Compute semantic batches for analysis
5. **Phase 2 - ANALYZE**: Analyze files using subagents (up to 5 concurrent)
6. **Phase 3 - ASSEMBLE REVIEW**: Review assembled graph (full analysis only)
7. **Phase 4 - ARCHITECTURE**: Identify architectural layers
8. **Phase 5 - TOUR**: Build guided tour
9. **Phase 6 - REVIEW**: Validate knowledge graph
10. **Phase 7 - SAVE**: Save knowledge graph

## Implementation Status

This is a skeleton implementation that provides the basic structure and command-line interface following the SKILL.md specification. The following components are implemented:

- Command-line argument parsing
- Basic progress reporting
- Phase orchestration
- Project root and data directory resolution
- Git integration
- Existing graph detection

## Current Limitations

The implementation is incomplete and missing:

- Subagent integration (project-scanner, file-analyzer, assemble-reviewer, architecture-analyzer, tour-builder, graph-reviewer)
- Full phase implementations
- All the specific scripts referenced in the specification
- Error handling and recovery
- Language configuration
- Exclude pattern processing

## Files Included

This implementation includes:

1. **`understand.js`** - Main command-line interface
2. **All existing scripts from the understand skill directory** (for reference)
3. **Specification documentation** (`SKILL.md`)

## Next Steps

To complete the implementation, the following would need to be added:

1. Implement the missing subagent integrations
2. Complete all phase implementations
3. Add full script integration
4. Implement error handling and recovery
5. Add language configuration support
6. Implement exclude pattern processing
7. Add comprehensive testing

## License

This implementation is based on the understand skill specification and follows the existing project structure.
