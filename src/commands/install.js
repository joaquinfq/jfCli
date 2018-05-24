const cmdConfig = require('./config');
const isObject  = require('../utils/is-object');
const path      = require('path');
const SEP       = '~';
/**
 * Instala módulos a partir de rutas o URLs.
 *
 * @command
 *
 * @param {jf.cli.Cli} cli  Gestor del script.
 * @param {Object}     argv Argumentos de la línea de comandos.
 *
 * @return {Promise}
 */
module.exports = async function install(cli, argv)
{
    if (isObject(argv) && Array.isArray(argv._))
    {
        const _cmds = argv._;
        if (Array.isArray(_cmds) && _cmds[0] === 'install')
        {
            const _directories = Object.values(cli.directories);
            for (const _module of _cmds.slice(1))
            {
                const [_type, ..._parts] = _module.split(SEP);
                const _path              = _parts.join(SEP);
                switch (_type)
                {
                    case 'file':
                        _directories.push(path.resolve(_path));
                        break;
                    case 'git':
                    case 'hg':
                        const _name   = path.basename(_path, `.${_type}`);
                        const _outdir = path.resolve(cli.rootDir, '..');
                        const _moddir = path.join(_outdir, _name);
                        if (cli.exists(_moddir))
                        {
                            throw new Error(`El módulo ${_name} ya existe. Se debe eliminar el directorio o usar file~${_moddir}`);
                        }
                        else
                        {
                            cli.log('debug', 'Instalando módulo %s en %s', _name, _outdir);
                            await cli.script(
                                _type,
                                ['clone', _path],
                                {
                                    cwd : _outdir
                                }
                            );
                            if (cli.exists(_moddir))
                            {
                                _directories.push(_moddir);
                                if (cli.exists(path.join(_moddir, 'package.json')))
                                {
                                    await cli.script(
                                        'npm',
                                        ['install'],
                                        {
                                            cwd : _moddir
                                        }
                                    );
                                }
                            }
                        }
                        break;
                    default:
                        if (path.isAbsolute(_module) || _module[0] === '.')
                        {
                            _directories.push(path.resolve(_module));
                        }
                        else
                        {
                            throw new Error('Formato desconocido del módulo: ' + _module);
                        }
                        break;
                }
            }
            cli.log('debug', 'Actualizando configuración');
            cmdConfig(
                cli,
                {
                    directories : _directories
                }
            );
        }
    }
};
