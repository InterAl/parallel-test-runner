const _ = require('lodash');
const spawn = require('child_process').spawn;
const glob = require('glob');
const path = require('path');
const red = '\x1b[31m', green = '\x1b[32m', cyan = '\x1b[36m', reset = '\x1b[0m';

module.exports = function createRunner() {
    let config;

    return {
        run() {
            return run(config);
        },

        config(cfg) {
            config = cfg;
            return this;
        }
    };
}

function run(cfg) {
    return new Promise((resolve, reject) => glob(cfg.pattern, (err, files) => runFiles(
        Object.assign({}, cfg, {files, resolve, reject})
    ))).catch(err => {
        console.log('failed', err);
    });
}

function runFiles({
    debug,
    pattern,
    files,
    shuffleFiles,
    slowTestPatterns,
    runnerArgs,
    parallelFactor = 4,
    runner = 'mocha',
    requireFiles,
    resolve,
    reject
}) {
    const startTime = new Date();

    files = shuffleFiles ? _.shuffle(files) : files;

    const workingSet = _.reduce(files, (acc, f) => {
        const isSlow = _.some(slowTestPatterns, slowFilename => _.includes(f, slowFilename));

        acc[f] = {
            isSlow,
            isNormal: !isSlow,
            tests: [],
            result: null
        };

        return acc;
    }, {});

    const slowFiles = _.filter(_.keys(workingSet), f => workingSet[f].isSlow);

    const normalProcesses = _.range(parallelFactor).map(idx => {
        return spawnJob(runner, requireFiles);
    });

    const slowProcesses = _.map(slowFiles, f => {
        const p = spawnJob(runner, requireFiles);
        p.slowProcessor = true;
        return p;
    });

    const processes = normalProcesses.concat(slowProcesses);

    console.log('spawned %s jobs', processes.length);

    debug && processes.forEach(logProcess);

    processes.forEach((p, idx) => p.on('message', handleChildMessage.bind(null, idx, p)));

    function handleChildMessage(jobIdx, process, msg) {
        switch (msg.type) {
            case 'suiteDone':
                handleSuiteDone(jobIdx, process, msg);
                break;
            case 'testDone':
                handleTestDone(msg);
                break;
            case 'uncaughtException':
                handleUncaughtException(msg);
                break;
        }
    }

    function handleUncaughtException(msg) {
        console.error('job uncaught:', msg.error);
    }

    function handleSuiteDone(jobIdx, process, msg) {
        const result = {
            passed: msg.passed,
            duration: msg.duration,
            title: msg.title,
            filename: msg.filename,
            stats: msg.stats
        };

        workingSet[msg.filename].result = result;

        const nextFile = getNextFile(workingSet, process.isSlow);

        const inProgress = _.filter(workingSet, f => f.taken && !f.result).length;
        const completed = _.filter(workingSet, f => f.taken && f.result).length;
        const remaining = _.filter(workingSet, f => !f.taken).length;
        console.log(`${cyan}suites in progress: %s, completed: %s, remaining: %s`, inProgress, completed, remaining, reset);

        if (nextFile)
            sendFileToJob(workingSet, process, nextFile);
        else if (_.every(workingSet, r => r.result)) {
            handleAllDone();
        }
    }

    function handleTestDone({filename, title, passed, error}) {
        workingSet[filename].tests.push({
            title,
            passed,
            error
        });

        logTestResult(passed, title);
    }

    function handleAllDone() {
        const duration = new Date() - startTime;
        printSummary(workingSet, duration);
        resolve();
    }

    waitUntilJobsReady(processes)
    .then(() => {
        console.log('\n*******************\nall jobs are ready\n*******************\n');
        _.each(processes, p => {
            const file = getNextFile(workingSet, p.slowProcessor);

            if (file) {
                sendFileToJob(workingSet, p, file);
            }
        });
    });
}

function getNextFile(files, slow) {
    return _.findKey(files, f => {
        return !f.taken && (!slow || f.isSlow);
    });
}

function spawnJob(runner, requireFiles = []) {
    const args = _(requireFiles).map(f => ['--require', f]).flatten().value();

    switch (runner) {
        default:
        case 'mocha':
            return spawn('node', [...args, __dirname + '/mochaRunner.js'], {
                stdio: [null, null, null, 'ipc']
            });
            break;
        case 'jest':
            break;
    }
}

function waitUntilJobsReady(processes) {
    const promises = processes.map((p, idx) => new Promise((resolve) => {
        p.on('message', m => {
            if (_.get(m, 'type') === 'ready')
                resolve();
        });
    }));

    return Promise.all(promises);
}

function sendFileToJob(workingSet, process, filename) {
    workingSet[filename].taken = true;

    process.send({
        type: 'runFile',
        filename,
        messageTimestamp: new Date().toISOString()
    });
}

function logProcess(process, idx) {
    const log = [];

    process.stdout.setEncoding('utf8');

    process.stdout.on('data', data => {
        const line = data.toString();
        console.log(`[${idx}] ${line}`);
    });

    process.stderr.setEncoding('utf8');
    process.stderr.on('data', data => {
        const line = data.toString();
        console.error(`[${idx}] ${line}`);
    });
}

function logTestResult(passed, title) {
    if (passed) {
        console.log(green, '✓', reset, title);
    } else {
        console.log(red, '✗', reset, title);
    }
}

function printSummary(workingSet, duration) {
    const results = _.map(workingSet, 'result');
    const stats = _.map(results, 'stats');

    function getStatsSummary(statsList) {
        const sumFields = ['suites', 'tests', 'passes', 'pending', 'failures'];
        return sumFields.reduce((acc, cur) => {
            acc[cur] = _.sumBy(statsList, cur);
            return acc;
        }, {});
    }

    function getErrors() {
        return _(workingSet).map((result, filename) => {
            const errors = _.filter(result.tests, t => !t.passed);
            return _.map(errors, err => ({
                filename,
                title: err.title,
                error: err.error
            }));
        }).flatten().value();
    }

    function printErrors(errors) {
        _.each(errors, err => {
            logTestResult(false, `${err.filename}: ${err.title}`);
            console.log(err.error);
        });
    }

    const errors = getErrors();
    const hasErrors = errors.length > 0;

    const color = hasErrors ? red : green;

    console.log(color, '\n*******************\n');

    if (errors.length > 0) {
        console.log(color, errors.length, 'errors occurred');
        printErrors(errors);
    } else {
        console.log(color, 'All green');
    }

    console.log(color, '\n*******************\n');

    const summary = getStatsSummary(stats);

    console.log(hasErrors ? red : reset, 'failures:', summary.failures);
    console.log(green, 'passes:', summary.passes);
    console.log(cyan, 'pending:', summary.pending);
    console.log(reset, 'tests:', summary.tests);
    console.log('suites:', summary.suites);
    console.log('running time:', duration / 1000, 'seconds');
}
