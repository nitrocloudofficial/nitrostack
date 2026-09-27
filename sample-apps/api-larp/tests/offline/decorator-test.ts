import { Injectable } from '@nitrostack/core';
@Injectable()
class Foo {}
console.log('Class defined');
process.stdin.unref();
process.stdout.unref();
process.stderr.unref();
