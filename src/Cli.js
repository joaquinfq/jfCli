const chalk        = require('chalk');
const Command      = require('./Command');
const jfFileSystem = require('jf-file-system');
const jfLogger     = require('jf-logger');
const path         = require('path');
const Spawn        = require('./Spawn');
/**
 * Gestiona la ejecución de scripts desde la línea de comandos.
 *
 * La configuración de los comandos se obtiene a partir de un objeto
 * que puede ser leído de un archivo JSON.
 *
 * La ejecución de los comandos se realiza buscando un archivo dentro
 * de `commandsDir` que coincida con el nombre del comando.
 *
 * Por ejemplo, si tenemos un commando `ftp:upload` y `commandsDir` es
 * `/path/to/commands`, se realizarán la siguientes búsquedas y la
 * primera que se encuentre finaliza el proceso:
 *
 * ```
 * /path/to/commands/ftp/upload.js
 * /path/to/commands/ftp.js
 * ```
 *
 * En el primer caso, el valor exportado por `upload.js` debe ser una función.
 * Si se llega al último caso, se buscará un método `upload` en los valores
 * exportados desde el archivo `ftp.js`. Si no existe ese método pero el
 * valor exportado es una función, se ejecuta. En resumen, las verificaciones
 * serán algo como:
 *
 * ```
 * upload(...)
 * ftp.upload(...)
 * ftp(...)
 * ```
 *
 * El proceso se repite para cada `:` usado como separador. Por ejemplo, si el
 * comando es `a:b:c`, se harán las siguientes comprobaciones:
 *
 * ```
 * /path/to/commands/a/b/c.js --> c(...)
 * /path/to/commands/a/b.js   --> b.c(...)
 * /path/to/commands/a/b.js   --> b(...)
 * /path/to/commands/a.js     --> a.c(...)
 * /path/to/commands/a.js     --> a(...)
 * ```
 *
 * @namespace jf.cli
 * @class     jf.cli.Cli
 * @extends   jf.Logger
 * @uses      jf.FileSystem
 * @package   jfCli
 */
class jfCli extends jfLogger
{
    /**
     * Constructor de la clase.
     *
     * @param {Object}  directories Mapa con la ruta raíz para cada comandos.
     * @param {String?} rootDir     Ruta raíz del proyecto.
     */
    constructor(directories, rootDir = '')
    {
        super();
        /**
         * Comando siendo ejecutado.
         *
         * @type {jf.cli.Command|null}
         */
        this.command = null;
        /**
         * Mapa con la ruta raíz para cada comandos.
         *
         * @type {Object}
         */
        this.directories = directories || {};
        /**
         * Ruta raíz del proyecto.
         *
         * @type {String}
         */
        this.rootDir = rootDir || this.findUp(process.mainModule.filename, 'package.json');
        //------------------------------------------------------------------------------
        // Cargamos los comandos del proyecto.
        //------------------------------------------------------------------------------
        const _cliFile = path.join(this.rootDir, '.jfcli');
        if (this.exists(_cliFile))
        {
            try
            {
                this.loadCommands(
                    JSON.parse(this.read(_cliFile))
                );
            }
            catch (error)
            {
                this.error('Error al analizar el archivo %s: %s', _cliFile, error.message);
            }
        }
    }

    /**
     * Ejecuta el comando especificado en la consola.
     *
     * @param {*}      cli     Manejador de la línea de comandos (yargs, commander, etc).
     * @param {String} builder Nombre del generador a usar.
     */
    configure(cli, builder)
    {
        Command.configure(cli, builder, this.handler.bind(this));
    }

    /**
     * Procesa el comando y llama al manejador.
     *
     * @param {Command} command Comando seleccionado.
     * @param {Object}  argv    Argumentos recibidos de la línea de comandos.
     */
    async handler(command, argv)
    {
        this.log('debug', 'Comando: %s -- %s', command.name, command.description);
        this.command   = command;
        const _dirs    = this.directories;
        const _subdirs = command.name.split(':');
        const _cmdDir  = path.join(_dirs[_subdirs[0]] || this.rootDir, 'src', 'commands');
        let   _method  = '';
        let   _result  = false;
        if (_subdirs[0] in _dirs)
        {
            _subdirs.shift();
        }
        while (_result !== true && _subdirs.length)
        {
            const _filename = path.join(_cmdDir, ..._subdirs) + '.js';
            if (this.exists(_filename))
            {
                try
                {
                    let _handler = require(_filename);
                    if (_method && typeof _handler[_method] === 'function')
                    {
                        _result = await this._run(
                            _handler[_method].bind(_handler),
                            argv,
                            chalk.magenta(`${path.basename(_filename)}::${_method}(...)`)
                        );
                    }
                    else if (typeof _handler === 'function')
                    {
                        _result = await this._run(
                            _handler,
                            argv,
                            chalk.magenta(`${path.basename(_filename)}::${_handler.name || ''}(...)`)
                        );
                    }
                }
                catch (error)
                {
                    this.logException(error);
                }
            }
            _method = _subdirs.pop();
        }
        if (_result !== true)
        {
            this.log('error', 'No se encontró un manejador para el comando %s', command.name);
        }
    }

    /**
     * Carga los comandos especificados.
     * El formato de cada comando es:
     *
     * ```
     * {
     *     ...,
     *     'app:create' : {
     *         n : 'Nombre de la aplicación|name|string',
     *         ...
     *     },
     *     ...
     * }
     * ```
     *
     * En este ejemplo, se definiría un comando `app:create` que acepta
     * una opción llamada `n`
     *
     * @param {Object} commands Comandos a cargar.
     *
     * @see https://github.com/joaquinfq/commands-options/blob/master/src/Command.js
     */
    loadCommands(commands)
    {
        Command.parse(commands);
    }

    /**
     * @override
     */
    log(level, label, ...args)
    {
        if (!label)
        {
            label = args.shift();
        }
        super.log(level, false, label, ...args);
    }

    /**
     * Muestra por pantalla la información de la excepción.
     *
     * @param {Error}    error Error a mostrar.
     * @param {Boolean?} stack Indica si se muestra el stack.
     */
    logException(error, stack = false)
    {
        const [, _file, _line, _column] = error.stack.match(/\(([^:]+):(\d+):(\d+)\)/);
        this.log(
            'error',
            'Excepción en el archivo %s (%s:%s): %s',
            _file.replace(this.rootDir + path.sep, ''),
            _line,
            _column,
            error.message
        );
        if (stack)
        {
            error.stack.split('\n').forEach(line => this.log('error', line));
        }
    }

    /**
     * Ejecuta el método asociado al comando.
     * Las clases hijas pueden sobrescribir este método para realizar cualquier
     * operación previa o posterior a la ejecución del comando.
     *
     * @param {Function} handler Manejador del comando a ejecutar.
     * @param {Object}   argv    Argumentos recibidos de la línea de comandos.
     * @param {String}   name    Nombre del comando que se va a ejecutar.
     *
     * @protected
     */
    async _run(handler, argv, name)
    {
        this.log('info', 'Ejecutando %s', name);

        return await handler(this, argv);
    }

    /**
     * Ejecuta un script de manera asíncrona.
     *
     * @param {String}  cmd     Nombre o ruta del script.
     * @param {Array?}  args    Argumentos del script.
     * @param {Object?} options Opciones de ejecución del script.
     *
     * @return {Promise}
     */
    async script(cmd, args = [], options = {})
    {
        return new Spawn(this).run(cmd, args, options);
    }
}

require('augment-object').augmentClass(jfCli, jfFileSystem);
//------------------------------------------------------------------------------
// Exportamos la referencia de la clase jfCli.
//------------------------------------------------------------------------------
module.exports = jfCli;
