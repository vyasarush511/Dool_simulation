export default function Claim(proposal, accepted, rejected, participants) {
    this.proposal = proposal;
    this.acceptedBy = accepted;
    this.rejectedBy = rejected;
    this.participants = participants;

    this.isClaimAccepted = () => {
        return this.participants.every(participant => this.acceptedBy.includes(parseInt(participant)))
    }

    this.isClaimRejected = () => {
        return this.rejectedBy.length > 0
    }

    this.isClaimGoingOn = () => {
        return !this.isClaimAccepted() && !this.isClaimRejected()
    }
}

Object.setPrototypeOf(Claim.prototype, Array.prototype)
