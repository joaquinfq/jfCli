const babylon   = require('babylon');
const cc2sep    = require('cc2sep');
const Option    = require('../Option');
const path      = require('path');
const reBrief   = /\s+(?:\*\s+)+/m;
const reCommand = /@command([^\n\r]*)/;
const reOption  = /@option\s+[^\n\r]+/gs;
const plugins   = [
    'asyncGenerators',
    'bigInt',
    'classPrivateMethods',
    'classPrivateProperties',
    'classProperties',
    'decorators',
    'doExpressions',
    'dynamicImport',
    'exportDefaultFrom',
    'exportExtensions',
    'exportNamespaceFrom',
    'flow',
    'functionBind',
    'functionSent',
    'importMeta',
    'jsx',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'optionalChaining',
    'pipelineOperator',
    'throwExpressions'
];

/**
 * Analiza un token de tipo 'ExpressionStatement'.
 *
 * @param {Object} commands Objecto donde se agregará el resultado.
 * @param {Object} node     Información del nodo.
 */
function expressionStatement(commands, node)
{
    const _comment = extractComment(node);
    if (_comment)
    {
        if (_comment[''])
        {
            const _expression = node.expression;
            const _right      = _expression.right;
            if (_right && (_right.type === 'ArrowFunctionExpression' || _right.type === 'FunctionExpression'))
            {
                if (_right.id)
                {
                    commands[identifier(_right.id)] = _comment[''];
                }
                else
                {
                    const _start = _right.loc.start;
                    throw new Error(`ERROR(${_start.line},${_start.column}): Se debe asignar un nombre a la función.`);
                }
            }
        }
        else
        {
            Object.assign(commands, _comment);
        }
    }
}

/**
 * Extrae la información del comentario.
 *
 * @param {Object} node Información del nodo.
 */
function extractComment(node)
{
    const _comments = node.leadingComments;
    let _info;
    if (Array.isArray(_comments))
    {
        _info = _comments
            .filter(comment => comment.type === 'CommentBlock' && comment.value.includes('@command'))
            .map(comment => comment.value)
            .join('\n')
            .trim();
        if (_info)
        {
            _info = parseComment(_info);
        }
    }
    return _info;
}

/**
 * Analiza un token de tipo 'FunctionDeclaration'.
 *
 * @param {Object} commands Objecto donde se agregará el resultado.
 * @param {Object} node     Información del nodo.
 */
function functionDeclaration(commands, node)
{
    const _comment = extractComment(node);
    if (_comment)
    {
        if (_comment[''])
        {
            commands[identifier(node.id)] = _comment[''];
        }
        else
        {
            Object.assign(commands, _comment);
        }
    }
}

/**
 * Extrae el nombre del identificador.
 *
 * @param {Object} node Información del nodo.
 */
function identifier(node)
{
    return node.type === 'Identifier'
        ? cc2sep(node.name)
        : '';
}

/**
 * Analizando los comentarios del archivo en busca de comandos.
 * El comentario tiene la siguiente estructura:
 *
 * ```
 * @option n Nombre del elemento que se creará|name|string
 * ```
 *
 * Ver la clase `Option` para más detalle del formato de la descripción.
 *
 *
 * @param {jf.cli.Cli} cli      Gestor del script.
 * @param {Object}     commands Objeto donde se irán colocando los comandos que se encuentren.
 * @param {Object}     file     Ruta del archivo a analizar.
 */
function parse(cli, commands, file)
{
    const _ast  = babylon
        .parse(
            cli.read(file),
            {
                plugins,
                sourceType : 'module',
                ranges     : false,
                tokens     : false
            }
        );
    const _body = _ast.program.body;
    if (Array.isArray(_body))
    {
        const _commands = {};
        const _prefix   = cc2sep(path.basename(file, path.extname(file)));
        _body.forEach(
            node =>
            {
                switch (node.type)
                {
                    case 'ExpressionStatement':
                        expressionStatement(_commands, node);
                        break;
                    case 'FunctionDeclaration':
                        functionDeclaration(_commands, node);
                        break;
                    case 'VariableDeclaration':
                        variableDeclaration(_commands, node);
                        break;
                }
            }
        );
        if (_prefix in _commands)
        {
            commands[_prefix] = _commands[_prefix];
            delete _commands[_prefix];
        }
        for (let _command of Object.keys(_commands).sort(sort))
        {
            if (_command)
            {
                commands[_prefix + ':' + _command] = _commands[_command];
            }
        }
    }
}

/**
 * Obtiene la información de los comandos disponibles analizando el comentario.
 *
 * @param {String} comment Comentario a analizar.
 */
function parseComment(comment)
{
    let _result = {};
    if (comment)
    {
        const _command = comment.match(reCommand);
        if (_command)
        {
            const _config = _result[cc2sep(_command[1].trim())] = {};
            const _brief = comment.split(reBrief);
            if (_brief)
            {
                _config[''] = _brief[1].trim();
            }
            const _options = comment.match(reOption);
            if (_options)
            {
                _options.sort(sort).forEach(
                    option =>
                    {
                        const [, _name, ..._desc] = option.split(/\s+/);
                        _config[_name]            = new Option(_name + '|' + _desc.join(' '));
                    }
                );
            }
        }
    }
    return _result;
}

/**
 * Callback usado para ordenar un array de opciones sin distinguir mayúsculas de minúsculas.
 *
 * @param {String} v1 Valor 1 a comparar.
 * @param {String} v2 Valor 2 a comparar.
 *
 * @return {Number} Resultado de la comparación (<0,0,>0).
 */
function sort(v1, v2)
{
    return v1.toLowerCase().localeCompare(v2.toLowerCase());
}

/**
 * Analiza un token de tipo 'VariableDeclaration'.
 *
 * @param {Object} commands Objecto donde se agregará el resultado.
 * @param {Object} node     Información del nodo.
 */
function variableDeclaration(commands, node)
{
    const _comment = extractComment(node);
    if (_comment)
    {
        if (_comment[''])
        {
            commands[identifier(node.declarations[0].id)] = _comment[''];
        }
        else
        {
            Object.assign(commands, _comment);
        }
    }
}

/**
 * Construye los comandos analizando los comentarios de un listado de archivos.
 *
 * @param {jf.cli.Cli} cli      Gestor del script.
 * @param {Object}     commands Objeto donde se irán colocando los comandos que se encuentren.
 * @param {Object}     files    Listado de archivos a analizar.
 */
module.exports = function fromFiles(cli, commands, files)
{
    try
    {
        if (Array.isArray(files))
        {
            files.forEach(file => parse(cli, commands, file));
        }
    }
    catch (e)
    {
        console.log(e.message);
    }
};
