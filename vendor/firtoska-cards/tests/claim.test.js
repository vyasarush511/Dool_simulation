import Claim from '../claim.js';

describe('Claim', () => {
    let proposal = { 0: 5, 1: 3 };
    let accepted = [0, 1, 2, 3];
    let rejected = [];
    let participants = [0, 1, 2, 3, 4];

    let claim = new Claim(proposal, accepted, rejected, participants);

    test('creates a new claim object with correct initial values', () => {
        expect(claim.proposal).toBe(proposal);
        expect(claim.acceptedBy).toBe(accepted);
        expect(claim.rejectedBy).toBe(rejected);
        expect(claim.participants).toBe(participants);
    });


    test('sets isClaimGoingOn to true if neither accepted nor rejected by all participants', () => {
        expect(claim.isClaimGoingOn()).toBe(true);
    });

    test('sets isClaimAccepted to true if all participants have not accepted the claim', () => {
        expect(claim.isClaimAccepted()).toBe(false);
    });

    test('sets isClaimAccepted to true if all participants have accepted the claim', () => {
        // push 4 to acceptedBy array
        claim.acceptedBy.push(4)

        expect(claim.isClaimAccepted()).toBe(true);
    });

    test('sets isClaimRejected to true if any participant has rejected the claim', () => {
        rejected.push(4); // Adding a rejected participant

        expect(claim.isClaimRejected()).toBe(true);
    });
});
