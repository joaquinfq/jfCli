const chalk = require('chalk');
/**
 * Helper para colorear un bloque de texto.
 *
 * @param {String} color Nombre del color a usar.
 * @param {Object} opts  Contexto de la plantilla.
 *
 * @return {String} Bloque de texto coloreado.
 */
module.exports = function (color, opts)
{
    let _text = opts.fn(this);
    if (color in chalk)
    {
        _text = opts && opts.hash && opts.hash.bold
            ? chalk[color].bold(_text)
            : chalk[color](_text);
    }

    return _text;
};
