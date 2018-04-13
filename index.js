const jfCli = require('./src/Cli');
const yargs = require('yargs');
const cli   = new jfCli(__dirname);
cli.configure(yargs, 'yargs');
yargs
    .demandCommand(1, 'Se debe especificar al menos un commando.')
    .recommendCommands()
    .help()
    .wrap(yargs.terminalWidth())
    .parse();
