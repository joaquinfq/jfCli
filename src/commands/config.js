const cc2sep        = require('cc2sep');
const fromFiles     = require('../tools/from-files');
const parseCommands = require('../tools/parse-commands');
const path          = require('path');

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
        if (Object.keys(_commands).length)
        {
            parseCommands(_commands, prefix);
            if (!config.commands)
            {
                config.commands = {};
            }
            Object.assign(
                config.commands,
                _commands
            );
        }
    }
    else
    {
        cli.log('error', 'El directorio %s no existe', _directory);
        throw new Error('Se debe especificar un proyecto con comandos a agregar.');
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
 * @option d Directorios con proyectos|directories|string|
 * @option m Fusionar con el actual|merge
 *
 * @param {jf.cli.Cli} cli  Gestor del script.
 * @param {Object}     argv Argumentos de la línea de comandos.
 */
module.exports = function config(cli, argv)
{
    let _directories = argv.directories;
    if (typeof _directories === 'string')
    {
        _directories = [_directories || process.cwd()];
    }
    if (Array.isArray(_directories))
    {
        _directories = toObject(_directories);
    }
    if (typeof _directories === 'object')
    {
        let _config;
        if (argv.merge)
        {
            _config = cli.loadConfig();
            if (!_config.directories)
            {
                _config.directories = {};
            }
        }
        else
        {
            _config = {
                commands    : {},
                directories : {}
            };
        }
        try
        {
            fromFiles(cli, _config.commands, cli.scandir(__dirname));
            parseCommands(_config.commands);
            Object.assign(_config.directories, _directories);
            for (const _prefix of Object.keys(_directories).sort())
            {
                const _dir = path.relative(
                    cli.rootDir,
                    cli.resolveDir(_directories[_prefix])
                );
                if (cli.exists(_dir))
                {
                    build(cli, _prefix + ':', _dir, _config);
                }
                else
                {
                    cli.log('error', 'No se encontró el directorio %s', _dir);
                }
            }
            cli.save(_config);
        }
        catch (e)
        {
            cli.log('error', e.message);
        }
    }
};
