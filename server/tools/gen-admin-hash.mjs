// Gera o valor da variável ADMIN_HASH do Cloudflare para trocar o código de administrador.
// Uso: node server/tools/gen-admin-hash.mjs NOVO_CODIGO   (o código não é salvo em nenhum arquivo)
import { randomBytes, pbkdf2Sync } from 'node:crypto';
const code = process.argv[2];
if (!code || code.length < 6 || code.length > 64) { console.error('Uso: node gen-admin-hash.mjs CODIGO (6 a 64 caracteres)'); process.exit(1); }
const salt = randomBytes(16);
console.log('100000:' + salt.toString('hex') + ':' + pbkdf2Sync(code, salt, 100000, 32, 'sha256').toString('hex'));
