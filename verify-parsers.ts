import {
  initializeParsers,
  getSupportedLanguages,
  getParser,
} from './packages/core/src/index';
import * as path from 'path';

async function verify() {
  console.log('🚀 Verifying language parsers and WASM discovery...');
  console.log('Current CWD:', process.cwd());
  console.log('Current __dirname:', __dirname);

  const languages = getSupportedLanguages();
  console.log('Supported languages:', languages.join(', '));

  try {
    await initializeParsers();
    console.log('✅ All parsers initialized successfully!');

    // Verify specific problematic parsers
    const testFiles = {
      python: 'test.py',
      java: 'Test.java',
      go: 'test.go',
      csharp: 'test.cs',
    };

    for (const [lang, file] of Object.entries(testFiles)) {
      const parser = getParser(file);
      if (parser) {
        console.log(`Checking ${lang} parser...`);
        // @ts-ignore - accessing private field for verification
        if (parser.parser) {
          console.log(`  ✅ ${lang} tree-sitter parser is READY`);
        } else {
          console.log(`  ❌ ${lang} tree-sitter parser is NOT READY`);
        }
      } else {
        console.log(`  ❌ No parser found for ${file}`);
      }
    }
  } catch (error) {
    console.error('❌ Parser initialization failed:', error);
    process.exit(1);
  }
}

verify();
