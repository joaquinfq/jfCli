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
     * @param {String?} rootDir Ruta raíz del proyecto.
     */
    constructor(rootDir = '')
    {
        super();
        /**
         * Comando siendo ejecutado.
         *
         * @type {jf.cli.Command|null}
         */
        this.command = null;
        /**
         * Listado de comandos disponible.
         *
         * @type {Object}
         */
        this.commands = {};
        /**
         * Mapa con la ruta raíz para cada comandos.
         *
         * @type {Object}
         */
        this.directories = {};
        /**
         * Ruta raíz del proyecto.
         *
         * @type {String}
         */
        this.rootDir = rootDir || this.findUp(process.mainModule.filename, 'package.json');
        /**
         * Indica si se muestra el stack al imprimir una excepción.
         *
         * @type {boolean}
         */
        this.showStack = true;
        /**
         * Manejador de las plantillas.
         *
         * @type {null|jf.cli.Tpl}
         */
        this.tpl = null;
        //------------------------------------------------------------------------------
        // Cargamos los comandos que son métodos de clase y la configuración.
        //------------------------------------------------------------------------------
        this.loadCommands(
            {
                'update' : 'Actualiza el archivo de configuración'
            }
        );
        this._parseConfig();
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
     * Devuelve el manejador de plantillas.
     *
     * @return {jf.cli.Tpl} Manejador de plantillas.
     */
    getTpl()
    {
        let _tpl = this.tpl;
        if (!_tpl)
        {
            _tpl = this.tpl = new (require('./Tpl'))(this);
        }
        return _tpl;
    }

    /**
     * Procesa el comando y llama al manejador.
     *
     * @param {Command} command Comando seleccionado.
     * @param {Object}  argv    Argumentos recibidos de la línea de comandos.
     */
    async handler(command, argv)
    {
        const _name = command.name;
        this.log('debug', 'Comando: %s -- %s', _name, command.description);
        this.command   = command;
        const _subdirs = _name.split(':');
        let _result    = false;
        if (_subdirs[1])
        {
            const _dirs   = this.directories;
            const _cmdDir = path.join(this.resolveDir(_dirs[_subdirs[0]]) || this.rootDir, 'src', 'commands');
            let _method   = '';
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
        }
        else if (typeof this[_name] === 'function')
        {
            _result = this[_name](argv);
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
     * @see https://github.com/joaquinfq/jfCli/blob/master/src/Command.js
     */
    loadCommands(commands)
    {
        Command.parse(commands);
    }

    /**
     * Carga el archivo de configuración.
     *
     * @return {Object|undefined} El objeto con la configuración o `undefined`
     *                            si el archivo con la configuración no existe.
     */
    loadConfig()
    {
        const _cliFile = path.join(this.rootDir, this.constructor.FILE);
        let _config;
        if (this.exists(_cliFile))
        {
            try
            {
                _config = JSON.parse(this.read(_cliFile)) || {};
            }
            catch (error)
            {
                this.logException(error);
            }
        }
        return _config;
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
     * @param {Error} error Error a mostrar.
     */
    logException(error)
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
        if (this.showStack)
        {
            error.stack.split('\n').forEach(line => this.log('error', line));
        }
    }

    /**
     * Analiza la la configuración y la aplica a la instancia.
     *
     * @protected
     */
    _parseConfig()
    {
        const _config = this.loadConfig();
        if (_config)
        {
            //------------------------------------------------------------------------------
            // Aplicamos las propiedades a la instancia.
            //------------------------------------------------------------------------------
            for (const _property of Object.keys(_config))
            {
                const _current = this[_property];
                if (_current !== undefined && typeof _current !== 'function')
                {
                    this[_property] = _config[_property];
                }
            }
            //------------------------------------------------------------------------------
            // Cargamos los comandos configurados.
            //------------------------------------------------------------------------------
            this.loadCommands(this.commands);
        }
    }

    /**
     * Resuelve el directorio del comando.
     * Los pasos que se siguen son:
     *
     * - Si es una ruta absoluta, se devuelve tal cual.
     * - Si no tiene subdirectorio:
     *   - Se verifica si es un módulo de node tratando de resolver su ruta.
     *   - Si no es un módulo, se concatena con el directorio actual.
     * - Si tiene subdirectorio, se concatena con el directorio actual.
     *
     *
     * @param {String} directory Ruta del directorio a resolver.
     *
     * @return {String}
     */
    resolveDir(directory)
    {
        if (!path.isAbsolute(directory))
        {
            let _directory;
            if (!path.parse(directory).dir)
            {
                try
                {
                    _directory = path.resolve(
                        require.resolve(
                            directory,
                            {
                                paths : [
                                    this.rootDir,
                                    ...require.resolve.paths('A+B+C+C+D')
                                ]
                            }
                        )
                    );
                }
                catch (e)
                {
                }
            }
            directory = _directory || path.join(process.cwd(), directory);
        }
        return this.findUp(directory, 'package.json');
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
     * @return {Promise} Promesa que resuelve el manejador.
     *
     * @protected
     */
    async _run(handler, argv, name)
    {
        this.log('info', 'Ejecutando %s', name);
        return handler(this, argv);
    }

    /**
     * Guarda la configuración de la instancia.
     *
     * @param {Object|String[]} properties Objeto o listado de propiedades que se guardarán.
     *                                     Si se especifica un array de propiedades, se llenará un objeto
     *                                     con los valores que tenga la instancia en dichas propiedades.
     *                                     Si se pasa un objecto, se guardará el objeto directamente.
     */
    save(properties = ['commands', 'directories'])
    {
        if (Array.isArray(properties))
        {
            const _config = {};
            for (const _property of properties.sort())
            {
                _config[_property] = this[_property];
            }
            properties = _config;
        }
        this.write(path.join(this.rootDir, this.constructor.FILE), JSON.stringify(properties, null, 4));
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

    /**
     * Actualiza el archivo de configuración agregando comandos de otros proyectos.
     *
     * @return {Boolean} `true` para indicar que se proceso el comando.
     */
    update()
    {
        return require('./commands/config')(
            this,
            {
                directory : this.directories,
                noMerge   : true
            }
        );
    }

    /**
     * Nombre del archivo de configuración.
     *
     * @return {String}
     */
    static get FILE()
    {
        return '.jfcli';
    }
}

require('augment-object').augmentClass(jfCli, jfFileSystem);
//------------------------------------------------------------------------------
// Exportamos la referencia de la clase jfCli.
//------------------------------------------------------------------------------
module.exports = jfCli;
