/** eslint-env node */
import esbuild from 'esbuild';
import path from 'path';

esbuild
  .build({
    entryPoints: [path.join(__dirname, '..', 'src', 'index.ts')],
    outfile: path.join(__dirname, '..', 'dist', 'index.js'),
    platform: 'node',
    bundle: true,
    minify: process.env.node_env === 'production',
    external: [
      '@mikro-orm/seeder',
      '@mikro-orm/mongodb',
      '@mikro-orm/mysql',
      '@mikro-orm/mariadb',
      '@mikro-orm/better-sqlite',
      '@mikro-orm/sqlite',
      '@mikro-orm/entity-generator',
      // '@mikro-orm/migrations',
      'sqlite3',
      'mysql',
      'mysql2',
      'better-sqlite3',
      'pg-native',
      'pg-query-stream',
      'tedious',
      'oracledb',
    ],
    sourcemap: true,
    tsconfig: path.join(__dirname, '..', 'tsconfig.json'),
  })
  .catch(() => {
    process.exit(1);
  });
