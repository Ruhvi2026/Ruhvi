const path = require('path');

const batchCommands = (filenames, cmd) => {
  const validFiles = filenames.filter(
    (f) => !f.includes('ruhvi-mobile_DO_NOT_DELETE')
  );
  if (validFiles.length === 0) return [];
  const batchSize = 40;
  const batches = [];
  for (let i = 0; i < validFiles.length; i += batchSize) {
    const batch = validFiles
      .slice(i, i + batchSize)
      .map((f) => `"${path.relative(process.cwd(), f)}"`)
      .join(' ');
    batches.push(`${cmd} ${batch}`);
  }
  return batches;
};

module.exports = {
  '*.{js,jsx,ts,tsx}': [
    (filenames) => batchCommands(filenames, 'eslint --fix'),
    (filenames) => batchCommands(filenames, 'prettier --write'),
  ],
  '*.{json,css,md}': [
    (filenames) => batchCommands(filenames, 'prettier --write'),
  ],
};
