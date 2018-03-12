const assert   = require('assert');
const Cli      = require('../../src/Cli');
const testFile = require(__filename.replace('/test/', '/src/'));
//------------------------------------------------------------------------------
// Pruebas con diferentes maneras de crear una función.
//------------------------------------------------------------------------------
/**
 * Descripción f1
 *
 * @command
 */
function f1(){}

/**
 * Descripción f2
 *
 * @command
 */
const f2 = function (){};
/**
 * Descripción f3
 *
 * @command
 */
const f3 = function f2(){};
/**
 * Descripción f4
 *
 * @command f4named
 */
const f4 = () => null;

/**
 * Descripción export
 *
 * @command export
 */
exports = () => null;
/**
 * Descripción from-files
 *
 * @command
 */
function fromFiles(){}
/**
 * Descripción test
 *
 * @command
 *
 * @option b Opción de tipo boolean|boolean
 * @option n Opción de tipo number|number|number
 * @option s Opción de tipo string|string|string
 */
module.exports = function test(){};

//------------------------------------------------------------------------------
// Inicio de las pruebas
//------------------------------------------------------------------------------
const commands = {};
testFile(new Cli(), commands, [__filename]);
//console.log(JSON.stringify(commands, null, 4));
assert.deepStrictEqual(
    commands,
    {
        'from-files'         : {
            '?' : 'Descripción from-files'
        },
        'from-files:f1'      : {
            '?' : 'Descripción f1'
        },
        'from-files:f2'      : {
            '?' : 'Descripción f2'
        },
        'from-files:f3'      : {
            '?' : 'Descripción f3'
        },
        'from-files:f4named' : {
            '?' : 'Descripción f4'
        },
        'from-files:export'  : {
            '?' : 'Descripción export'
        },
        'from-files:test'    : {
            '?' : 'Descripción test',
            'b' : 'Opción de tipo boolean|boolean',
            'n' : 'Opción de tipo number|number|number',
            's' : 'Opción de tipo string|string|string'
        }
    }
);

