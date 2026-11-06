import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

// The legacy PHP shop after modernization: every finding the assessor raises for the legacy version is fixed.
// Dependency versions were checked against OSV on 2026-10-30: guzzlehttp/guzzle 8.3.1 and symfony/http-kernel 7.3.0 had 0 advisories.
async function put(root: string, files: Record<string, string>): Promise<void> {
  for (const [rel, content] of Object.entries(files)) {
    const target = join(root, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

export async function writeModernPhpFixture(dir: string): Promise<void> {
  await put(dir, {
    'composer.json': JSON.stringify(
      { name: 'modern/php-shop', require: { php: '^8.4', 'guzzlehttp/guzzle': '^8.3', 'symfony/http-kernel': '^7.3' } },
      null,
      2
    ),
    'composer.lock': JSON.stringify(
      { packages: [{ name: 'guzzlehttp/guzzle', version: '8.3.1' }, { name: 'symfony/http-kernel', version: 'v7.3.0' }] },
      null,
      2
    ),
    Dockerfile: 'FROM php:8.4-apache\nCOPY . /var/www/html\nUSER www-data\n',
    '.github/workflows/ci.yml': 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n',
    'src/Database.php':
      "<?php\ndeclare(strict_types=1);\n\nfinal class Database\n{\n    public function __construct(private PDO $pdo) {}\n\n" +
      "    public function product(int $id): ?array\n    {\n        $stmt = $this->pdo->prepare('SELECT * FROM products WHERE id = :id');\n" +
      "        $stmt->execute(['id' => $id]);\n        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;\n    }\n}\n",
    'src/Auth.php':
      "<?php\ndeclare(strict_types=1);\n\nfinal class Auth\n{\n    public function hash(string $secret): string\n    {\n        return password_hash($secret, PASSWORD_DEFAULT);\n    }\n\n" +
      "    public function check(string $secret, string $hash): bool\n    {\n        return password_verify($secret, $hash);\n    }\n}\n",
    'public/index.php':
      "<?php\ndeclare(strict_types=1);\n\nrequire __DIR__ . '/../vendor/autoload.php';\n\n$id = (int) ($_GET['id'] ?? 0);\n$db = new Database(new PDO(getenv('DB_DSN') ?: 'sqlite::memory:'));\n" +
      "$product = $db->product($id);\nrequire __DIR__ . '/../templates/shop.html.php';\n",
    'templates/shop.html.php': "<h1><?= htmlspecialchars($product['name'] ?? 'Not found') ?></h1>\n"
  });
}
