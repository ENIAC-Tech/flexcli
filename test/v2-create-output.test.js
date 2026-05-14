import test from 'node:test';
import assert from 'node:assert/strict';

import { formatV2CreateSuccessMessage } from '../src/commands/v2/create.js';

test('formats v2 create success output without logger prefixes', () => {
  const output = formatV2CreateSuccessMessage({
    name: 'Test',
    baseDir: 'C:\\Users\\tongy\\Desktop\\test'
  });

  assert.equal(
    output,
    [
      '',
      'Created FlexStudio v2 plugin "Test"',
      '',
      'Path:',
      '  C:\\Users\\tongy\\Desktop\\test',
      '',
      'Next steps:',
      '  cd test',
      '  npm install',
      '  npm run build',
      '  npm run dev'
    ].join('\n')
  );
  assert.equal(output.includes('> LOG'), false);
});
