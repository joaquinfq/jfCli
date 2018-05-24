const handlebars = require('handlebars');
const path       = require('path');
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
        /**
         * Directorios a usar para resolver los helpers y las dependencias.
         *
         * @property directories
         * @type     {Object}
         */
        this.directories = {};
        //------------------------------------------------------------------------------
        const _directories    = cli.directories;
        const _rootDir        = cli.rootDir;
        const _tplDirectories = this.directories;
        Object.keys(_directories).forEach(
            module => _tplDirectories[module] = path.resolve(_rootDir, _directories[module])
        );
        _tplDirectories.root = _rootDir;
        _tplDirectories.cli  = path.resolve(__dirname, '..');
        Object.values(_tplDirectories).forEach(
            dir => {
                this.loadHelpers(path.join(dir, 'tpl', 'helpers'))
                this.loadPartials(path.join(dir, 'tpl', 'partials'))
            }
        );
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
        const _cli = this.cli;
        if (!path.isAbsolute(directory) && !_cli.exists(directory))
        {
            directory        = this.resolve(directory);
            context.relative = directory;
        }
        _cli.scandir(directory, filter)
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
        if (!path.isAbsolute(filename[0]))
        {
            // Se transforma el nombre relativo a absoluto resolviendo el primer segmento
            // que corresponde con el subdirectorio de plantillas.
            const _filename  = filename.split('/');
            context.relative = this.resolve(_filename.shift());
            filename         = path.join(context.relative, ..._filename);
        }
        if (path.extname(filename) === '.hbs')
        {
            _content = this.render(filename, context);
            filename = filename.substr(0, filename.length - 4);
        }
        else
        {
            _content = this.cli.read(filename, null);
        }
        filename      = typeof context.transform === 'function'
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
        const _cli = this.cli;
        if (dir && _cli.exists(dir))
        {
            _cli.scandir(dir).forEach(
                helper => handlebars.registerHelper(path.basename(helper, '.js'), require(helper))
            );
        }
    }

    /**
     * Carga las plantillas parciales existentes en un directorio.
     *
     * @param {String} dir Directorio que contiene las plantillas parciales.
     */
    loadPartials(dir)
    {
        const _cli = this.cli;
        if (dir && _cli.exists(dir))
        {
            _cli.scandir(dir).forEach(
                filename => handlebars.registerPartial(
                    path.basename(filename, '.hbs').replace(/[^\w\d]+/g, '-'),
                    _cli.read(filename)
                )
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

    /**
     * Resuelve la ruta del subdirectorio de plantillas.
     *
     * @param {String} template Subdirectorio a resolver.
     *
     * @return {String|undefined} Ruta de la plantilla o `undefined` si la plantilla no se encontró.
     */
    resolve(template)
    {
        let _tpldir;
        const _cli         = this.cli;
        const _directories = this.directories;
        const _modules     = Object.keys(_directories);
        const _command     = this.cli.command.name.split(':');
        if (_command.length > 1)
        {
            _modules.unshift(_command[0]);
            for (const _module of _modules)
            {
                const _directory = path.join(_directories[_module], 'tpl', template);
                if (_cli.exists(_directory))
                {
                    _tpldir = _directory;
                    break;
                }
            }
        }
        else
        {
            _tpldir = path.join(__dirname, '..', 'tpl', template);
        }

        return _tpldir;
    }
};
