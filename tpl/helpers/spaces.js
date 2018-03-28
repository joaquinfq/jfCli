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
    let _value = String(this[property] || '');

    return property && property in this && Array.isArray(items) && items.length
        ? ' '.repeat(Math.max(...items.map(i => String(i[property]).length)) - _value.length)
        : _value;
};
