import { ResourceDecorator as Resource, type ExecutionContext } from '@nitrostack/core';

export class ComputeResources {
  @Resource({
    uri: 'bouldersgate://protocol',
    name: 'BouldersGate Negotiation Protocol',
    description:
      'Public description of the request, counter-offer, acceptance, execution, and release flow. It intentionally exposes no agent policy.',
    mimeType: 'application/json',
  })
  async protocolResource(_uri: string, _context: ExecutionContext) {
    return {
      type: 'json' as const,
      data: {
        name: 'BouldersGate',
        principle:
          'The agent states task needs; human-authored policy bounds the authority granted.',
        flow: [
          {
            step: 1,
            tool: 'request_compute',
            effect: 'Evaluates policy and creates an expiring offer; creates no compute.',
          },
          {
            step: 2,
            tool: 'accept_offer',
            effect: 'Consumes one offer and materializes exactly its granted capability.',
          },
          {
            step: 3,
            tool: 'execute_command',
            effect: 'Executes a bounded argument vector inside the accepted environment.',
          },
          {
            step: 4,
            tool: 'release_environment',
            effect: 'Destroys the environment early; TTL is the backstop.',
          },
        ],
        attestation: {
          what: 'Every offer states what the granted runtime resolves to on the backend that will serve it.',
          why: 'A tag is mutable. The container backend resolves an immutable image digest from the Docker Hub registry at offer time and materializes that exact digest, so the runtime cannot change between the offer and its acceptance.',
          verify:
            'Compare offer.attestation.digest with the environment attestation returned by accept_offer.',
        },
        policyVisibility:
          'Agents receive decision deltas, never a policy enumeration endpoint.',
      },
    };
  }
}
