#!/bin/bash

# Security Audit Script for Scratch 'n SOL

echo "=========================================="
echo "Scratch 'n SOL Security Audit"
echo "=========================================="
echo ""

# Check Node.js version
echo "1. Checking Node.js version..."
node --version
echo ""

# Check for .env file
echo "2. Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✓ .env file exists"
else
    echo "✗ .env file missing!"
fi
echo ""

# Check for .env in .gitignore
echo "3. Checking .gitignore..."
if grep -q "\.env" .gitignore; then
    echo "✓ .env is in .gitignore"
else
    echo "✗ .env is NOT in .gitignore!"
fi
echo ""

# Run npm audit
echo "4. Running npm audit..."
npm audit --audit-level=high
echo ""

# Check TypeScript compilation
echo "5. Checking TypeScript compilation..."
npx tsc --noEmit 2>/dev/null && echo "✓ TypeScript OK" || echo "✗ TypeScript errors found"
echo ""

echo "=========================================="
echo "Audit Complete"
echo "=========================================="
