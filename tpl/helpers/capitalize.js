/**
 * Helper para capitalizar un texto.
 *
 * @param {String} value Valor a convertir.
 *
 * @return {String} Texto convertido.
 */
module.exports = function (value)
{
    const _text = String(value);

    return _text[0].toUpperCase() + _text.substr(1);
};
