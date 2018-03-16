const handlebars  = require('handlebars');
const path        = require('path');
/**
 * Indica si los helpers por defecto se deben cargar.
 *
 * @type {Boolean}
 */
let loadhelpers = false;
/**
 * Clase para manipular las plantillas usadas por los comandos.
 *
 * @namespace jf.cli
 * @class     jf.cli.Tpl
 */
module.exports = class Tpl
{
    /**
     * Constructor de la clase.
     *
     * @param {jf.cli.Cli} cli Gestor del script.
     */
    constructor(cli)
    {
        /**
         * Gestor del script.
         *
         * @property cli
         * @type     {jf.cli.Cli}
         */
        this.cli = cli;
    }

    /**
     * Compila la plantilla especificada.
     *
     * @param {String} filename Ruta de la plantila a compilar.
     *
     * @return {Function} Plantilla compilada.
     */
    compile(filename)
    {
        return handlebars.compile(
            this.cli.read(filename),
            {
                noEscape : true
            }
        );
    }

    /**
     * Compila todos los archivos presentes en un directorio.
     *
     * @param {String}      directory Ruta del directorio con las plantillas.
     * @param {Object}      context   Contexto a usar para renderizar la plantilla.
     * @param {RegExp|null} filter    Filtro a usar para omitir archivos.
     */
    fromDir(directory, context, filter = null)
    {
        this.cli.scandir(directory, filter)
            .forEach(filename => this.generate(filename, context));
    }

    /**
     * Compila una plantilla y genera el archivo resultante.
     * Dependendiendo de la extensión del archivo tenemos:
     *
     * - Extensión `.hbs`, se compila y el nombre del archivo final es el mismo sin la extensión.
     * - No tiene extensión `.hbs`, el archivo resultante es una copia del original.
     *
     * @param {String} filename Ruta de la plantilla a renderizar.
     * @param {Object} context  Contexto a usar para renderizar la plantilla.
     *
     * @return {String} Contenido de la plantilla renderizada.
     */
    generate(filename, context)
    {
        let _content;
        if (path.extname(filename) === '.hbs')
        {
            _content = this.render(filename, context);
            filename = filename.substr(0, filename.length - 4);
        }
        else
        {
            _content = this.cli.read(filename, null);
        }
        filename = typeof context.transform === 'function'
            ? context.transform(filename)
            : filename.replace(context.relative, '');
        const _outdir = context.outdir;
        if (_outdir)
        {
            this.cli.write(path.join(_outdir, filename), _content, null);
        }

        return _content;
    }

    /**
     * Carga los helpers existentes en un directorio.
     *
     * @param {String} dir Directorio que contiene los helpers.
     */
    loadHelpers(dir)
    {
        if (loadhelpers)
        {
            this.loadHelpers(path.join(__dirname, 'helpers'));
            loadhelpers = false;
        }
        if (dir && this.exists(dir))
        {
            this.cli.scandir(dir).forEach(
                helper => handlebars.registerHelper(path.basename(helper, '.js'), require(helper))
            );
        }
    }

    /**
     * Renderiza una plantilla.
     *
     * @param {String} filename Ruta de la plantilla a renderizar.
     * @param {Object} context  Contexto a usar para renderizar la plantilla.
     *
     * @return {String} Plantilla renderizada.
     */
    render(filename, context)
    {
        return this.compile(filename)(context).trim() + '\n';
    }
};
