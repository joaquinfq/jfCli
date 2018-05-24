const chalk = require('chalk');
const spawn = require('child_process').spawn;
/**
 * Gestiona un proceso en segundo plano.
 *
 * @namespace jf.cli
 * @class     jf.cli.Spawn
 * @package   jfCli
 */
module.exports = class Spawn
{
    /**
     * Constructor de la clase.
     *
     * @param {jf.cli.Cli}  cli Manejador del script.
     */
    constructor(cli)
    {
        /**
         * Manejador del script.
         *
         * @type {jf.cli.Cli}
         */
        this.cli = cli;
        /**
         * Indica si el proceso ha finalizado con error.
         *
         * @type {Boolean}
         */
        this.isRejected = false;
        /**
         * Proceso que se está ejecutando.
         *
         * @type {null|ChildProcess}
         */
        this.process = null;
    }

    _close()
    {
        const _process = this.process;
        if (_process)
        {
            _process.removeAllListeners();
            if (_process.stdout)
            {
                _process.stdout.removeAllListeners();
            }
            if (_process.stderr)
            {
                _process.stderr.removeAllListeners();
            }
            this.process = null;
        }
    }

    /**
     * Muestra por pantalla la información provisa por el proceso.
     *
     * @param {String} level Nivel de la información.
     * @param {Buffer} data  Datos recibidos.
     *
     * @protected
     */
    _log(level, data)
    {
        `${data}`.trim()
            .split(/[\r\n]+/)
            .forEach(
                line =>
                {
                    line = line.trim();
                    if (line)
                    {
                        this.cli.log(level, '%s', chalk[level === 'error' ? 'red' : 'yellow'](line));
                    }
                }
            )
    }

    /**
     * Callback ejecutado cuando ha ocurrido un error.
     *
     * @param {Function} reject Función para rechazar la promesa.
     * @param {Error}    error  Error ocurrido.
     *
     * @protected
     */
    _onError(reject, error)
    {
        if (!this.isRejected)
        {
            this.isRejected = true;
            this._close();
            reject(error)
        }
    }

    /**
     * Callback ejecutado cuando ha terminado el proceso.
     *
     * @param {Function} resolve Función para resolver la promesa.
     * @param {Function} reject  Función para rechazar la promesa.
     * @param {Number}   code    Código devuelto por el proceso.
     *
     * @protected
     */
    _onExit(resolve, reject, code)
    {
        if (!this.isRejected)
        {
            this._close();
            if (code === 0)
            {
                resolve()
            }
            else
            {
                this.isRejected = true;
                reject(new Error(`Error: ${code}`))
            }
        }
    }

    /**
     * Ejecuta un script de manera asíncrona.
     *
     * @param {String}            cmd     Nombre o ruta del script.
     * @param {String|String[]?}  args    Argumentos del script.
     * @param {Object?}           options Opciones de ejecución del script.
     * @param {Function}          logger  Función que recogerá las líneas impresar por pantalla.
     *
     * @return {Promise}
     */
    async run(cmd, args = [], options = {}, logger = null)
    {
        if (!Array.isArray(args))
        {
            args = [args];
        }

        return new Promise(
            (resolve, reject) =>
            {
                const _options = Object.assign(
                    {
                        cwd   : process.cwd(),
                        stdio : 'pipe',
                        shell : false
                    },
                    options
                );
                const _process = this.process = spawn(cmd, args, _options);
                if (_options.stdio === 'pipe')
                {
                    if (typeof logger !== 'function')
                    {
                        logger = this._log.bind(this);
                    }
                    _process.stdout.on('data', data => logger('info', data));
                    _process.stderr.on('data', data => logger('error', data));
                }
                _process.on('error', error => this._onError(reject, error));
                _process.on('exit', code => this._onExit(resolve, reject, code));
            }
        );
    }
};
