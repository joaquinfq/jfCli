const jfCli = require('./src/Cli');
const yargs = require('yargs');
//
const cli = new jfCli(__dirname);
cli.configure(yargs, 'yargs');
yargs
    .help()
    .wrap(95)
    .parse();

