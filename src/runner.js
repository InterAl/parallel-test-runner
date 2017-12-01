const _ = require('lodash');
const spawn = require('child_process').spawn;
const glob = require('glob');
const path = require('path');

const red = '\x1b[31m', green = '\x1b[32m', cyan = '\x1b[36m', reset = '\x1b[0m';

const startTime = new Date();

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

function run({
    pattern,
    shuffleFiles,
    slowTestPatterns,
    processName,
    getSpawnArgs,
    parallelFactor = 4
}) {
    return new Promise((resolve, reject) => {
        glob(pattern, function(err, files) {
            files = shuffleFiles ? _.shuffle(files) : files;

            const [slowFiles, normalFiles] = _.partition(files, f => {
                return _.some(slowTestPatterns, slowFilename => _.includes(f, slowFilename));
            });

            const normalFileGroups = _.reduce(normalFiles, (acc, name, idx) => {
                acc[idx % parallelFactor].push(name);
                return acc;
            }, _.range(parallelFactor).map(() => []));

            const specialFilesGroup = [slowFiles];

            const groups = normalFileGroups.concat(specialFilesGroup).filter(a => a.length);

            const processes = groups.map(
                (group, idx) => {
                    console.log('job', idx + ':', 'executing', group.length, 'files');
                    return spawnJob(processName, getSpawnArgs(group), idx);
                }
            );

            const processesPromises = processes.map(process => {
                return new Promise((resolve, reject) => {
                    process.on('exit', code => {
                        resolve(code);
                    });
                });
            });

            const processLogs = processes.map(logProcess);

            Promise.all(processesPromises)
                .then(codes => {
                    const logs = _.flatten(processLogs);
                    const errorEvents = getErrorEvents(logs);
                    const hasErrors = errorEvents.length > 0;
                    const color = hasErrors ? red : green;

                    console.log(color, '\n*******************\n');

                    if (errorEvents.length > 0) {
                        console.log(color, errorEvents.length, 'errors occurred');
                        logAllErrors(errorEvents);
                    } else {
                        console.log(color, 'All green');
                    }

                    console.log(color, '\n*******************\n');
                    const summary = getSummary(logs);
                    console.log(hasErrors ? red : reset, 'failures:', summary.failures);
                    console.log(green, 'passes:', summary.passes);
                    console.log(cyan, 'pending:', summary.pending);
                    console.log(reset, 'tests:', summary.tests);
                    console.log('suites:', summary.suites);
                    console.log('jobs exit codes:', codes);
                    console.log('running time:', (new Date() - startTime) / 1000, 'seconds');
                    // process.exit(_.max(codes));
                    resolve();
                })
                .catch(err => {
                    console.error(err);
                    // process.exit(1);
                    reject();
                });
        });
    });
}

function spawnJob(processName, spawnArgs, idx) {
    const process = spawn(processName, spawnArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    return process;
}

function logProcess(process) {
    const log = [];

    process.stdout.setEncoding('utf8');

    process.stdout.on('data', data => {
        const line = data.toString();

        try {
            const logEvent = JSON.parse(line);
            log.push(logEvent);
            printLogEvent(logEvent);
        } catch (err) {
            //caught
        }
    });

    process.stderr.setEncoding('utf8');
    process.stderr.on('data', data => {
        const line = data.toString();
        console.error(line);
    });

    return log;
}

function printLogEvent(logEvent) {
    const fullTitle = _.get(logEvent, '[1].fullTitle');

    if (logEvent[0] === 'pass')
        console.log(green, '✓', reset, fullTitle);
    else if (logEvent[0] === 'fail') {
        console.log(red, '✗', reset, fullTitle);
    }
}

function logAllErrors(errorEvents) {
    _.each(errorEvents, logEvent => {
        printLogEvent(logEvent);
        console.log(logEvent[1].stack);
    });
}

function getErrorEvents(logs) {
    return _(logs).filter(l => _.get(l, '[0]') === 'fail').value();
}

function getSummary(logs) {
    const endLogs = _(logs).filter(l => _.get(l, '[0]') === 'end').map(l => l[1]).value();
    const sumFields = ['suites', 'tests', 'passes', 'pending', 'failures'];
    return sumFields.reduce((acc, cur) => {
        acc[cur] = _.sumBy(endLogs, cur);
        return acc;
    }, {});
}
