import { createEnum } from '@casimir/toolbox';

export const INVESTMENT_OPPORTUNITY_STATUS = createEnum({
  ACTIVE: 1,
  FINISHED: 2,
  EXPIRED: 3,
  INACTIVE: 4
});
