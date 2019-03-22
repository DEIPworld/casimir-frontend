// This file is merge updated from steemd's js_operation_serializer program.
/*

./js_operation_serializer |
sed 's/void/future_extensions/g'|
sed 's/steemit_protocol:://g'|
sed 's/14static_variantIJNS_12fixed_stringINSt3__14pairIyyEEEEEEE/string/g'|
sed 's/steemit_future_extensions/future_extensions/g'|
sed 's/steemit_protocol_//g' > tmp.coffee

*/
// coffee tmp.coffee # fix errors until you see: `ChainTypes is not defined`

/*

   remove these 7 lines from tmp.coffee:

static_variant [
    pow2
    equihash_pow
] = static_variant [
    pow2
    equihash_pow
]

*/

// npm i -g decaffeinate
// decaffeinate tmp.coffee

// Merge tmp.js - See "Generated code follows" below

import types from "./types"
import SerializerImpl from "./serializer"

const {
    //id_type,
    //varint32, uint8, fixed_array, object_id_type, vote_id, address,
    int16,
    int64,
    uint16,
    uint32,
    uint64,
    string,
    string_binary,
    bytes,
    bool,
    array,
    // protocol_id_type,
    static_variant,
    map,
    set,
    public_key,
    time_point_sec,
    optional,
    asset,
} = types

const future_extensions = types.void
const hardfork_version_vote = types.void
const version = types.void

// Place-holder, their are dependencies on "operation" .. The final list of
// operations is not avialble until the very end of the generated code.
// See: operation.st_operations = ...
const operation = static_variant();
module.exports.operation = operation;

// For module.exports
const Serializer = function(operation_name, serilization_types_object) {
    const s = new SerializerImpl(operation_name, serilization_types_object);
    return module.exports[operation_name] = s;
}

const invitee = new Serializer("invitee", {
    account: string,
    research_group_tokens_in_percent: uint32,
    cover_letter: string
});

const expertise_amount_pair_type = new Serializer("expertise_amount_pair_type", {
    discipline_id: int64,
    amount: int64
});

const milestone_type = new Serializer("milestone_type", {
    description: int64,
    deadline: time_point_sec,
    amount: int64
});

// Custom-types after Generated code

// ##  Generated code follows
// -------------------------------
/*
When updating generated code (fix closing notation)
Replace:  var operation = static_variant([
with:     operation.st_operations = [

Delete (these are custom types instead):
let public_key = new Serializer( 
    "public_key",
    {key_data: bytes(33)}
);

let asset = new Serializer( 
    "asset",
    {amount: int64,
    symbol: uint64}
);

Replace: authority.prototype.account_authority_map
With: map((string), (uint16))
*/
let signed_transaction = new Serializer("signed_transaction", {
    ref_block_num: uint16,
    ref_block_prefix: uint32,
    expiration: time_point_sec,
    operations: array(operation),
    extensions: set(future_extensions),
    signatures: array(bytes(65))
});

let signed_block = new Serializer("signed_block", {
    previous: bytes(20),
    timestamp: time_point_sec,
    witness: string,
    transaction_merkle_root: bytes(20),
    extensions: set(static_variant([
        future_extensions,
        version,
        hardfork_version_vote
    ])),
    witness_signature: bytes(65),
    transactions: array(signed_transaction)
});

let block_header = new Serializer("block_header", {
    previous: bytes(20),
    timestamp: time_point_sec,
    witness: string,
    transaction_merkle_root: bytes(20),
    extensions: set(static_variant([
        future_extensions,
        version,
        hardfork_version_vote
    ]))
});

let signed_block_header = new Serializer("signed_block_header", {
    previous: bytes(20),
    timestamp: time_point_sec,
    witness: string,
    transaction_merkle_root: bytes(20),
    extensions: set(static_variant([
        future_extensions,
        version,
        hardfork_version_vote
    ])),
    witness_signature: bytes(65)
});

let transfer = new Serializer("transfer", {
    from: string,
    to: string,
    amount: asset,
    memo: string
});

var authority = new Serializer("authority", {
    weight_threshold: uint32,
    account_auths: map((string), (uint16)),
    key_auths: map((public_key), (uint16))
});

let account_create = new Serializer("account_create", {
    fee: asset,
    creator: string,
    new_account_name: string,
    owner: authority,
    active: authority,
    posting: authority,
    memo_key: public_key,
    json_metadata: string
});

let account_update = new Serializer("account_update", {
    account: string,
    owner: optional(authority),
    active: optional(authority),
    posting: optional(authority),
    memo_key: public_key,
    json_metadata: string
});

let chain_properties = new Serializer("chain_properties", {
    account_creation_fee: asset,
    maximum_block_size: uint32,
    sbd_interest_rate: uint16
});

let witness_update = new Serializer("witness_update", {
    owner: string,
    url: string,
    block_signing_key: public_key,
    props: chain_properties,
    fee: asset
});

let account_witness_vote = new Serializer("account_witness_vote", {
    account: string,
    witness: string,
    approve: bool
});

let account_witness_proxy = new Serializer("account_witness_proxy", {
    account: string,
    proxy: string
});

let pow = new Serializer("pow", {
    worker: public_key,
    input: bytes(32),
    signature: bytes(65),
    work: bytes(32)
});

let set_withdraw_common_tokens_route = new Serializer("set_withdraw_common_tokens_route", {
    from_account: string,
    to_account: string,
    percent: uint16,
    auto_common_token: bool
});

let challenge_authority = new Serializer("challenge_authority", {
    challenger: string,
    challenged: string,
    require_owner: bool
});

let request_account_recovery = new Serializer("request_account_recovery", {
    recovery_account: string,
    account_to_recover: string,
    new_owner_authority: authority,
    extensions: set(future_extensions)
});

let recover_account = new Serializer("recover_account", {
    account_to_recover: string,
    new_owner_authority: authority,
    recent_owner_authority: authority,
    extensions: set(future_extensions)
});

let change_recovery_account = new Serializer("change_recovery_account", {
    account_to_recover: string,
    new_recovery_account: string,
    extensions: set(future_extensions)
});

// DEIP native operations

var create_grant = new Serializer("create_grant", {
    owner: string,
    balance: asset,
    target_discipline: string,
    start_block: uint32,
    end_block: uint32,
    is_extendable: bool,
    content_hash: string
});

var create_research_group = new Serializer("create_research_group", {
    creator: string,
    name: string,
    permlink: string,
    description: string,
    quorum_percent: uint32,
    proposal_quorums: map((uint16), (uint32)),
    is_personal: bool,
    invitees: set(invitee)
});

var create_expertise_allocation_proposal = new Serializer("create_expertise_allocation_proposal", {
    claimer: string,
    discipline_id: int64,
    description: string
});

var vote_for_expertise_allocation_proposal = new Serializer("vote_for_expertise_allocation_proposal", {
    proposal_id: int64,
    voter: string,
    voting_power: int64
});

var accept_research_token_offer = new Serializer("accept_research_token_offer", {
    offer_research_tokens_id: int64,
    buyer: string
});

var reject_research_token_offer = new Serializer("reject_research_token_offer", {
    offer_research_tokens_id: int64,
    buyer: string
});

var create_proposal = new Serializer("create_proposal", {
    creator: string,
    research_group_id: int64,
    data: string,
    action: uint16,
    expiration_time: time_point_sec
});

var vote_proposal = new Serializer("vote_proposal", {
    voter: string,
    proposal_id: int64,
    research_group_id: int64
});

var make_review = new Serializer("make_review", {
    author: string,
    research_content_id: int64,
    content: string,
    is_positive: bool,
    weight: uint16
});

var contribute_to_token_sale = new Serializer("contribute_to_token_sale", {
    research_token_sale_id: int64,
    owner: string,
    amount: asset
});

var approve_research_group_invite = new Serializer("approve_research_group_invite", {
    "research_group_invite_id": int64,
    "owner": string
});

var reject_research_group_invite = new Serializer("reject_research_group_invite", {
    "research_group_invite_id": int64,
    "owner": string
});

var vote_for_review = new Serializer("vote_for_review", {
    "voter": string,
    "review_id": int64,
    "discipline_id": int64,
    "weight": int16
});

var transfer_research_tokens_to_research_group = new Serializer("transfer_research_tokens_to_research_group", {
    research_token_id: int64,
    research_id: int64,
    owner: string,
    amount : uint32 
})

var set_expertise_tokens = new Serializer("set_expertise_tokens", {
    owner: string,
    account_name: string,
    disciplines_to_add: set(expertise_amount_pair_type)
})

var research_update = new Serializer("research_update", {
     "research_id" : int64,
     "title": string,
     "abstract": string,
     "permlink": string,
     "owner": string
})

var create_vesting_balance = new Serializer("create_vesting_balance", {
    "creator": string,
    "owner": string,
    "balance": asset,
    "vesting_duration_seconds": uint32,
    "vesting_cliff_seconds": uint32,
    "period_duration_seconds": uint32
});

var delegate_expertise = new Serializer("delegate_expertise", {
    "sender" : string,
    "receiver": string,
    "discipline_id": int64
})

var revoke_expertise_delegation = new Serializer("revoke_expertise_delegation", {
    "sender" : string,
    "receiver": string,
    "discipline_id": int64
})

var withdraw_vesting_balance = new Serializer("withdraw_vesting_balance", {
    "vesting_balance_id": int64,
    "owner": string,
    "amount": asset
})

var transfer_research_tokens = new Serializer("transfer_research_tokens", {
    research_id: int64,
    sender: string,
    receiver: string,
    amount: uint32
})

var transfer_to_common_tokens = new Serializer("transfer_to_common_tokens", {
    "from": string,
    "to": string,
    "amount": asset
});

var withdraw_common_tokens = new Serializer("withdraw_common_tokens", {
    "account": string,
    "total_common_tokens_amount": int64
});

var withdraw_common_tokens = new Serializer("withdraw_common_tokens", {
    "account": string,
    "total_common_tokens_amount": int64
});

var create_funding_opportunity = new Serializer("create_funding_opportunity", {
    "funding_opportunity_number": string,
    "funding_opportunity_title": string,

    "eligible_applicants": string,
    "additional_info_of_eligibility": string,

    "agency_name": string,
    "description": string,
    "link_to_additional_info": string,
    "grantor_contact_info": string,

    "target_discipline": int64,

    "amount": asset,
    "award_ceiling": asset,
    "award_floor": asset,

    "owner": string,
    "officers": set(string),

    "min_number_of_positive_reviews": int16,
    "min_number_of_applications": int16,

    "expected_number_of_awards": int16,

    "open_date": time_point_sec,
    "close_date": time_point_sec,
    
    "review_committee_id": int64
});

var create_grant_application = new Serializer("create_grant_application", {
    "grant_id": int64,
    "research_id": int64,
    "title": string,
    "creator": string,
    "total_amount": asset,
    "application_hash": string,
    "organisation": string
});

var make_review_for_application = new Serializer("make_review_for_application", {
    "author": string,
    "grant_application_id": int64,
    "is_positive": bool,
    "content": string
});

var approve_grant_application = new Serializer("approve_grant_application", {
    "grant_application_id": int64,
    "approver": string 
});

var reject_grant_application = new Serializer("reject_grant_application", {
    "grant_application_id": int64,
    "rejecter": string 
});

var create_funding = new Serializer("create_funding", {
    "funding_opportunity_id": int64,
    "creator": string,
    "researcher": string,
    "research_expenses": map((int64), map((uint16), (int64))),
    "university_overheads": map((int64), (int64)),
    "total_amount": asset,
    "milestones": map((int64), set(milestone_type))
});

var approve_funding = new Serializer("approve_funding", {
    "funding_id" : int64,
    "approver": string
});

var reject_funding = new Serializer("reject_funding", {
    "funding_id" : int64,
    "rejecter": string
});

var create_funding_withdrawal_request = new Serializer("create_funding_withdrawal_request", {
    "funding_research_relation_id": int64,
    "research_group_id": int64,
    "research_id": int64,
    "organisation_id": int64,
    "requester": string,
    "purpose" : uint16,
    "amount": int64,
    "description": string
});

var approve_funding_withdrawal_request = new Serializer("approve_funding_withdrawal_request", {
    "funding_withdrawal_request_id": int64,
    "approver": string
});

var reject_funding_withdrawal_request = new Serializer("reject_funding_withdrawal_request", {
    "funding_withdrawal_request_id": int64,
    "rejecter": string
});

var approve_funding_milestone = new Serializer("approve_funding_milestone", {
    "funding_milestone_id": int64,
    "approver": string
});

var reject_funding_milestone = new Serializer("reject_funding_milestone", {
    "funding_milestone_id": int64,
    "rejecter": string
});

// virtual operations

let fill_common_tokens_withdraw = new Serializer("fill_common_tokens_withdraw", {
    from_account: string,
    to_account: string,
    withdrawn: asset,
    deposited: asset
});

let shutdown_witness = new Serializer("shutdown_witness", {
    owner: string
});

let hardfork = new Serializer("hardfork", {
    hardfork_id: uint32
});

let producer_reward = new Serializer("producer_reward", {
    producer: string,
    common_tokens_amount: uint32
});

operation.st_operations = [
    vote_for_review, // 0

    transfer, // 1
    transfer_to_common_tokens, // 2
    withdraw_common_tokens, // 3

    account_create, // 4
    account_update, // 5

    witness_update, // 6
    account_witness_vote, // 7
    account_witness_proxy, // 8

    set_withdraw_common_tokens_route, // 9

    request_account_recovery, // 10
    recover_account, // 11
    change_recovery_account, // 12

    // DEIP native operations
    create_grant, // 13
    create_research_group, // 14
    create_proposal, // 15
    vote_proposal, // 16
    make_review, // 17
    contribute_to_token_sale, // 18
    approve_research_group_invite,// 19
    reject_research_group_invite, // 20
    transfer_research_tokens_to_research_group, // 21
    set_expertise_tokens, // 22
    research_update, // 23
    create_vesting_balance, // 24
    withdraw_vesting_balance, // 25
    transfer_research_tokens, // 26
    delegate_expertise, // 27
    revoke_expertise_delegation, // 28
    create_expertise_allocation_proposal, // 29
    vote_for_expertise_allocation_proposal, // 30
    accept_research_token_offer, // 31
    reject_research_token_offer, // 32
    create_funding_opportunity, // 33
    create_grant_application, // 34
    make_review_for_application, // 35
    approve_grant_application, // 36
    reject_grant_application, // 37
    create_funding, // 38
    approve_funding, // 39
    reject_funding, // 40
    create_funding_withdrawal_request, // 41
    approve_funding_withdrawal_request, // 42
    reject_funding_withdrawal_request, // 43
    approve_funding_milestone, // 44
    reject_funding_milestone, // 45

    // virtual operations
    fill_common_tokens_withdraw, // 46
    shutdown_witness, // 47
    hardfork, // 48
    producer_reward // 49
];

let transaction = new Serializer(
    "transaction", {
        ref_block_num: uint16,
        ref_block_prefix: uint32,
        expiration: time_point_sec,
        operations: array(operation),
        extensions: set(future_extensions)
    }
);

//# -------------------------------
//#  Generated code end  S T O P
//# -------------------------------

// Custom Types (do not over-write)

const encrypted_memo = new Serializer("encrypted_memo", {
    from: public_key,
    to: public_key,
    nonce: uint64,
    check: uint32,
    encrypted: string_binary
});
/*

// Make sure all tests pass

npm test

*/