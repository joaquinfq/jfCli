const check     = require('../utils/check');
const cc2sep    = require('cc2sep');
const fromFiles = require('../tools/from-files');
const path      = require('path');

/**
 * Carga los comandos desde el directorio especificado y construye la configuración.
 *
 * @param {jf.cli.Cli} cli       Gestor del script.
 * @param {String}     directory Directorio donde se buscarán los comandos.
 * @param {Object}     config    Configuración leída del archivo `.jfcli`.
 */
function build(cli, directory, config)
{
    const _directory = path.join(directory, 'src', 'commands');
    if (cli.exists(_directory))
    {
        const _prefix   = cc2sep.trimmed(path.basename(directory)).replace(/(^|.+-)cli-?/, '') || 'cli';
        const _commands = {};
        fromFiles(cli, _commands, cli.scandir(_directory));
        const _names = Object.keys(_commands);
        if (_names.length)
        {
            if (!config.commands)
            {
                config.commands = {};
            }
            for (const _command of _names)
            {
                const _options = _commands[_command];
                for (const _option of Object.keys(_options))
                {
                    _options[_option] = _option
                        ? _options[_option].toString().substr(2)
                        : _options[_option];
                }
                config.commands[_prefix + ':' + _command] = _options;
            }
        }
    }
    else
    {
        cli.log('error', 'El directorio %s no existe', _directory);
    }
}

/**
 * Genera el archivo `.jfcli` con la configuración de los comandos permitidos.
 *
 * @command
 *
 * @option d Directorio del proyecto|directory|string|
 * @option M No fusionar con el actual|no-merge
 *
 * @param {jf.cli.Cli} cli  Gestor del script.
 * @param {Object}     argv Argumentos de la línea de comandos.
 *
 * @return {Boolean} `true` si el manejador es válido para el comando actual.
 */
module.exports = function config(cli, argv)
{
    check.directory(cli, argv);
    let _directory = argv.directory;
    if (!Array.isArray(_directory))
    {
        _directory = [_directory];
    }
    const _config = argv.M
        ? {}
        : Object.assign({}, cli.commands);
    for (const _dir of _directory)
    {
        if (cli.exists(_dir))
        {
            build(cli, _dir, _config);
        }
        else
        {
            cli.log('error', 'No se encontró el directorio %s', _dir);
        }
    }
    cli.save();

    return true;
};
