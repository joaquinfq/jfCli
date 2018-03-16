const fromFiles = require('../tools/from-files');
const padValues = require('pad-values');
const path      = require('path');

/**
 * Carga los comandos desde el directorio especificado y construye la configuración del README.md.
 *
 * @param {jf.cli.Cli} cli       Gestor del script.
 * @param {String}     directory Directorio donde se buscarán los comandos.
 *
 * @return {Object|undefined} Comandos encontrados o `undefined` si el directorio no existe.
 */
function buildReadme(cli, directory)
{
    let _readme;
    const _directory = path.join(directory, 'src', 'commands');
    if (cli.exists(_directory))
    {
        _readme         = {};
        const _commands = {};
        fromFiles(cli, _commands, cli.scandir(_directory));
        for (const _command of Object.keys(_commands))
        {
            _readme[_command] = parseCommand(_command, _commands[_command]);
        }
    }
    else
    {
        cli.log('error', 'El directorio %s no existe', _directory);
    }
    return _readme;
}

/**
 * Analiza un comando y construye la configuración para la plantilla.
 *
 * @param {String} name   Nombre del comando.
 * @param {Object} config Configuración del comando a analizar.
 *
 * @return {Object} Contexto a agregar a la plantilla.
 */
function parseCommand(name, config)
{
    const _columns = {};
    // Propiedades que nos interesan de la clase Option
    const _names   = ['name', 'alias', 'description', 'type', 'required'];
    const _titles  = ['Nombre', 'Alias', 'Descripción', 'Tipo', 'Requerido'];
    // Inicializamos los arrays donde van los valores.
    _names.forEach((name, index) => _columns[name] = [_titles[index]]);
    // Separamos cada una de las opciones en sus respectivos arrays.
    splitOptions(config, _names, _columns);
    // Llenamos con espacios las listas para mostrarlas alineadas.
    _names.forEach(name => _columns[name] = padValues(_columns[name]));
    // Fusionamos las listas en objetos para
    const _headers = [];
    const _options = [];
    _columns[_names[0]].forEach(
        (value, index) =>
        {
            const _option = [];
            _names.forEach(name => _option.push(_columns[name][index]));
            if (index)
            {
                _options.push(_option);
            }
            else
            {
                const _sep = [];
                _headers.push(_option);
                _option.forEach(option => _sep.push('-'.repeat(option.length)));
                _headers.push(_sep);
            }
        }
    );
    return {
        description : config[''],
        headers     : _headers,
        name        : name,
        options     : _options
    };
}

/**
 * Separa cada una de las propiedades de las opciones en un array para
 * poder luego alinear las columnas rellenando con espacios los valores.
 *
 * @param {Object}   config     Configuración de las propiedades aceptadas por el comando.
 * @param {String[]} properties Nombre de las propiedades que se extraerán.
 * @param {Object}   output     Variable donde se colocarán las propiedades y sus valores.
 */
function splitOptions(config, properties, output)
{
    // Separamos cada una de las opciones en sus respectivos arrays.
    for (const _name of Object.keys(config))
    {
        if (_name)
        {
            const _option = config[_name];
            properties.forEach(
                name =>
                {
                    let _value = _option[name];
                    if (name === 'name')
                    {
                        _value = '-' + _value;
                    }
                    else if (name === 'alias')
                    {
                        _value = '--' + _value;
                    }
                    else if (typeof _value === 'boolean')
                    {
                        _value = _value ? ':heavy_check_mark:' : '';
                    }
                    output[name].push(_value)
                }
            );
        }
    }
}

/**
 * Genera el archivo README.md de un repositorio con comandos.
 *
 * @command
 *
 * @option d Directorio del proyecto|directory|string|
 * @option t Ruta de la plantilla a usar|template|string|
 *
 * @param {jf.cli.Cli} cli  Gestor del script.
 * @param {Object}     argv Argumentos de la línea de comandos.
 *
 * @return {Boolean} `true` si el manejador es válido para el comando actual.
 */
module.exports = function readme(cli, argv)
{
    let _directory = cli.resolveDir(argv.directory || process.cwd());
    if (cli.exists(_directory))
    {
        const _commands = buildReadme(cli, _directory);
        if (_commands)
        {
            const _pkgFile = path.join(_directory, 'package.json');
            cli.write(
                path.join(_directory, 'README.md'),
                cli.getTpl().render(
                    argv.tpl || path.join(__dirname, 'readme.md.hbs'),
                    Object.assign(
                        {
                            commands : _commands
                        },
                        cli.exists(_pkgFile)
                            ? require(_pkgFile)
                            : {}
                    )
                )
            );
        }
    }
    return true;
};
