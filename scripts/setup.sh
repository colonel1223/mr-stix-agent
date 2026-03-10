#!/usr/bin/env bash

# ╔══════════════════════════════════════════════════════╗
# ║  MR. STIX — INSTALLATION SCRIPT                     ║
# ║  Run once. He'll take it from here.                  ║
# ╚══════════════════════════════════════════════════════╝

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}"
cat << 'ASCII'
  ◉ ◉
   ⌣
   ╤
───┼───
   │      MR. STIX INSTALLER
  ╱ ╲     v1.0.0
 ╱   ╲
🥾    🥾
ASCII
echo -e "${NC}"

echo -e "${CYAN}[1/5]${NC} Preflight checks..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js not found. Install 18+ first."
    exit 1
fi
echo -e "  ${GREEN}✓${NC} Node.js $(node -v)"
echo -e "  ${GREEN}✓${NC} npm $(npm -v)"

echo ""
echo -e "${CYAN}[2/5]${NC} Installing dependencies..."
npm install 2>&1 | tail -3
echo -e "  ${GREEN}✓${NC} Dependencies installed"

echo ""
echo -e "${CYAN}[3/5]${NC} Creating workspace..."
mkdir -p workspace logs
echo -e "  ${GREEN}✓${NC} ./workspace and ./logs created"

echo ""
echo -e "${CYAN}[4/5]${NC} Environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "  ${YELLOW}!${NC} Created .env — add your ANTHROPIC_API_KEY"
else
    echo -e "  ${GREEN}✓${NC} .env exists"
fi

echo ""
echo -e "${CYAN}[5/5]${NC} Git setup..."
if [ ! -d .git ] && command -v git &> /dev/null; then
    git init --quiet
    printf 'node_modules/\n.env\nworkspace/\nlogs/\ndist/\n.stix-memory.json\n' > .gitignore
    echo -e "  ${GREEN}✓${NC} Initialized"
fi

echo ""
echo -e "${GREEN}${BOLD}  Mr. Stix is ready.${NC}"
echo ""
echo -e "  1. Add API key:       ${CYAN}nano .env${NC}"
echo -e "  2. Interactive mode:  ${CYAN}npm run stix${NC}"
echo -e "  3. Single task:       ${CYAN}npm run stix -- \"your task\"${NC}"
echo -e "  4. Full UI + server:  ${CYAN}npm run dev${NC}"
echo ""
echo -e "${DIM}  Simple. Don't underestimate him.${NC}"
echo ""
