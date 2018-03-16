const isObject = require('./utils/is-object');
const iterate  = require('./utils/iterate');
/**
 * Representa una opción de un comando.
 *
 * @namespace jf.cli
 * @class     jf.cli.Option
 * @package   jfCli
 */
module.exports = class jfCliOption
{
    /**
     * Constructor de la clase.
     *
     * @param {Object|String} config Configuración a usar para inicializar la instancia.
     */
    constructor(config)
    {
        /**
         * Nombre largo de la opción.
         *
         * @type {String}
         */
        this.alias = '';
        /**
         * Valor por defecto de la opción.
         *
         * @type {null|String|Number}
         */
        this.default = null;
        /**
         * Descripción de la opción.
         *
         * @type {String}
         */
        this.description = '';
        /**
         * Nombre corto de la opción.
         * Consta de una letra.
         *
         * @type {String}
         */
        this.name = '';
        /**
         * Indica si la opción es obligatoria.
         *
         * @type {Boolean}
         */
        this.required = false;
        /**
         * Tipo de dato esperado en la opción.
         *
         * @type {String}
         */
        this.type = 'boolean';
        //
        if (config)
        {
            if (isObject(config))
            {
                iterate(
                    config,
                    (name, value) =>
                    {
                        if (this[name] !== undefined)
                        {
                            this[name] = value;
                        }
                    }
                )
            }
            else if (typeof config === 'string')
            {
                this.parseString(config);
            }
        }
    }

    /**
     * Analiza una opción especificada como texto.
     * Las propiedades deben estar separadas por una barra vertical `|`.
     *
     * El orden de las propiedades es:
     *
     * - La descripción
     * - El alias o nombre largo de la opción.
     * - El tipo de datos esperado (`string` por defecto).
     * - El valor por defecto. Si no se especifica se configura la opción como requerida.
     *
     * Ejemplo:
     *
     * ```
     * options.parseOption(options, 'c|Eliminar directorio antes de empezar');
     * options.parseOption(options, 'n|Nombre del elemento a crear|name|string');
     * ```
     * @param {String} config Configuración de la opción a analizar.
     *
     * @return {Boolean}
     */
    parseString(config)
    {
        let [_name, _desc, _alias, _type, _default] = config.split('|');
        if (_alias && _name.length > _alias.length)
        {
            let _tmp = _name;
            _name    = _alias;
            _alias   = _tmp;
        }
        if (_name.length > 1)
        {
            throw new Error(`La opción corta debe usar un solo carácter: ${_name} -- ${config}.`);
        }
        this.name = _name;
        if (_alias && _alias !== _name)
        {
            this.alias = _alias;
        }
        if (_desc)
        {
            this.description = _desc;
        }
        if (_type)
        {
            this.type = _type;
        }
        if (_default === undefined)
        {
            if (this.type === 'boolean')
            {
                this.default = false;
            }
            else
            {
                this.required = true;
            }
        }
        else
        {
            this.default = _default;
        }
    }

    /**
     * @override
     */
    toString()
    {
        const _segments = [
            this.name,
            this.description,
            this.alias
        ];
        if (this.type !== 'boolean')
        {
            _segments.push(this.type);
            if (!this.required)
            {
                _segments.push('');
            }
        }

        return _segments.join('|');
    }
};
