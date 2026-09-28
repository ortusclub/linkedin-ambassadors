type RentalAccessState = {
  status: string;
  isShadow?: boolean;
  handoverAt?: string | Date | null;
  paused?: boolean;
  linkedinAccount: { restrictedAt?: string | Date | null; twoFactorResetNeeded?: boolean };
};

export function isRentalBeingPrepared(rental: RentalAccessState): boolean {
  return !rental.isShadow && !!rental.handoverAt && rental.status === "pending_access";
}

export function canShowRentalShareLink(rental: RentalAccessState): boolean {
  return (rental.status === "active" || (rental.isShadow === true && rental.status === "pending_access"))
    && !rental.handoverAt && !rental.paused
    && !rental.linkedinAccount.restrictedAt && !rental.linkedinAccount.twoFactorResetNeeded;
}
