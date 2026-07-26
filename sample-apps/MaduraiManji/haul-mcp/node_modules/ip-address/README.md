[![CircleCI](https://dl.circleci.com/status-badge/img/circleci/9fJmTZfn8d8p7GtVt688PY/JjriGjhcxBD6zYKygMZaet/tree/master.svg?style=svg&circle-token=7baede7efd3db5f1f25fb439e97d5f695ff76318)](https://dl.circleci.com/status-badge/redirect/circleci/9fJmTZfn8d8p7GtVt688PY/JjriGjhcxBD6zYKygMZaet/tree/master)
[![codecov]](https://codecov.io/github/beaugunderson/ip-address?branch=master)
[![downloads]](https://www.npmjs.com/package/ip-address)
[![npm]](https://www.npmjs.com/package/ip-address)

[codecov]: https://codecov.io/github/beaugunderson/ip-address/coverage.svg?branch=master
[downloads]: https://img.shields.io/npm/dm/ip-address.svg
[npm]: https://img.shields.io/npm/v/ip-address.svg

## ip-address

`ip-address` is a library for validating and manipulating IPv4 and IPv6 addresses in JavaScript and TypeScript.

### Install

```sh
npm install ip-address
```

### Examples

```ts
import { Address4, Address6 } from 'ip-address';

// Validation
Address4.isValid('192.168.1.1');           // true
Address6.isValid('2001:db8::1');           // true
Address6.isValid('not an address');        // false

// Parsing (throws AddressError on invalid input)
const v4 = new Address4('192.168.1.1/24');
const v6 = new Address6('2001:db8::1/64');

// Subnet membership
const host = new Address4('192.168.1.42');
const network = new Address4('192.168.1.0/24');
host.isInSubnet(network);                  // true

// Subnet range
network.startAddress().correctForm();      // '192.168.1.0'
network.endAddress().correctForm();        // '192.168.1.255'

// Strict network-address check (host bits must be zero).
// isValid() accepts CIDRs with host bits set — '192.168.1.5/24' is a valid
// host-with-subnet, but it isn't a network address.
const cidr = new Address4('192.168.1.5/24');
Address4.isValid('192.168.1.5/24');                                // true
cidr.correctForm() === cidr.startAddress().correctForm();          // false

// Address properties
const link = new Address6('fe80::1');
link.isLinkLocal();                        // true
link.isMulticast();                        // false
link.isLoopback();                         // false

new Address4('192.168.1.1').isPrivate();   // true (RFC 1918)
new Address6('fc00::1').isULA();           // true (RFC 4193)

// Numeric and byte representations
v4.bigInt();                               // 3232235777n
v4.toArray();                              // [192, 168, 1, 1]
v6.canonicalForm();                        // '2001:0db8:0000:0000:0000:0000:0000:0001'

// Embedded IPv4 + Teredo
const teredo = new Address6('2001:0:ce49:7601:e866:efff:62c3:fffe');
teredo.inspectTeredo().client4;            // '157.60.0.1'

// Parse host + port from a URL
Address6.fromURL('http://[2001:db8::1]:8080/').port;  // 8080
```

### Features

- Written in TypeScript with full type definitions; usable from CommonJS and ESM
- Zero runtime dependencies
- Parses all standard IPv4 and IPv6 notations, including subnets and zones
- Parses IPv6 hosts (and ports) from URLs via `Address6.fromURL(url)`
- Subnet membership checks (`isInSubnet`) and range queries (`startAddress` / `endAddress`)
- Special-property checks: private (RFC 1918) / ULA (RFC 4193), loopback, link-local, multicast, broadcast, unspecified, CGNAT, documentation, Teredo, 6to4, v4-in-v6
- Decodes [Teredo](http://en.wikipedia.org/wiki/Teredo_tunneling#IPv6_addressing) and 6to4 tunneling information
- Conversions: canonical/correct form, hex, binary, decimal, byte arrays, BigInt, `in-addr.arpa` / `ip6.arpa`
- Runs in Node.js and the browser
- Thousands of test cases

### Terminology

A few terms used throughout the API can be confusing if you haven't worked deeply with IPv6 before:

- **Correct form** — the shortest valid representation, per [RFC 5952](https://datatracker.ietf.org/doc/html/rfc5952): leading zeros stripped, the longest run of zero groups collapsed to `::`, and hex digits lowercased (e.g. `2001:db8::1`). This is what most software displays.
- **Canonical form** — the fully expanded representation: all 8 groups, each padded to 4 hex digits, no `::` collapsing (e.g. `2001:0db8:0000:0000:0000:0000:0000:0001`). Useful for sorting and byte-exact comparison.
- **Subnet** — the network portion of an address expressed as a CIDR prefix length (e.g. `/24` for IPv4, `/64` for IPv6). `startAddress()` / `endAddress()` return the bounds of the subnet's range.
- **Zone** — the IPv6 scope identifier appended after `%`, used to disambiguate link-local addresses across interfaces (e.g. `fe80::1%eth0`).
- **v4-in-v6** — mixed notation that embeds an IPv4 address as the last 32 bits of an IPv6 address, e.g. `::ffff:192.168.0.1`. Used for IPv4-mapped IPv6 addresses.
- **Teredo** — a tunneling protocol that encodes an IPv4 endpoint, port, and flags inside a `2001::/32` IPv6 address. `inspectTeredo()` decodes those fields.
- **6to4** — a tunneling protocol that embeds an IPv4 address as the second 16 bits of a `2002::/16` IPv6 address. `inspect6to4()` decodes the embedded v4 address.

### API

<!-- API:START -->

#### AddressError

**Constructor**

- `new AddressError(message: string, parseMessage?: string): AddressError`

**Properties**

- `parseMessage: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/address-error.ts#L2)

#### Address4

Represents an IPv4 address

**Constructor**

- `new Address4(address: string): Address4`

**Static methods**

- `static isValid(address: string): boolean` — Returns true if the given string is a valid IPv4 address (with optional CIDR subnet), false otherwise. Host bits in the subnet portion are allowed (e.g. `192.168.1.5/24` is valid); for strict network-address validation compare `correctForm()` to `startAddress().correctForm()`, or use `networkForm()`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L53)
- `static fromAddressAndMask(address: string, mask: string): Address4` — Construct an `Address4` from an address and a dotted-decimal subnet mask given as separate strings (e.g. as returned by Node's `os.networkInterfaces()`). Throws `AddressError` if the mask is non-contiguous (e.g. `255.0.255.0`). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L110)
- `static fromAddressAndWildcardMask(address: string, wildcardMask: string): Address4` — Construct an `Address4` from an address and a Cisco-style wildcard mask given as separate strings (e.g. `0.0.0.255` for a `/24`). The wildcard mask is the bitwise inverse of the subnet mask. Throws `AddressError` if the mask is non-contiguous (e.g. `0.255.0.255`). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L124)
- `static fromWildcard(input: string): Address4` — Construct an `Address4` from a wildcard pattern with trailing `*` octets. The number of trailing wildcards determines the prefix length: each `*` represents 8 bits. Only trailing whole-octet wildcards are supported. Partial-octet wildcards (e.g. `192.168.0.1*`) and interior wildcards (e.g. `192.*.0.1`) throw `AddressError`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L146)
- `static fromHex(hex: string): Address4` — Converts a hex string to an IPv4 address object. Accepts 8 hex digits with optional `:` separators (e.g. `'7f000001'` or `'7f:00:00:01'`). Throws `AddressError` for any other length or for non-hex characters. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L181)
- `static fromInteger(integer: number): Address4` — Converts an integer into a IPv4 address object. The integer must be a non-negative safe integer in the range `[0, 2**32 - 1]`; otherwise `AddressError` is thrown. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L204)
- `static fromArpa(arpaFormAddress: string): Address4` — Return an address from in-addr.arpa form [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L220)
- `static fromBigInt(bigInt: bigint): Address4` — Converts a BigInt to a v4 address object. The value must be in the range `[0, 2**32 - 1]`; otherwise `AddressError` is thrown. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L367)
- `static fromByteArray(bytes: number[]): Address4` — Convert a byte array to an Address4 object. To convert from a Node.js `Buffer`, spread it: `Address4.fromByteArray([...buf])`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L382)
- `static fromUnsignedByteArray(bytes: number[]): Address4` — Convert an unsigned byte array to an Address4 object [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L402)

**Instance methods**

- `parse(address: string): string[]` — Parses an IPv4 address string into its four octet groups and stores the result on `this.parsedAddress`. Called automatically by the constructor; you typically don't need to call it directly. Throws `AddressError` if the input is not a valid IPv4 address. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L70)
- `correctForm(): string` — Returns the address in correct form: octets joined with `.` and any leading zeros stripped (e.g. `192.168.1.1`). For IPv4 this matches the canonical dotted-decimal representation. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L91)
- `toHex(): string` — Converts an IPv4 address object to a hex string [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L233)
- `toArray(): number[]` — Converts an IPv4 address object to an array of bytes. To get a Node.js `Buffer`, wrap the result: `Buffer.from(address.toArray())`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L243)
- `toGroup6(): string` — Converts an IPv4 address object to an IPv6 address group [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L251)
- `bigInt(): bigint` — Returns the address as a `bigint` [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L270)
- `startAddress(): Address4` — The first address in the range given by this address' subnet. Often referred to as the Network Address. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L287)
- `startAddressExclusive(): Address4` — The first host address in the range given by this address's subnet ie the first address after the Network Address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L296)
- `endAddress(): Address4` — The last address in the range given by this address' subnet Often referred to as the Broadcast [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L314)
- `endAddressExclusive(): Address4` — The last host address in the range given by this address's subnet ie the last address prior to the Broadcast Address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L323)
- `subnetMaskAddress(): Address4` — The dotted-decimal form of the subnet mask, e.g. `255.255.240.0` for a `/20`. Returns an `Address4`; call `.correctForm()` for the string. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L333)
- `wildcardMask(): Address4` — The Cisco-style wildcard mask, e.g. `0.0.0.255` for a `/24`. This is the bitwise inverse of `subnetMaskAddress()`. Returns an `Address4`; call `.correctForm()` for the string. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L345)
- `networkForm(): string` — The network address in CIDR string form, e.g. `192.168.1.0/24` for `192.168.1.5/24`. For an address with no explicit subnet the prefix is `/32`, e.g. `networkForm()` on `192.168.1.5` returns `192.168.1.5/32`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L357)
- `mask(mask?: number): string` — Returns the first n bits of the address, defaulting to the subnet mask [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L416)
- `getBitsBase2(start: number, end: number): string` — Returns the bits in the given range as a base-2 string [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L428)
- `reverseForm(options?: ReverseFormOptions): string` — Return the reversed ip6.arpa form of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L438)
- `isMulticast(): boolean` — Returns true if the given address is a multicast address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L470)
- `isPrivate(): boolean` — Returns true if the address is in one of the [RFC 1918](https://datatracker.ietf.org/doc/html/rfc1918) private address ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L478)
- `isLoopback(): boolean` — Returns true if the address is in the loopback range `127.0.0.0/8` ([RFC 1122](https://datatracker.ietf.org/doc/html/rfc1122)). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L486)
- `isLinkLocal(): boolean` — Returns true if the address is in the link-local range `169.254.0.0/16` ([RFC 3927](https://datatracker.ietf.org/doc/html/rfc3927)). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L494)
- `isUnspecified(): boolean` — Returns true if the address is the unspecified address `0.0.0.0`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L502)
- `isBroadcast(): boolean` — Returns true if the address is the limited broadcast address `255.255.255.255` ([RFC 919](https://datatracker.ietf.org/doc/html/rfc919)). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L510)
- `isCGNAT(): boolean` — Returns true if the address is in the carrier-grade NAT range `100.64.0.0/10` ([RFC 6598](https://datatracker.ietf.org/doc/html/rfc6598)). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L518)
- `binaryZeroPad(): string` — Returns a zero-padded base-2 string representation of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L526)
- `groupForV6(): string` — Groups an IPv4 address for inclusion at the end of an IPv6 address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L537)

**Properties**

- `address: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L14)
- `addressMinusSuffix: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L15)
- `groups: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L16)
- `parsedAddress: string[]` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L17)
- `parsedSubnet: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L18)
- `subnet: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L19)
- `subnetMask: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L20)
- `v4: boolean` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L21)
- `isCorrect: (this: Address4 | Address6) => boolean` — Returns true if the address is correct, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L99)
- `isInSubnet: (this: Address4 | Address6, address: Address4 | Address6) => boolean` — Returns true if the given address is in the subnet of the current address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L456)
- `isHostInSubnet: (this: Address4 | Address6, address: Address4 | Address6) => boolean` — Returns true if this address's host bits fall inside the given subnet, ignoring this address's own subnet mask. See common.isHostInSubnet. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv4.ts#L464)

#### Address6

Represents an IPv6 address

**Constructor**

- `new Address6(address: string, optionalGroups?: number): Address6`

**Static methods**

- `static isValid(address: string): boolean` — Returns true if the given string is a valid IPv6 address (with optional CIDR subnet and zone identifier), false otherwise. Host bits in the subnet portion are allowed (e.g. `2001:db8::1/32` is valid); for strict network-address validation compare `correctForm()` to `startAddress().correctForm()`, or use `networkForm()`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L168)
- `static fromBigInt(bigInt: bigint): Address6` — Convert a BigInt to a v6 address object. The value must be in the range `[0, 2**128 - 1]`; otherwise `AddressError` is thrown. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L189)
- `static fromURL(url: string): { error: string; address: null; port: null } | { error?: undefined; address: Address6; port: number | null }` — Parse a URL (with optional bracketed host and port) into an address and port. Returns either `{ address, port }` on success or `{ error, address: null, port: null }` if the URL could not be parsed. Ports are returned as numbers (or `null` if absent or out of range). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L214)
- `static fromAddressAndMask(address: string, mask: string): Address6` — Construct an `Address6` from an address and a hex subnet mask given as separate strings (e.g. as returned by Node's `os.networkInterfaces()`). Throws `AddressError` if the mask is non-contiguous (e.g. `ffff::ffff`). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L278)
- `static fromAddressAndWildcardMask(address: string, wildcardMask: string): Address6` — Construct an `Address6` from an address and a Cisco-style wildcard mask given as separate strings (e.g. `::ffff:ffff:ffff:ffff` for a `/64`). The wildcard mask is the bitwise inverse of the subnet mask. Throws `AddressError` if the mask is non-contiguous. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L292)
- `static fromWildcard(input: string): Address6` — Construct an `Address6` from a wildcard pattern with trailing `*` groups. The number of trailing wildcards determines the prefix length: each `*` represents 16 bits. `::` is expanded to zero groups (not wildcards) before evaluating trailing wildcards. Only trailing whole-group wildcards are supported. Partial-group wildcards (e.g. `2001:db8::0*`) and interior wildcards (e.g. `*::1`) throw `AddressError`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L315)
- `static fromAddress4(address: string): Address6` — Create an IPv6-mapped address given an IPv4 address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L376)
- `static fromArpa(arpaFormAddress: string): Address6` — Return an address from ip6.arpa form [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L392)
- `static fromAddress4Nat64(address: string, prefix: string): Address6` — Embed an IPv4 address into a NAT64 IPv6 address using the encoding defined by [RFC 6052](https://datatracker.ietf.org/doc/html/rfc6052). The default prefix is the well-known prefix `64:ff9b::/96`. The prefix length must be one of 32, 40, 48, 56, 64, or 96; for prefixes shorter than /64 the IPv4 octets are split around the reserved bits 64–71. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1059)
- `static fromByteArray(bytes: any[]): Address6` — Convert a byte array to an Address6 object. To convert from a Node.js `Buffer`, spread it: `Address6.fromByteArray([...buf])`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1162)
- `static fromUnsignedByteArray(bytes: any[]): Address6` — Convert an unsigned byte array to an Address6 object. To convert from a Node.js `Buffer`, spread it: `Address6.fromUnsignedByteArray([...buf])`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1172)

**Instance methods**

- `microsoftTranscription(): string` — Return the Microsoft UNC transcription of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L418)
- `mask(mask?: number): string` — Return the first n bits of the address, defaulting to the subnet mask [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L427)
- `possibleSubnets(subnetSize?: number): string` — Return the number of possible subnets of a given size in the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L437)
- `startAddress(): Address6` — The first address in the range given by this address' subnet Often referred to as the Network Address. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L462)
- `startAddressExclusive(): Address6` — The first host address in the range given by this address's subnet ie the first address after the Network Address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L471)
- `endAddress(): Address6` — The last address in the range given by this address' subnet Often referred to as the Broadcast [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L489)
- `endAddressExclusive(): Address6` — The last host address in the range given by this address's subnet ie the last address prior to the Broadcast Address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L498)
- `subnetMaskAddress(): Address6` — The hex form of the subnet mask, e.g. `ffff:ffff:ffff:ffff::` for a `/64`. Returns an `Address6`; call `.correctForm()` for the string. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L508)
- `wildcardMask(): Address6` — The Cisco-style wildcard mask, e.g. `::ffff:ffff:ffff:ffff` for a `/64`. This is the bitwise inverse of `subnetMaskAddress()`. Returns an `Address6`; call `.correctForm()` for the string. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L520)
- `networkForm(): string` — The network address in CIDR string form, e.g. `2001:db8::/32` for `2001:db8::1/32`. For an address with no explicit subnet the prefix is `/128`, e.g. `networkForm()` on `2001:db8::1` returns `2001:db8::1/128`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L533)
- `getScope(): string` — Return the scope of the address. The 4-bit scope field ([RFC 4291 §2.7](https://datatracker.ietf.org/doc/html/rfc4291#section-2.7)) is only defined for multicast addresses; for unicast addresses the scope is derived from the address type per [RFC 4007 §6](https://datatracker.ietf.org/doc/html/rfc4007#section-6). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L545)
- `getType(): string` — Return the type of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L572)
- `getBits(start: number, end: number): bigint` — Return the bits in the given range as a BigInt [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L587)
- `getBitsBase2(start: number, end: number): string` — Return the bits in the given range as a base-2 string [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L595)
- `getBitsBase16(start: number, end: number): string` — Return the bits in the given range as a base-16 string [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L603)
- `getBitsPastSubnet(): string` — Return the bits that are set past the subnet mask length [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L619)
- `reverseForm(options?: ReverseFormOptions): string` — Return the reversed ip6.arpa form of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L629)
- `correctForm(): string` — Returns the address in correct form, per [RFC 5952](https://datatracker.ietf.org/doc/html/rfc5952): leading zeros stripped, the longest run of zero groups collapsed to `::`, and hex digits lowercased (e.g. `2001:db8::1`). This is the recommended form for display. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L664)
- `binaryZeroPad(): string` — Return a zero-padded base-2 string representation of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L726)
- `parse4in6(address: string): string` — Parses a v4-in-v6 string (e.g. `::ffff:192.168.0.1`) by extracting the trailing IPv4 address into `this.address4` / `this.parsedAddress4` and returning the address with the v4 portion converted to two v6 groups. Used internally by `parse()`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L740)
- `parse(address: string): string[]` — Parses an IPv6 address string into its 8 hexadecimal groups (expanding any `::` elision and any trailing v4-in-v6 portion) and stores the result on `this.parsedAddress`. Called automatically by the constructor; you typically don't need to call it directly. Throws `AddressError` if the input is malformed. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L794)
- `canonicalForm(): string` — Returns the canonical (fully expanded) form of the address: all 8 groups, each padded to 4 hex digits, with no `::` collapsing (e.g. `2001:0db8:0000:0000:0000:0000:0000:0001`). Useful for sorting and byte-exact comparison. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L874)
- `decimal(): string` — Return the decimal form of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L882)
- `bigInt(): bigint` — Return the address as a BigInt [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L890)
- `to4(): Address4` — Return the last two groups of this address as an IPv4 address string. If this address carries a CIDR prefix that covers the trailing 32 bits (i.e. `subnetMask >= 96`), the resulting `Address4` inherits the corresponding v4 prefix (`subnetMask - 96`); otherwise it defaults to `/32`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L905)
- `to4in6(): string` — Return the v4-in-v6 form of the address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L927)
- `inspectTeredo(): TeredoProperties` — Decodes the Teredo tunneling fields embedded in this address. Returns the Teredo prefix, server IPv4, client IPv4, raw flag bits, cone-NAT flag, UDP port, and Microsoft-format flag breakdown (reserved, universal/local, group/individual, nonce). Only meaningful for addresses in `2001::/32`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L948)
- `inspect6to4(): SixToFourProperties` — Decodes the 6to4 tunneling fields embedded in this address. Returns the 6to4 prefix and the embedded IPv4 gateway address. Only meaningful for addresses in `2002::/16`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1013)
- `to6to4(): Address6 | null` — Return a v6 6to4 address from a v6 v4inv6 address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1033)
- `toAddress4Nat64(prefix: string): Address4 | null` — Extract the embedded IPv4 address from a NAT64 IPv6 address using the encoding defined by [RFC 6052](https://datatracker.ietf.org/doc/html/rfc6052). The default prefix is the well-known prefix `64:ff9b::/96`. Returns `null` if this address is not contained within the given prefix. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1100)
- `toByteArray(): number[]` — Return a byte array. To get a Node.js `Buffer`, wrap the result: `Buffer.from(address.toByteArray())`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1135)
- `toUnsignedByteArray(): number[]` — Return an unsigned byte array. To get a Node.js `Buffer`, wrap the result: `Buffer.from(address.toUnsignedByteArray())`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1152)
- `isCanonical(): boolean` — Returns true if the address is in the canonical form, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1211)
- `isLinkLocal(): boolean` — Returns true if the address is a link local address, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1219)
- `isMulticast(): boolean` — Returns true if the address is a multicast address, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1240)
- `is4(): boolean` — Returns true if the address was written in v4-in-v6 dotted-quad notation (e.g. `::ffff:127.0.0.1`), false otherwise. This is a notation-level flag and does not reflect whether the address bits lie in the IPv4-mapped (`::ffff:0:0/96`) subnet — for that, see isMapped4. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1257)
- `isMapped4(): boolean` — Returns true if the address is an IPv4-mapped IPv6 address in `::ffff:0:0/96` ([RFC 4291 §2.5.5.2](https://datatracker.ietf.org/doc/html/rfc4291#section-2.5.5.2)), false otherwise. Unlike is4, this checks the underlying address bits rather than the textual notation, so `::ffff:127.0.0.1` and `::ffff:7f00:1` both return true. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1269)
- `embeddedIPv4(): Address4 | null` — If this address embeds a routable IPv4 address — i.e. it is IPv4-mapped (`::ffff:0:0/96`) or sits in the NAT64 well-known prefix (`64:ff9b::/96`, [RFC 6052](https://datatracker.ietf.org/doc/html/rfc6052)) — return that embedded address as an Address4; otherwise return null. The special-property checks (`isLoopback`, `isLinkLocal`, `isMulticast`, `isUnspecified`, `isPrivate`, `isCGNAT`, `isBroadcast`) call this first and delegate to the embedded Address4 when present, so a literal such as `::ffff:127.0.0.1` is classified by what it actually reaches (loopback) rather than by its IPv6 wrapper (which `getType()` reports as IPv4-mapped). This matters wherever the checks back a trust-boundary decision (e.g. an SSRF allow/deny filter): without normalization, `::ffff:10.0.0.1`, `::ffff:169.254.169.254`, `64:ff9b::7f00:1`, etc. would all read as non-internal. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1290)
- `isTeredo(): boolean` — Returns true if the address is a Teredo address, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1302)
- `is6to4(): boolean` — Returns true if the address is a 6to4 address, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1310)
- `isLoopback(): boolean` — Returns true if the address is a loopback address, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1318)
- `isULA(): boolean` — Returns true if the address is a Unique Local Address in `fc00::/7` ([RFC 4193](https://datatracker.ietf.org/doc/html/rfc4193)). ULAs are the IPv6 equivalent of IPv4 [RFC 1918](https://datatracker.ietf.org/doc/html/rfc1918) private addresses. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1331)
- `isPrivate(): boolean` — Returns true if the address is private, i.e. a Unique Local Address in `fc00::/7` ([RFC 4193](https://datatracker.ietf.org/doc/html/rfc4193)) or an IPv4-mapped / NAT64 address whose embedded IPv4 address is in one of the [RFC 1918](https://datatracker.ietf.org/doc/html/rfc1918) private ranges (e.g. `::ffff:10.0.0.1`). This is the IPv6 counterpart to Address4.isPrivate; use it instead of isULA when you need to catch mapped RFC 1918 addresses as well as native ULAs. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1345)
- `isCGNAT(): boolean` — Returns true if the address is an IPv4-mapped / NAT64 address whose embedded IPv4 address is in the carrier-grade NAT range `100.64.0.0/10` ([RFC 6598](https://datatracker.ietf.org/doc/html/rfc6598)), false otherwise. There is no native IPv6 CGNAT range, so this only ever returns true for an embedded IPv4 address (e.g. `::ffff:100.64.0.1`). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1362)
- `isBroadcast(): boolean` — Returns true if the address is an IPv4-mapped / NAT64 address whose embedded IPv4 address is the limited broadcast address `255.255.255.255` ([RFC 919](https://datatracker.ietf.org/doc/html/rfc919)), false otherwise. There is no IPv6 broadcast, so this only ever returns true for an embedded IPv4 address (e.g. `::ffff:255.255.255.255`). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1379)
- `isUnspecified(): boolean` — Returns true if the address is the unspecified address `::`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1392)
- `isDocumentation(): boolean` — Returns true if the address is in the documentation prefix `2001:db8::/32` ([RFC 3849](https://datatracker.ietf.org/doc/html/rfc3849)). [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1405)
- `href(optionalPort?: string | number): string` — Returns the address as an HTTP URL with the host bracketed, e.g. `http://[2001:db8::1]/`. If `optionalPort` is provided it is appended, e.g. `http://[2001:db8::1]:8080/`. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1416)
- `link(options?: { className?: string; prefix?: string; v4?: boolean }): string` — Returns an HTML `<a>` element whose `href` encodes the address in a URL hash fragment (default prefix `/#address=`). Useful for linking between pages of an address-inspector UI. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1434)
- `group(): string` — Groups an address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1474)
- `regularExpressionString(this: Address6, substringSearch: boolean): string` — Generate a regular expression string that can be used to find or validate all variations of this address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1526)
- `regularExpression(this: Address6, substringSearch: boolean): RegExp` — Generate a regular expression that can be used to find or validate all variations of this address. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1580)

**Properties**

- `address4: Address4` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L98)
- `address: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L99)
- `addressMinusSuffix: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L100)
- `elidedGroups: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L101)
- `elisionBegin: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L102)
- `elisionEnd: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L103)
- `groups: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L104)
- `parsedAddress4: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L105)
- `parsedAddress: string[]` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L106)
- `parsedSubnet: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L107)
- `subnet: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L108)
- `subnetMask: number` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L109)
- `v4: boolean` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L110)
- `zone: string` — [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L111)
- `isInSubnet: (this: Address4 | Address6, address: Address4 | Address6) => boolean` — Returns true if the given address is in the subnet of the current address [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1191)
- `isHostInSubnet: (this: Address4 | Address6, address: Address4 | Address6) => boolean` — Returns true if this address's host bits fall inside the given subnet, ignoring this address's own subnet mask. See common.isHostInSubnet. [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1199)
- `isCorrect: (this: Address4 | Address6) => boolean` — Returns true if the address is correct, false otherwise [src](https://github.com/beaugunderson/ip-address/blob/master/src/ipv6.ts#L1205)

<!-- API:END -->

### Used by

`ip-address` is downloaded ~66 million times per week, mostly via the Node proxy/agent ecosystem. The dependency chain runs through a handful of widely-used packages:

- [**socks**](https://github.com/JoshGlazebrook/socks) (~53M weekly) — SOCKS4/5 client for Node; depends on `ip-address` directly. The single biggest source of downloads.
- [**socks-proxy-agent**](https://github.com/TooTallNate/proxy-agents/tree/main/packages/socks-proxy-agent) (~57M weekly) — `http.Agent` for SOCKS proxies; depends on `socks`. Bundled by virtually every CLI that respects `HTTPS_PROXY`.
- [**npm**](https://github.com/npm/cli) and [**pnpm**](https://github.com/pnpm/pnpm) — both bundle `socks-proxy-agent` through their HTTP fetch stack (`make-fetch-happen` → `@npmcli/agent`), so every Node install on the planet pulls in `ip-address` as a transitive dependency.
- [**Puppeteer**](https://github.com/puppeteer/puppeteer) — `@puppeteer/browsers` uses `proxy-agent` for browser-binary downloads, which routes through `socks-proxy-agent` → `socks` → `ip-address`.
- [**proxy-agent**](https://github.com/TooTallNate/proxy-agents/tree/main/packages/proxy-agent) (~28M weekly) and [**pac-proxy-agent**](https://github.com/TooTallNate/proxy-agents/tree/main/packages/pac-proxy-agent) (~27M weekly) — auto-detecting proxy agents (HTTP/HTTPS/SOCKS/PAC) used widely in scraping, headless-browser, and CI tooling.
- [**cacache**](https://github.com/npm/cacache) (~44M weekly) — npm's content-addressable cache; pulls in the same fetch stack.

Beyond the proxy chain, `ip-address` has been used by Juniper Networks' Contrail, Ably's proxy-protocol implementation, Rackspace's serialization framework, IPFS, and the [SwitchyOmega](https://github.com/FelisCatus/SwitchyOmega) Chrome extension, among many others.
