/**
 * Lives apart from `ai.ts` so `storage.ts` can refuse a request in the user's
 * own words without importing the module that imports it back.
 */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
