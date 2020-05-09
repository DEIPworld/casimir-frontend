import crypto from '@deip/lib-crypto';
import Types from "./auth/serializer/src/types";
import ChainTypes from "./auth/serializer/src/ChainTypes";
import operations from "./auth/serializer/src/operations";


function createEntityOperation([op_name, op_payload], { refBlockNum, refBlockPrefix }) {
  const serializer = operations[op_name];
  if (!serializer.entity_external_id) {
    throw new Error("External id extraction failure: 'entity_external_id' field is not specified for " + op_name);
  }
  const buff = serializer.toEntityExternalIdBuffer(op_payload, { refBlockNum, refBlockPrefix });
  const external_id = crypto.hexify(crypto.ripemd160(buff.buffer));
  op_payload[serializer.entity_external_id] = external_id;
  return [external_id, [op_name, op_payload]];
}

function getOperationTag(op_name) {
  return ChainTypes.operations[op_name];
}

function getOperationsEnum() {
  return ChainTypes.operations;
}


module.exports = {
  createEntityOperation,
  getOperationTag,
  getOperationsEnum
}