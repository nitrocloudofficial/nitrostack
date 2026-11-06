import { describe, it, expect } from 'vitest';
import { inventoryPhp, scanPhpSources, phpFindings, PHP_EOL, type PhpInventory } from '../../src/modules/assessment/php-inventory.js';

const composer = (o: object) => JSON.stringify(o);
const ids = (fs: Array<{ id: string }>) => fs.map((f) => f.id);
const scan = (content: string, path = 'a.php') => scanPhpSources([{ path, content }]);
const day = (s: string) => new Date(`${s}T12:00:00Z`);

function inv(over: Partial<PhpInventory>): PhpInventory {
  return { hasComposer: true, hasLock: true, valid: true, deps: [], phpFileCount: 3, ...over };
}

describe('inventoryPhp', () => {
  it('uses exact versions from composer.lock and strips a leading v', () => {
    const r = inventoryPhp(
      {
        composerJson: composer({ require: { php: '^7.2', 'vendor/a': '^1.0' }, 'require-dev': { 'vendor/b': '^2.0' } }),
        composerLock: composer({ packages: [{ name: 'vendor/a', version: 'v1.4.2' }], 'packages-dev': [{ name: 'vendor/b', version: '2.1.0' }] })
      },
      10
    );
    expect(r.hasLock).toBe(true);
    expect(r.deps).toEqual([
      { name: 'vendor/a', version: '1.4.2', dev: false, approximate: false },
      { name: 'vendor/b', version: '2.1.0', dev: true, approximate: false }
    ]);
    expect(r.phpFileCount).toBe(10);
  });

  it('derives approximate versions from ranges', () => {
    const r = inventoryPhp({
      composerJson: composer({ require: { 'a/a': '^6.5', 'b/b': '~4.4.0', 'c/c': '>=7.2', 'd/d': '7.2.*', 'e/e': '^1.0 || ^2.0' } })
    }, 0);
    const v = Object.fromEntries(r.deps.map((d) => [d.name, d.version]));
    expect(v).toEqual({ 'a/a': '6.5.0', 'b/b': '4.4.0', 'c/c': '7.2.0', 'd/d': '7.2.0', 'e/e': '1.0.0' });
    expect(r.deps.every((d) => d.approximate && !d.dev)).toBe(true);
    expect(r.hasLock).toBe(false);
  });

  it('falls back to the range for packages missing from the lock', () => {
    const r = inventoryPhp({
      composerJson: composer({ require: { 'a/a': '^3.1' } }),
      composerLock: composer({ packages: [] })
    }, 0);
    expect(r.deps[0]).toMatchObject({ version: '3.1.0', approximate: true });
  });

  it('excludes php and ext-* and reads the php constraint', () => {
    const r = inventoryPhp({ composerJson: composer({ require: { php: '^7.2', 'ext-json': '*', 'ext-mbstring': '*', 'x/y': '^1.0' } }) }, 0);
    expect(r.deps.map((d) => d.name)).toEqual(['x/y']);
    expect(r.phpConstraint).toBe('^7.2');
    expect(r.minPhp).toBe('7.2');
  });

  it('takes the lowest php version across alternatives', () => {
    expect(inventoryPhp({ composerJson: composer({ require: { php: '>=5.6.4 || ^7.0' } }) }, 0).minPhp).toBe('5.6');
    expect(inventoryPhp({ composerJson: composer({ require: { php: '>=7.4' } }) }, 0).minPhp).toBe('7.4');
  });

  it('detects frameworks from composer packages', () => {
    const fw = (req: Record<string, string>) => inventoryPhp({ composerJson: composer({ require: req }) }, 0).framework;
    expect(fw({ 'laravel/framework': '^8.0', 'symfony/console': '^5.0' })).toBe('laravel');
    expect(fw({ 'symfony/http-kernel': '^5.4' })).toBe('symfony');
    expect(fw({ 'slim/slim': '^3.0' })).toBe('slim');
    expect(fw({ 'cakephp/cakephp': '^4.0' })).toBe('cakephp');
    expect(fw({ 'yiisoft/yii2': '~2.0' })).toBe('yii');
    expect(fw({ 'codeigniter4/framework': '^4.0' })).toBe('codeigniter');
    expect(fw({ 'johnpbloch/wordpress': '^6.0' })).toBe('wordpress');
    expect(fw({ 'monolog/monolog': '^2.0' })).toBeUndefined();
  });

  it('never throws on invalid or empty input', () => {
    const bad = inventoryPhp({ composerJson: '{ not json', composerLock: '###' }, 4);
    expect(bad.valid).toBe(false);
    expect(bad.deps).toEqual([]);
    expect(bad.phpFileCount).toBe(4);
    expect(inventoryPhp({ composerJson: '[]' }, 0).valid).toBe(false);
    expect(inventoryPhp({ composerJson: 'null' }, 0).valid).toBe(false);
    const empty = inventoryPhp({}, 0);
    expect(empty).toMatchObject({ hasComposer: false, hasLock: false, valid: true, deps: [] });
    expect(inventoryPhp({ composerJson: '   ' }, 0).hasComposer).toBe(false);
    const weird = inventoryPhp({ composerJson: composer({ require: { 'a/a': 5, 'b/b': null }, 'require-dev': [] }), composerLock: '{"packages":"x"}' }, 0);
    expect(weird.valid).toBe(true);
  });
});

describe('scanPhpSources rules', () => {
  const cases: Array<[string, string, string, string]> = [
    ['php-mysql-removed-api', "$c = mysql_connect('h', 'u', 'p');", "$c = mysqli_connect('h', 'u', 'p');", 'runtime'],
    ['php-sql-concatenation', "mysql_query(\"SELECT * FROM t WHERE id=\" . $_GET['id']);", '$pdo->query("SELECT 1");', 'security'],
    ['php-eval', 'eval($code);', '$x = retrieval($code);', 'security'],
    ['php-weak-password-hash', '$h = md5($password);', '$h = password_hash($password, PASSWORD_DEFAULT);', 'security'],
    ['php-unserialize-input', "$o = unserialize($_COOKIE['o']);", '$o = unserialize($stored, ["allowed_classes" => false]);', 'security'],
    ['php-dynamic-include', "include($_GET['page'] . '.php');", "require_once __DIR__ . '/config.php';", 'security'],
    ['php-extract-input', 'extract($_POST);', 'extract($row);', 'security'],
    ['php-errors-hidden', 'error_reporting(0);', 'error_reporting(E_ALL);', 'standards']
  ];

  for (const [id, bad, good, category] of cases) {
    it(`${id} fires on a minimal sample and not on a safe one`, () => {
      const hit = scan(`<?php\n${bad}\n`);
      expect(ids(hit)).toContain(id);
      const f = hit.find((x) => x.id === id);
      expect(f?.category).toBe(category);
      expect(f?.evidence).toBe('a.php:2');
      expect(ids(scan(`<?php\n${good}\n`))).not.toContain(id);
    });
  }

  it('flags other mysql_ calls and ini_set display_errors', () => {
    expect(ids(scan('<?php\n$r = mysql_fetch_array($q);'))).toContain('php-mysql-removed-api');
    expect(ids(scan("<?php\nini_set('display_errors', 1);"))).toContain('php-errors-hidden');
    expect(ids(scan("<?php\nini_set('display_errors', '0');"))).not.toContain('php-errors-hidden');
  });

  it('flags sql concatenation for mysqli_query, ->query and ->exec', () => {
    expect(ids(scan('<?php\nmysqli_query($c, "DELETE FROM t WHERE id=$_POST[id]");'))).toContain('php-sql-concatenation');
    expect(ids(scan("<?php\n$db->query('SELECT ' . $_REQUEST['c']);"))).toContain('php-sql-concatenation');
    expect(ids(scan("<?php\n$db->exec(\"DROP \" . $_COOKIE['t']);"))).toContain('php-sql-concatenation');
  });

  it('accepts prepared statements as safe', () => {
    const safe = '<?php\n$s = $pdo->prepare("SELECT * FROM t WHERE id = ?");\n$s->execute([$_GET["id"]]);\n$h = password_hash($pass, PASSWORD_DEFAULT);\n';
    expect(scan(safe)).toEqual([]);
  });

  it('flags inline html mixed with php only with 30+ tags', () => {
    const html = (n: number) => '<div><span></span></div>\n'.repeat(Math.ceil(n / 4));
    const many = scan(`<?php echo 1; ?>\n${html(40)}`);
    expect(many.find((f) => f.id === 'php-inline-html-mixed')).toMatchObject({ category: 'architecture', severity: 'info', evidence: 'a.php' });
    expect(ids(scan(`<?php echo 1; ?>\n${html(8)}`))).not.toContain('php-inline-html-mixed');
    expect(ids(scan(html(40)))).not.toContain('php-inline-html-mixed');
  });

  it('ignores comment lines', () => {
    const src = ['<?php', '// eval($x);', '# mysql_query($q);', ' * md5($password)', '/* extract($_GET); */', 'eval($ok);'].join('\n');
    const r = scan(src);
    expect(ids(r)).toEqual(['php-eval']);
    expect(r[0]?.evidence).toBe('a.php:6');
  });

  it('never puts matched code in evidence or other fields', () => {
    const secret = 'S3cretPassw0rdValue';
    const src = `<?php\n$h = md5("${secret}" . $password);\neval("${secret}");`;
    const out = JSON.stringify(scan(src));
    expect(out).not.toContain(secret);
    for (const f of scan(src)) expect(f.evidence).toMatch(/^a\.php:\d+$/);
  });

  it('respects the 200 file and 200 KB bounds', () => {
    const files = Array.from({ length: 201 }, (_, i) => ({ path: `f${String(i).padStart(3, '0')}.php`, content: '<?php\neval($x);' }));
    const r = scanPhpSources(files);
    expect(r.length).toBeLessThanOrEqual(5);
    const last = scanPhpSources([...files.slice(0, 200).map((f) => ({ ...f, content: '<?php\n$a = 1;' })), { path: 'f200.php', content: '<?php\neval($x);' }]);
    expect(last).toEqual([]);

    const big = '<?php\n' + '$a = 1;\n'.repeat(40000) + 'eval($late);\n';
    expect(big.length).toBeGreaterThan(300 * 1024);
    expect(scan(big)).toEqual([]);
    const early = '<?php\neval($early);\n' + '$a = 1;\n'.repeat(40000);
    expect(ids(scan(early))).toEqual(['php-eval']);
  });

  it('caps at 5 hits per rule', () => {
    const r = scan('<?php\n' + 'eval($x);\n'.repeat(12));
    expect(r.filter((f) => f.id === 'php-eval')).toHaveLength(5);
  });

  it('caps the total at 40 findings and sorts by severity, id, path', () => {
    const lines = [
      'mysql_query($q);',
      'mysql_query("x" . $_GET["a"]);',
      'eval($c);',
      '$h = md5($password);',
      'unserialize($_POST["d"]);',
      'include($_GET["p"]);',
      'extract($_REQUEST);',
      'error_reporting(0);'
    ].join('\n');
    const tags = '<p><b></b></p>\n'.repeat(20);
    const files = Array.from({ length: 6 }, (_, i) => ({ path: `m${i}.php`, content: `<?php\n${lines}\n?>\n${tags}` }));
    const r = scanPhpSources(files);
    expect(r).toHaveLength(40);
    const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 } as const;
    for (let i = 1; i < r.length; i++) {
      const a = r[i - 1]!;
      const b = r[i]!;
      expect(rank[a.severity]).toBeGreaterThanOrEqual(rank[b.severity]);
      if (a.severity === b.severity) expect(a.id <= b.id).toBe(true);
    }
    const counts = new Map<string, number>();
    for (const f of r) counts.set(f.id, (counts.get(f.id) ?? 0) + 1);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(5);
  });
});

describe('phpFindings', () => {
  const today = day('2026-10-30');

  it('table holds only well-formed dates for known versions', () => {
    for (const [k, v] of Object.entries(PHP_EOL)) {
      expect(k).toMatch(/^\d+\.\d+$/);
      expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(PHP_EOL['7.2']).toBe('2020-11-30');
    expect(PHP_EOL['8.1']).toBe('2025-12-31');
  });

  it('flags an expired version as high', () => {
    const f = phpFindings(inv({ phpConstraint: '^7.2', minPhp: '7.2' }), today).find((x) => x.id === 'php-version-eol');
    expect(f).toMatchObject({ category: 'runtime', severity: 'high' });
  });

  it('flags a version within 180 days as medium', () => {
    const f = phpFindings(inv({ phpConstraint: '^8.2', minPhp: '8.2' }), today).find((x) => x.id === 'php-version-eol');
    expect(f?.severity).toBe('medium');
  });

  it('stays quiet for far-future, unknown, or missing versions', () => {
    expect(ids(phpFindings(inv({ phpConstraint: '^8.4', minPhp: '8.4' }), today))).not.toContain('php-version-eol');
    expect(ids(phpFindings(inv({ phpConstraint: '^9.9', minPhp: '9.9' }), today))).not.toContain('php-version-eol');
    expect(ids(phpFindings(inv({ phpConstraint: '*' }), today))).not.toContain('php-version-eol');
  });

  it('handles the EOL boundary day', () => {
    const i = inv({ phpConstraint: '^7.2', minPhp: '7.2' }); // EOL 2020-11-30
    const sev = (d: string) => phpFindings(i, day(d)).find((x) => x.id === 'php-version-eol')?.severity;
    expect(sev('2020-11-29')).toBe('medium');
    expect(sev('2020-11-30')).toBe('medium');
    expect(sev('2020-12-01')).toBe('high');
  });

  it('flags the 180 day window edge', () => {
    const i = inv({ phpConstraint: '^7.2', minPhp: '7.2' });
    const sev = (d: string) => phpFindings(i, day(d)).find((x) => x.id === 'php-version-eol')?.severity;
    expect(sev('2020-06-03')).toBe('medium'); // 180 days before
    expect(sev('2020-06-02')).toBeUndefined(); // 181 days before
  });

  it('reports a missing composer.json when PHP files exist', () => {
    const f = phpFindings(inv({ hasComposer: false, hasLock: false, phpFileCount: 5 }), today);
    expect(f.find((x) => x.id === 'composer-missing')).toMatchObject({ category: 'dependencies', severity: 'medium' });
    expect(ids(f)).not.toContain('php-unpinned-version');
    expect(ids(phpFindings(inv({ hasComposer: false, hasLock: false, phpFileCount: 0 }), today))).toEqual([]);
  });

  it('reports a missing lock file', () => {
    const f = phpFindings(inv({ hasLock: false, phpConstraint: '^8.4', minPhp: '8.4' }), today);
    expect(f.find((x) => x.id === 'composer-no-lock')).toMatchObject({ category: 'dependencies', severity: 'medium' });
  });

  it('reports approximate versions as info', () => {
    const deps = [{ name: 'a/a', version: '1.0.0', dev: false, approximate: true }];
    const f = phpFindings(inv({ deps, phpConstraint: '^8.4', minPhp: '8.4' }), today);
    expect(f.find((x) => x.id === 'php-approximate-versions')).toMatchObject({ category: 'dependencies', severity: 'info' });
  });

  it('reports an unpinned php version', () => {
    const f = phpFindings(inv({}), today);
    expect(f.find((x) => x.id === 'php-unpinned-version')).toMatchObject({ category: 'runtime', severity: 'low' });
  });

  it('is quiet for a clean project and for invalid composer.json', () => {
    const clean = inv({ phpConstraint: '^8.4', minPhp: '8.4', deps: [{ name: 'a/a', version: '1.0.0', dev: false, approximate: false }] });
    expect(phpFindings(clean, today)).toEqual([]);
    expect(phpFindings(inv({ valid: false }), today)).toEqual([]);
  });
});
