const isObject = require('../../src/utils/is-object');

function check(value, property)
{
    return String(
        isObject(value) && property in value
            ? value[property]
            : ''
    );
}

/**
 * Crea cadenas de texto en blanco para rellenar y alinear textos en la plantilla.
 *
 * @param {Object} items    Listado de elementos.
 * @param {String} property Nombre de la propiedad de `items` que se usará para obtener la longitud.
 *
 * @return {String}
 */
module.exports = function spaces(items, property)
{
    let _value;
    if (Array.isArray(items) && items.length)
    {
        if (property && typeof property === 'string')
        {
            // Listado de elementos objetos que necesitan el valor de la propiedad.
            _value = String(this[property] || '');
            if (_value)
            {
                _value = ' '.repeat(
                    Math.max(...items.map(i => String(check(i, property)).length)) - _value.length
                );
            }
        }
        else
        {
            // Listado de elementos escalares.
            _value = String(this);
            _value = ' '.repeat(Math.max(...items.map(i => String(i).length)) - _value.length);
        }
    }

    return _value;
};
