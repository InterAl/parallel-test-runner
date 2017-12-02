const program = require('commander');
const createRunner = require('./runner');

program
    .option('--pattern <n>', 'Test files pattern')
    .option('--shuffle', 'Shuffle files order (random order of execution). Default: false')
    .option('--slow-test-pattern <n>', 'Slow tests pattern. Matched tests will be run in a separate process')
    .option('--process-path <n>', 'Test runner process path')
    .option('--mocha', 'Run Mocha (default)')
    .option('--jest', 'Run Jest')
    .option('--runner-args <n>', 'Test runner args')
    .parse(process.argv);

console.log('ppp', program.mocha);

// createRunner()
//     .config({
//         pattern: program.pattern,
//         shuffleFiles: program.shuffle,
//     });
