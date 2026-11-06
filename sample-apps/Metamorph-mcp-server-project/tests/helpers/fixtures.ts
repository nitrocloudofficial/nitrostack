import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// Synthetic legacy projects for tests and the demo. Written from code at run time on purpose:
// committed manifests with known-vulnerable versions would raise alerts on this repository.
// Versions below return real advisories from OSV (checked 2026-10-30): lodash 4.17.15, guzzle 6.5.0, symfony/http-kernel 4.4.0.
async function put(root: string, files: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const target = join(root, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

export async function writeNodeFixture(dir: string): Promise<void> {
  await put(dir, {
    'package.json': JSON.stringify(
      {
        name: 'legacy-node-orders',
        version: '1.0.0',
        main: 'index.js',
        engines: { node: '>=10' },
        scripts: { start: 'node index.js' },
        dependencies: { express: '^4.16.0', lodash: '4.17.15', request: '^2.88.0' }
      },
      null,
      2
    ),
    'package-lock.json': JSON.stringify(
      {
        name: 'legacy-node-orders',
        lockfileVersion: 3,
        packages: {
          '': { name: 'legacy-node-orders', version: '1.0.0' },
          'node_modules/express': { version: '4.16.0' },
          'node_modules/lodash': { version: '4.17.15' },
          'node_modules/request': { version: '2.88.0' }
        }
      },
      null,
      2
    ),
    '.nvmrc': '10\n',
    '.env': 'PORT=3000\n',
    'index.js':
      "var express = require('express');\nvar _ = require('lodash');\nvar app = express();\n" +
      "var orders = [{ id: 1, total: 20 }, { id: 2, total: 35 }];\n" +
      "app.get('/orders', function (req, res) { res.json(_.sortBy(orders, 'total')); });\n" +
      "app.listen(process.env.PORT || 3000);\n"
  });
}

export async function writePhpFixture(dir: string): Promise<void> {
  await put(dir, {
    'composer.json': JSON.stringify(
      { name: 'legacy/php-shop', require: { php: '>=7.2', 'guzzlehttp/guzzle': '6.5.0', 'symfony/http-kernel': '4.4.0' } },
      null,
      2
    ),
    'composer.lock': JSON.stringify(
      { packages: [{ name: 'guzzlehttp/guzzle', version: '6.5.0' }, { name: 'symfony/http-kernel', version: 'v4.4.0' }] },
      null,
      2
    ),
    '.htaccess': 'RewriteEngine On\nRewriteRule ^shop/(.*)$ index.php?page=$1 [L]\n',
    'includes/db.php': "<?php\nerror_reporting(0);\n$db = mysql_connect('localhost', 'shop', 'change-me');\nmysql_select_db('shop');\n",
    'index.php':
      "<?php\nsession_start();\ninclude('includes/db.php');\n$id = $_GET['id'];\n" +
      "$result = mysql_query(\"SELECT * FROM products WHERE id = \" . $_GET['id']);\n?>\n" +
      '<html><body><h1>Shop</h1><ul><li>One</li><li>Two</li><li>Three</li><li>Four</li><li>Five</li>' +
      '<li>Six</li><li>Seven</li><li>Eight</li><li>Nine</li><li>Ten</li><li>Eleven</li><li>Twelve</li>' +
      '<li>Thirteen</li><li>Fourteen</li><li>Fifteen</li><li>Sixteen</li><li>Seventeen</li><li>Eighteen</li>' +
      '<li>Nineteen</li><li>Twenty</li><li>A</li><li>B</li><li>C</li><li>D</li><li>E</li><li>F</li><li>G</li>' +
      '<li>H</li><li>I</li><li>J</li><li>K</li></ul></body></html>\n',
    'login.php':
      "<?php\ninclude('includes/db.php');\n$pass = md5($_POST['password']);\n" +
      "mysqli_query($db, \"SELECT * FROM users WHERE name = '\" . $_POST['user'] . \"' AND pass = '$pass'\");\n",
    'page.php': "<?php\ninclude($_GET['page'] . '.php');\n"
  });
}
