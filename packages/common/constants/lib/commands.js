import { createEnum } from '@deip/toolbox';

const APP_CMD = createEnum({
  CREATE_DAO: 1,
  UPDATE_DAO: 2,
  CREATE_NFT_COLLECTION_METADATA: 3,
  UPDATE_NFT_COLLECTION_METADATA: 4,
  DELETE_NFT_COLLECTION_METADATA: 5,
  ADD_DAO_MEMBER: 6,
  CREATE_PROPOSAL: 7,
  ACCEPT_PROPOSAL: 8,
  DECLINE_PROPOSAL: 9,
  CREATE_ATTRIBUTE: 10,
  UPDATE_ATTRIBUTE: 11,
  DELETE_ATTRIBUTE: 12,
  REMOVE_DAO_MEMBER: 13,
  CREATE_INVESTMENT_OPPORTUNITY: 14,
  INVEST: 15,
  TRANSFER_FT: 16,
  TRANSFER_NFT: 17,
  CREATE_DOCUMENT_TEMPLATE: 18,
  UPDATE_DOCUMENT_TEMPLATE: 19,
  DELETE_DOCUMENT_TEMPLATE: 20,
  CREATE_FT: 21,
  CREATE_NFT_COLLECTION: 22,
  ISSUE_FT: 23,
  CREATE_NFT_ITEM: 24,
  CREATE_NFT_ITEM_METADATA_DRAFT: 25,
  UPDATE_NFT_ITEM_METADATA_DRAFT: 26,
  DELETE_NFT_ITEM_METADATA_DRAFT: 27,
  CREATE_NFT_ITEM_METADATA: 28,
  CREATE_REVIEW_REQUEST: 31,
  DECLINE_REVIEW_REQUEST: 32,
  CREATE_REVIEW: 33,
  UPVOTE_REVIEW: 34,
  CREATE_PROJECT_NDA: 35,
  CREATE_CONTRACT_AGREEMENT: 36,
  ACCEPT_CONTRACT_AGREEMENT: 37,
  REJECT_CONTRACT_AGREEMENT: 38,
  UPDATE_PORTAL_PROFILE: 39,
  UPDATE_PORTAL_SETTINGS: 40,
  CREATE_LAYOUT: 41,
  UPDATE_LAYOUT: 42,
  DELETE_LAYOUT: 43,
  UPDATE_LAYOUT_SETTINGS: 44,
  UPDATE_ATTRIBUTE_SETTINGS: 45,
  UPDATE_NETWORK_SETTINGS: 46,
  DELETE_USER_PROFILE: 47,
  ALTER_DAO_AUTHORITY: 48,
  CREATE_BOOKMARK: 49,
  DELETE_BOOKMARK: 50,
  MARK_NOTIFICATIONS_AS_READ: 51,
  CREATE_PORTAL: 52,
  UPDATE_NFT_ITEM_METADATA_DRAFT_STATUS: 53,
  UPDATE_NFT_ITEM_METADATA_DRAFT_MODERATION_MSG: 54,
  SEND_REGISTRATION_CODE_BY_EMAIL: 55
});

const APP_PROPOSAL = createEnum({
  PROJECT_FUNDRASE_PROPOSAL: 4,
  TEAM_UPDATE_PROPOSAL: 5,
  ADD_DAO_MEMBER_PROPOSAL: 6,
  REMOVE_DAO_MEMBER_PROPOSAL: 7,
  FT_TRANSFER_PROPOSAL: 8,
  NFT_TRANSFER_PROPOSAL: 9,
  EXPRESS_LICENSE_PROPOSAL: 10,
  TOKENS_SWAP_PROPOSAL: 11,
  PROJECT_NDA_PROPOSAL: 12,
  INVESTMENT_OPPORTUNITY_PROPOSAL: 13,
  CONTRACT_AGREEMENT_PROPOSAL: 14,
  NFT_LAZY_SELL_PROPOSAL: 15,
  NFT_LAZY_BUY_PROPOSAL: 16
});

export {
  APP_CMD,
  APP_PROPOSAL
};
