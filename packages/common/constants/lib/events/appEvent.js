import { createEnum } from '@deip/toolbox';

const APP_EVENT = createEnum({
  PROJECT_CREATED: 1,
  PROJECT_UPDATED: 2,
  PROJECT_DELETED: 3,
  PROJECT_PROPOSAL_CREATED: 4,
  PROJECT_PROPOSAL_ACCEPTED: 5,
  PROJECT_PROPOSAL_DECLINED: 6,
  PROJECT_UPDATE_PROPOSAL_CREATED: 7,
  PROJECT_UPDATE_PROPOSAL_ACCEPTED: 8,
  PROJECT_UPDATE_PROPOSAL_DECLINED: 9,

  PROPOSAL_CREATED: 20,
  PROPOSAL_ACCEPTED: 21,
  PROPOSAL_DECLINED: 22,

  DAO_CREATED: 30,
  DAO_UPDATED: 31,
  DAO_MEMBER_REMOVED: 32,
  DAO_MEMBER_ADDED: 33,

  TEAM_INVITE_CREATED: 40,
  TEAM_INVITE_ACCEPTED: 41,
  TEAM_INVITE_DECLINED: 42,
  LEAVE_TEAM_CREATED: 43,
  LEAVE_TEAM_ACCEPTED: 44,
  LEAVE_TEAM_DECLINED: 45,

  TEAM_UPDATE_PROPOSAL_ACCEPTED: 50,
  TEAM_UPDATE_PROPOSAL_CREATED: 51,
  TEAM_UPDATE_PROPOSAL_DECLINED: 52,

  ATTRIBUTE_CREATED: 60,
  ATTRIBUTE_UPDATED: 61,
  ATTRIBUTE_DELETED: 62,
  ATTRIBUTE_SETTINGS_UPDATED: 63,

  PROJECT_TOKEN_SALE_PROPOSAL_CREATED: 70,
  PROJECT_TOKEN_SALE_PROPOSAL_ACCEPTED: 71,
  PROJECT_TOKEN_SALE_PROPOSAL_DECLINED: 72,

  INVESTMENT_OPPORTUNITY_CREATED: 80,
  INVESTMENT_OPPORTUNITY_PARTICIPATED: 81,

  FT_TRANSFERED: 90,
  NFT_TRANSFERED: 91,
  FT_CREATED: 92,
  NFT_CREATED: 93,
  FT_ISSUED: 94,
  NFT_ISSUED: 95,
  FT_TRANSFER_PROPOSAL_CREATED: 96,
  FT_TRANSFER_PROPOSAL_ACCEPTED: 97,
  FT_TRANSFER_PROPOSAL_DECLINED: 98,
  NFT_TRANSFER_PROPOSAL_CREATED: 99,
  NFT_TRANSFER_PROPOSAL_ACCEPTED: 100,
  NFT_TRANSFER_PROPOSAL_DECLINED: 101,
  TOKENS_SWAP_PROPOSAL_CREATED: 102,
  TOKENS_SWAP_PROPOSAL_ACCEPTED: 103,
  TOKENS_SWAP_PROPOSAL_DECLINED: 104,

  DOCUMENT_TEMPLATE_CREATED: 110,
  DOCUMENT_TEMPLATE_UPDATED: 111,
  DOCUMENT_TEMPLATE_DELETED: 112,

  PROJECT_CONTENT_DRAFT_CREATED: 118,
  PROJECT_CONTENT_DRAFT_UPDATED: 119,
  PROJECT_CONTENT_DRAFT_STATUS_UPDATED: 120,
  PROJECT_CONTENT_DRAFT_MODERATION_MESSAGE_UPDATED: 121,
  PROJECT_CONTENT_DRAFT_DELETED: 122,
  PROJECT_CONTENT_CREATED: 123,
  PROJECT_CONTENT_PROPOSAL_CREATED: 126,
  PROJECT_CONTENT_PROPOSAL_ACCEPTED: 127,
  PROJECT_CONTENT_PROPOSAL_DECLINED: 128,

  REVIEW_REQUEST_CREATED: 130,
  REVIEW_REQUEST_DECLINED: 131,
  REVIEW_CREATED: 132,
  UPVOTED_REVIEW: 133,

  PROJECT_NDA_CREATED: 140,
  PROJECT_NDA_PROPOSAL_CREATED: 141,
  PROJECT_NDA_PROPOSAL_ACCEPTED: 142,
  PROJECT_NDA_PROPOSAL_DECLINED: 143,

  CONTRACT_AGREEMENT_CREATED: 150,
  CONTRACT_AGREEMENT_PROPOSAL_CREATED: 151,
  CONTRACT_AGREEMENT_PROPOSAL_ACCEPTED: 152,
  CONTRACT_AGREEMENT_PROPOSAL_DECLINED: 153,
  CONTRACT_AGREEMENT_ACCEPTED: 154,
  CONTRACT_AGREEMENT_REJECTED: 155,

  LAYOUT_SETTINGS_UPDATED: 160,
  LAYOUT_CREATED: 161,
  LAYOUT_UPDATED: 162,
  LAYOUT_DELETED: 163,

  PORTAL_PROFILE_UPDATED: 170,
  PORTAL_SETTINGS_UPDATED: 171,
  NETWORK_SETTINGS_UPDATED: 172,

  USER_PROFILE_DELETED: 180,
  USER_AUTHORITY_ALTERED: 181,
  REGISTRATION_CODE_SENDED_BY_EMAIL: 182,

  BOOKMARK_CREATED: 190,
  BOOKMARK_DELETED: 191,
  NOTIFICATIONS_MARKED_AS_READ: 192
});

export {
  APP_EVENT
};
