const check     = require('../utils/check');
const cc2sep    = require('cc2sep');
const fromFiles = require('../tools/from-files');
const path      = require('path');

/**
 * Carga los comandos desde el directorio especificado y construye la configuración.
 *
 * @param {jf.cli.Cli} cli       Gestor del script.
 * @param {String}     prefix    Prefijo del comando.
 * @param {String}     directory Directorio donde se buscarán los comandos.
 * @param {Object}     config    Configuración leída del archivo `.jfcli`.
 */
function build(cli, prefix, directory, config)
{
    const _directory = path.join(directory, 'src', 'commands');
    if (cli.exists(_directory))
    {
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
                config.commands[prefix + ':' + _command] = _options;
            }
        }
    }
    else
    {
        cli.log('error', 'El directorio %s no existe', _directory);
    }
}

/**
 * Convierte un listado de directorios a un objeto donde la clave es
 * el nombre del módulo y el valor la ruta completa del directorio.
 *
 * @param {String[]} directories Listado de directorios.
 *
 * @return {Object}
 */
function toObject(directories)
{
    const _result = {};
    directories.forEach(
        dir => _result[cc2sep.trimmed(path.basename(dir)).replace(/(^|.+-)cli-?/, '') || 'cli'] = dir
    );
    return _result;
}

/**
 * Genera el archivo de configuración.
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
    let _directories = argv.directory;
    if (typeof _directories === 'string')
    {
        _directories = [_directories];
    }
    if (Array.isArray(_directories))
    {
        _directories = toObject(_directories);
    }
    if (typeof _directories === 'object')
    {
        let _config;
        if (argv.noMerge)
        {
            _config = {
                commands    : {},
                directories : {}
            };
        }
        else
        {
            _config = cli.loadConfig();
            if (!_config.directories)
            {
                _config.directories = {};
            }
        }
        Object.assign(_config.directories, _directories);
        for (const _prefix of Object.keys(_directories).sort())
        {
            const _dir = cli.resolveDir(_directories[_prefix]);
            if (cli.exists(_dir))
            {
                build(cli, _prefix, _dir, _config);
            }
            else
            {
                cli.log('error', 'No se encontró el directorio %s', _dir);
            }
        }
        cli.save(_config);
    }
    return true;
};
