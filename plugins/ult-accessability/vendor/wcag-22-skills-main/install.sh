#!/usr/bin/env bash
# ==============================================================================
# WCAG 2.2 Rules Installer for Popular AI IDEs & Coding Assistants
# Supports: Cursor, GitHub Copilot (VS Code/JetBrains), Windsurf, Cline, Claude Code
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat << EOF
Usage:
  ./install.sh <ide> <level> [target_directory]

Arguments:
  <ide>              Target IDE / coding assistant:
                     - cursor    : Installs .cursor/rules/wcag-22-<level>.mdc
                     - copilot   : Installs .github/copilot-instructions.md
                     - windsurf  : Installs .windsurfrules
                     - cline     : Installs .clinerules
                     - claude    : Appends guidelines to CLAUDE.md
                     - all       : Installs configuration for all supported tools
  <level>            Accessibility standard level:
                     - aa        : WCAG 2.2 Level AA (Standard / Legal Baseline)
                     - aaa       : WCAG 2.2 Level AAA (Enhanced / High-Inclusion)
  [target_directory] Optional target project directory (defaults to current working directory)

Examples:
  ./install.sh cursor aa
  ./install.sh copilot aa ~/projects/my-web-app
  ./install.sh windsurf aaa .
  ./install.sh all aa ~/projects/my-web-app
EOF
  exit 1
}

if [ "$#" -lt 2 ]; then
  usage
fi

IDE="$(echo "$1" | tr '[:upper:]' '[:lower:]')"
LEVEL="$(echo "$2" | tr '[:upper:]' '[:lower:]')"
LEVEL_UPPER="$(echo "$LEVEL" | tr '[:lower:]' '[:upper:]')"
TARGET_DIR="${3:-.}"

if [[ "$LEVEL" != "aa" && "$LEVEL" != "aaa" ]]; then
  echo "Error: Invalid compliance level '$LEVEL'. Choose 'aa' or 'aaa'."
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Target directory '$TARGET_DIR' does not exist. Creating it..."
  mkdir -p "$TARGET_DIR"
fi

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

install_cursor() {
  echo "-> Installing Cursor rules (Level ${LEVEL_UPPER}) to $TARGET_DIR/.cursor/rules/"
  mkdir -p "$TARGET_DIR/.cursor/rules"
  cp "$SCRIPT_DIR/templates/cursor/wcag-22-$LEVEL.mdc" "$TARGET_DIR/.cursor/rules/wcag-22-$LEVEL.mdc"
  echo "   [✓] Created $TARGET_DIR/.cursor/rules/wcag-22-$LEVEL.mdc"
}

install_copilot() {
  echo "-> Installing GitHub Copilot instructions (Level ${LEVEL_UPPER}) to $TARGET_DIR/.github/"
  mkdir -p "$TARGET_DIR/.github"
  cp "$SCRIPT_DIR/templates/copilot/wcag-22-$LEVEL.copilot-instructions.md" "$TARGET_DIR/.github/copilot-instructions.md"
  echo "   [✓] Created $TARGET_DIR/.github/copilot-instructions.md"
}

install_windsurf() {
  echo "-> Installing Windsurf Cascade rules (Level ${LEVEL_UPPER}) to $TARGET_DIR/.windsurfrules"
  cp "$SCRIPT_DIR/templates/windsurf/wcag-22-$LEVEL.windsurfrules" "$TARGET_DIR/.windsurfrules"
  echo "   [✓] Created $TARGET_DIR/.windsurfrules"
}

install_cline() {
  echo "-> Installing Cline/Roo Code rules (Level ${LEVEL_UPPER}) to $TARGET_DIR/.clinerules"
  cp "$SCRIPT_DIR/templates/cline/wcag-22-$LEVEL.clinerules" "$TARGET_DIR/.clinerules"
  echo "   [✓] Created $TARGET_DIR/.clinerules"
}

install_claude() {
  echo "-> Appending Claude Code instructions (Level ${LEVEL_UPPER}) to $TARGET_DIR/CLAUDE.md"
  touch "$TARGET_DIR/CLAUDE.md"
  echo "" >> "$TARGET_DIR/CLAUDE.md"
  cat "$SCRIPT_DIR/templates/claude/CLAUDE-wcag-22-$LEVEL.md" >> "$TARGET_DIR/CLAUDE.md"
  echo "   [✓] Updated $TARGET_DIR/CLAUDE.md"
}

case "$IDE" in
  cursor)
    install_cursor
    ;;
  copilot)
    install_copilot
    ;;
  windsurf)
    install_windsurf
    ;;
  cline)
    install_cline
    ;;
  claude)
    install_claude
    ;;
  all)
    install_cursor
    install_copilot
    install_windsurf
    install_cline
    install_claude
    ;;
  *)
    echo "Error: Unknown IDE/tool '$IDE'."
    usage
    ;;
esac

echo ""
echo "Successfully installed WCAG 2.2 Level ${LEVEL_UPPER} standards for $IDE!"
