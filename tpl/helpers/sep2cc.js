const sep2cc = require('sep2cc');
/**
 * Helper para convertir texto separado por un carácter a camelCase.
 *
 * @param {String} value    Valor a convertir.
 * @param {Object} context  Contexto de la plantilla.
 *
 * @return {String} Texto convertido.
 */
module.exports = function(value, context)
{
    const _sep = context.hash.sep || '-';
    if (context.hash.capitalize)
    {
        value = _sep + value;
    }
    return sep2cc(value, _sep);
};
