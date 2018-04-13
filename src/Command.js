const iterate = require('./utils/iterate');
const Option  = require('./Option');
/**
 * Comandos encontrados al analizar la configuración.
 *
 * @type {{}}
 */
const commands = {};
/**
 * Representa un comando.
 *
 * @namespace jf.cli
 * @class     jf.cli.Command
 * @package   jfCli
 */
module.exports = class jfCliCommand
{
    /**
     * Constructor de la clase.
     *
     * @param {String}        name   Nombre del comando actual.
     * @param {Object|String} config Configuración a analizar.
     */
    constructor(name, config = {})
    {
        /**
         * Descrición del comando.
         *
         * @type {String}
         */
        this.description = typeof config === 'string'
            ? config
            : config[''] || '';
        /**
         * Nombre del comando.
         *
         * @type {String}
         */
        this.name = name;
        /**
         * Opciones aceptadas por el comando.
         *
         * @type {Object}
         */
        this.options = {};
        //---------------------------------------------------------------------
        this.parse(config);
    }

    /**
     * Analiza un conjunto de opciones especificadas tanto en forma de objetos como texto.
     *
     * @param {Object} config Configuración actual a analizar.
     *
     * @return {Boolean}
     */
    parse(config)
    {
        const _options = this.options;
        //
        return iterate(
            config,
            (key, value) =>
            {
                if (key === '')
                {
                    this.description = value;
                }
                else
                {
                    if (value instanceof Option)
                    {
                        value = value.toString();
                    }
                    else if (typeof value === 'string')
                    {
                        value = `${key}|${value}`;
                    }
                    const _option          = new Option(value);
                    _options[_option.name] = _option;
                }
                return true;
            }
        );
    }

    /**
     * Configura el manejador de la línea de comandos especificado.
     *
     * @param {*}         cli     Manejador de la línea de comandos (yargs, commander, etc).
     * @param {String}    name    Nombre del generador a usar.
     * @param {Function?} handler Manejador del comando.
     *
     * @return {Object}
     */
    static configure(cli, name, handler)
    {
        return require(`./builder/${name}`)(cli, commands, handler);
    }

    /**
     * Analiza la configuración con los comandos.
     * El objecto con los comandos tiene el siguiente formato:
     *
     * - Si tiene opciones:
     * ```
     * {
     *     "create" : {
     *         ""  : "Crea un elemento",
     *         "n" : "Nombre del elemento que se creará|name|string"
     *     }
     * }
     * ```

     * - Si no tiene opciones:
     * ```
     * {
     *     "create" : {
     *         "" : "Crea un elemento"
     *     }
     * }
     * {
     *     "create" : "Crea un elemento"
     * }
     * ```
     *
     * Cada clave es el nombre del comando y sus hijos son las opciones aceptadas,
     * a excepción de la clave vacía que es la descripción del comando.
     *
     * Las opciones pueden especificarse usando un objeto o un texto.
     * Ver la clase `Option` para más detalle.
     *
     *
     * @param {Object} config Configuración actual a analizar.
     * @param {String} name   Nombre del comando actual.
     *
     * @return {Boolean}
     */
    static parse(config, name = '')
    {
        return iterate(
            config,
            (key, value) =>
            {
                const _name = name
                    ? name + ':' + key
                    : key;
                return commands[_name] = new this(
                    _name,
                    typeof value === 'string'
                        ? { '' : value }
                        : value
                );
            }
        );
    }
};
