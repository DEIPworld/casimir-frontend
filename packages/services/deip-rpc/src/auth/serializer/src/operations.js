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

const beneficiaries = new Serializer("beneficiaries", {
    account: string,
    weight: uint16
});

const comment_payout_beneficiaries = new Serializer(0, {
    beneficiaries: set(beneficiaries)
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

let vote = new Serializer("vote", {
    voter: string,
    discipline_id: int64,
    weight: int16,
    research_id: int64,
    research_content_id: int64
});

let transfer = new Serializer("transfer", {
    from: string,
    to: string,
    amount: asset,
    memo: string
});

let transfer_to_vesting = new Serializer("transfer_to_vesting", {
    from: string,
    to: string,
    amount: asset
});

let withdraw_vesting = new Serializer("withdraw_vesting", {
    account: string,
    vesting_shares: asset
});

let limit_order_create = new Serializer("limit_order_create", {
    owner: string,
    orderid: uint32,
    amount_to_sell: asset,
    min_to_receive: asset,
    fill_or_kill: bool,
    expiration: time_point_sec
});

let limit_order_cancel = new Serializer("limit_order_cancel", {
    owner: string,
    orderid: uint32
});

let price = new Serializer("price", {
    base: asset,
    quote: asset
});

let feed_publish = new Serializer("feed_publish", {
    publisher: string,
    exchange_rate: price
});

let convert = new Serializer("convert", {
    owner: string,
    requestid: uint32,
    amount: asset
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

let report_over_production = new Serializer("report_over_production", {
    reporter: string,
    first_block: signed_block_header,
    second_block: signed_block_header
});

let set_withdraw_vesting_route = new Serializer("set_withdraw_vesting_route", {
    from_account: string,
    to_account: string,
    percent: uint16,
    auto_vest: bool
});

let limit_order_create2 = new Serializer("limit_order_create2", {
    owner: string,
    orderid: uint32,
    amount_to_sell: asset,
    exchange_rate: price,
    fill_or_kill: bool,
    expiration: time_point_sec
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

let pow2_input = new Serializer("pow2_input", {
    worker_account: string,
    prev_block: bytes(20),
    nonce: uint64
});

let pow2 = new Serializer("pow2", {
    input: pow2_input,
    pow_summary: uint32
});

let equihash_proof = new Serializer("equihash_proof", {
    n: uint32,
    k: uint32,
    seed: bytes(32),
    inputs: array(uint32)
});

let equihash_pow = new Serializer("equihash_pow", {
    input: pow2_input,
    proof: equihash_proof,
    prev_block: bytes(20),
    pow_summary: uint32
});

let transfer_to_savings = new Serializer("transfer_to_savings", {
    from: string,
    to: string,
    amount: asset,
    memo: string
});

let transfer_from_savings = new Serializer("transfer_from_savings", {
    from: string,
    request_id: uint32,
    to: string,
    amount: asset,
    memo: string
});

let cancel_transfer_from_savings = new Serializer("cancel_transfer_from_savings", {
    from: string,
    request_id: uint32
});


let reset_account = new Serializer("reset_account", {
    reset_account: string,
    account_to_reset: string,
    new_owner_authority: authority
});

let set_reset_account = new Serializer("set_reset_account", {
    account: string,
    current_reset_account: string,
    reset_account: string
});

let claim_reward_balance = new Serializer("claim_reward_balance", {
    account: string,
    reward_steem: asset,
    reward_sbd: asset,
    reward_vests: asset
});

let delegate_vesting_shares = new Serializer("delegate_vesting_shares", {
    delegator: string,
    delegatee: string,
    vesting_shares: asset
});

let account_create_with_delegation = new Serializer("account_create_with_delegation", {
    fee: asset,
    delegation: asset,
    creator: string,
    new_account_name: string,
    owner: authority,
    active: authority,
    posting: authority,
    memo_key: public_key,
    json_metadata: string,
    extensions: set(future_extensions)
});

// DEIP native operations

var create_grant = new Serializer("create_grant", {
    owner: string,
    balance: asset,
    target_discipline: string,
    start_block: uint32,
    end_block: uint32
});

var create_research_group = new Serializer("create_research_group", {
    creator: string,
    name: string,
    permlink: string,
    description: string,
    quorum_percent: uint32
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
    is_positive: bool
});

var contribute_to_token_sale = new Serializer("contribute_to_token_sale", {
    research_token_sale_id: int64,
    owner: string,
    amount: uint32
});

var approve_research_group_invite = new Serializer("approve_research_group_invite", {
    "research_group_invite_id": int64,
    "owner": string,
    "research_tokens_conversion_percent": uint16
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

var create_research_group_join_request = new Serializer("create_research_group_join_request", {
    "owner": string,
    "research_group_id": int64,
    "motivation_letter": string
});

var reject_research_group_join_request = new Serializer("reject_research_group_join_request", {
    "research_group_join_request_id": int64,
    "owner": string
});

// virtual operations

let fill_convert_request = new Serializer("fill_convert_request", {
    owner: string,
    requestid: uint32,
    amount_in: asset,
    amount_out: asset
});

let liquidity_reward = new Serializer("liquidity_reward", {
    owner: string,
    payout: asset
});

let interest = new Serializer("interest", {
    owner: string,
    interest: asset
});

let fill_vesting_withdraw = new Serializer("fill_vesting_withdraw", {
    from_account: string,
    to_account: string,
    withdrawn: asset,
    deposited: asset
});

let fill_order = new Serializer("fill_order", {
    current_owner: string,
    current_orderid: uint32,
    current_pays: asset,
    open_owner: string,
    open_orderid: uint32,
    open_pays: asset
});

let shutdown_witness = new Serializer("shutdown_witness", {
    owner: string
});

let fill_transfer_from_savings = new Serializer("fill_transfer_from_savings", {
    from: string,
    to: string,
    amount: asset,
    request_id: uint32,
    memo: string
});

let hardfork = new Serializer("hardfork", {
    hardfork_id: uint32
});

let return_vesting_delegation = new Serializer("return_vesting_delegation", {
    account: string,
    vesting_shares: asset
});

operation.st_operations = [
    vote,

    transfer,
    transfer_to_vesting,
    withdraw_vesting,

    account_create,
    account_update,

    witness_update,
    account_witness_vote,
    account_witness_proxy,

    set_withdraw_vesting_route,

    request_account_recovery,
    recover_account,
    change_recovery_account,

    delegate_vesting_shares,
    account_create_with_delegation,

    // DEIP native operations
    create_grant,
    create_research_group,
    create_proposal,
    vote_proposal,
    make_review,
    contribute_to_token_sale,
    approve_research_group_invite,
    reject_research_group_invite,
    vote_for_review,
    create_research_group_join_request,
    reject_research_group_join_request,

    // virtual operations
    fill_vesting_withdraw,
    shutdown_witness,
    hardfork,
    return_vesting_delegation
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