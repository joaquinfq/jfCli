const fs = require('fs');

/**
 * Obtiene la información de los comandos disponibles analizando los
 * comentarios del archivo.
 *
 * @param {Object} output Objeto donde se irán colocando los comandos que se encuentren.
 * @param {String} file   Ruta del archivo que se analizará.
 */
function parseFile(output, file)
{
    if (fs.existsSync(file))
    {
        const _doc = fs.readFileSync(file, 'utf8').match(/\/\*\*.*?\*\//gms);
        if (_doc)
        {
            const _options = _doc[0].match(/@option\s[^\n\r]+/gs);
            if (_options)
            {
                const _config = {};
                const _desc   = _doc[0].split(/\s+(?:\*\s+)+/m);
                if (_desc)
                {
                    _config['?'] = _desc[1].trim();
                }
                _options.sort().forEach(
                    option =>
                    {
                        const [, _name, ..._desc] = option.split(/\s+/);
                        _config[_name]            = _desc.join(' ');
                    }
                );
                output[require('path').basename(file, '.js')] = _config;
            }
        }
    }
}

/**
 * Construye los comandos analizando los comentarios de un listado de archivos.
 * El comentario tiene la siguiente estructura:
 *
 * ```
 * @option n Nombre del elemento que se creará|name|string
 * ```
 *
 * Ver la clase `Option` para más detalle del formato de la descripción.
 *
 *
 * @param {Object} output Objeto donde se irán colocando los comandos que se encuentren.
 * @param {Object} files  Listado de archivos a analizar.
 *
 * @return {Object}
 */
module.exports = function fromFiles(output, files)
{
    if (Array.isArray(files))
    {
        files.forEach(file => parseFile(output, file));
    }
};
