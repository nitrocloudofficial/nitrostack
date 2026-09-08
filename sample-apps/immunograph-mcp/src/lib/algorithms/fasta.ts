import { createHash } from 'node:crypto';

export const DEFAULT_MAX_FASTA_BYTES = 1_048_576;
export const DEFAULT_MAX_PROTEIN_RESIDUES = 10_000;
export const DEFAULT_STRICT_PROTEIN_ALPHABET = 'ACDEFGHIKLMNPQRSTVWY';

export type FastaValidationErrorCode =
  | 'FASTA_TOO_LARGE'
  | 'FASTA_HEADER_REQUIRED'
  | 'FASTA_MULTIPLE_RECORDS'
  | 'FASTA_SEQUENCE_REQUIRED'
  | 'FASTA_SEQUENCE_TOO_LONG'
  | 'FASTA_INTERNAL_STOP'
  | 'FASTA_INVALID_RESIDUE'
  | 'SEQUENCE_APPEARS_NUCLEOTIDE';

export interface FastaValidationError {
  code: FastaValidationErrorCode;
  message: string;
}

export interface ValidatedFasta {
  header: string;
  normalizedSequence: string;
  sequenceLength: number;
  sha256: string;
}

export type FastaValidationResult =
  { ok: true; value: ValidatedFasta } | { ok: false; errors: readonly FastaValidationError[] };

export interface FastaValidationOptions {
  alphabet?: string | readonly string[];
  maxBytes?: number;
  maxResidues?: number;
}

function failure(code: FastaValidationErrorCode, message: string): FastaValidationResult {
  return { ok: false, errors: [{ code, message }] };
}

export function validateFasta(
  input: string,
  options: FastaValidationOptions = {},
): FastaValidationResult {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_FASTA_BYTES;
  const maxResidues = options.maxResidues ?? DEFAULT_MAX_PROTEIN_RESIDUES;
  if (!Number.isInteger(maxBytes) || maxBytes <= 0)
    throw new RangeError('maxBytes must be positive');
  if (!Number.isInteger(maxResidues) || maxResidues <= 0) {
    throw new RangeError('maxResidues must be positive');
  }
  if (Buffer.byteLength(input, 'utf8') > maxBytes) {
    return failure('FASTA_TOO_LARGE', `FASTA exceeds ${maxBytes} UTF-8 bytes`);
  }

  const normalizedText = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = normalizedText.split('\n');
  const headerIndexes = lines
    .map((line, index) => (line.startsWith('>') ? index : -1))
    .filter((index) => index >= 0);
  if (headerIndexes.length === 0 || lines.findIndex((line) => line.trim().length > 0) !== 0) {
    return failure('FASTA_HEADER_REQUIRED', 'Exactly one leading FASTA header is required');
  }
  if (headerIndexes.length !== 1) {
    return failure('FASTA_MULTIPLE_RECORDS', 'Exactly one FASTA record is supported');
  }

  const header = lines[0]?.slice(1) ?? '';
  let sequence = lines
    .slice(1)
    .join('')
    .replace(/[\t\n\v\f\r ]/g, '')
    .toUpperCase();
  if (sequence.endsWith('*')) sequence = sequence.slice(0, -1);
  if (sequence.includes('*')) {
    return failure('FASTA_INTERNAL_STOP', 'Internal stop codons are not valid protein residues');
  }
  if (sequence.length === 0) {
    return failure('FASTA_SEQUENCE_REQUIRED', 'A non-empty protein sequence is required');
  }
  if (sequence.length > maxResidues) {
    return failure('FASTA_SEQUENCE_TOO_LONG', `Protein exceeds ${maxResidues} residues`);
  }
  if (sequence.length >= 30 && /^[ACGTUN]+$/.test(sequence)) {
    return failure('SEQUENCE_APPEARS_NUCLEOTIDE', 'Sequence appears to be nucleotide data');
  }

  const alphabet = new Set(
    typeof options.alphabet === 'string'
      ? [...options.alphabet.toUpperCase()]
      : (options.alphabet ?? [...DEFAULT_STRICT_PROTEIN_ALPHABET]).map((item) =>
          item.toUpperCase(),
        ),
  );
  const invalidResidues = [...new Set([...sequence].filter((residue) => !alphabet.has(residue)))];
  if (invalidResidues.length > 0) {
    return failure(
      'FASTA_INVALID_RESIDUE',
      `Sequence contains invalid residues: ${invalidResidues.sort().join(', ')}`,
    );
  }

  return {
    ok: true,
    value: {
      header,
      normalizedSequence: sequence,
      sequenceLength: sequence.length,
      sha256: createHash('sha256').update(sequence).digest('hex'),
    },
  };
}
