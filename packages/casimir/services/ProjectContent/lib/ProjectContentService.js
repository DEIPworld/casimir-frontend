import {
  createFormData,
  genRipemd160Hash,
  genSha256Hash,
  createInstanceGetter
} from '@deip/toolbox';
import { proxydi } from '@deip/proxydi';
import { JsonDataMsg, MultFormDataMsg } from '@deip/messages';
import { APP_PROPOSAL, APP_EVENT } from '@deip/constants';
import {
  CreateProposalCmd,
  AcceptProposalCmd,
  CreateProjectContentCmd,
  CreateDraftCmd,
  DeleteDraftCmd,
  UpdateDraftCmd
} from '@deip/commands';
import { ChainService } from '@deip/chain-service';
import { WebSocketService } from '@deip/web-socket-service';

import { ProjectContentHttp } from './ProjectContentHttp';
import { projectContentTypes } from './lists';

const proposalDefaultLifetime = new Date(new Date().getTime() + 86400000 * 365 * 3).getTime();

/**
  * @typedef {{isProposal: boolean,
  *  isProposalApproved: boolean,
  *  proposalLifetime: number}} ProposalInfo
  */

/**
  * @typedef {{privKey: string, username: string}} Initiator
  */

/**
 * Project content data transport
 */
export class ProjectContentService {
  proxydi = proxydi;

  projectContentHttp = ProjectContentHttp.getInstance();
  webSocketService = WebSocketService.getInstance();

  /**
   * Parse proposalInfo and set default values
   * @param {ProposalInfo} proposalInfo
   * @returns {ProposalInfo} result
   */
  static #convertProposalInfo(proposalInfo) {
    return {
      isProposal: false,
      isProposalApproved: true,
      proposalLifetime: proposalDefaultLifetime,
      ...proposalInfo
    };
  }

  /**
   * Create project content
   * @param {Object} payload
   * @param {Initiator} payload.initiator
   * @param {Object} payload.data
   * @param {string} payload.data.projectId
   * @param {string} payload.data.teamId
   * @param {string} payload.data.title
   * @param {number} payload.data.contentType
   * @param {string} payload.data.content
   * @param {Array.<string>} payload.data.authors
   * @param {Array.<string>} payload.data.references
   * @param {number} payload.data.formatType
   * @param {Array.<File>} payload.data.files
   * @param {Object} payload.data.jsonData
   * @param {Object} payload.data.metadata
   * @param {ProposalInfo} payload.proposalInfo
   * @returns {Promise<Object>}
   */
  async createContent(payload) {
    const env = this.proxydi.get('env');
    const {
      initiator: {
        privKey,
        username: creator
      },
      data,
      proposalInfo
    } = payload;

    const {
      projectId,
      teamId,
      contentType,
      title,
      content,
      authors,
      metadata,
      references
    } = data;

    const {
      isProposal,
      isProposalApproved,
      proposalLifetime
    } = ProjectContentService.#convertProposalInfo(proposalInfo);

    const response = await ChainService.getInstanceAsync(env)
      .then((chainService) => {
        const chainNodeClient = chainService.getChainNodeClient();
        const chainTxBuilder = chainService.getChainTxBuilder();
        return chainTxBuilder.begin()
          .then((txBuilder) => {
            const createProjectContentCmd = new CreateProjectContentCmd({
              projectId,
              teamId,
              contentType,
              description: genSha256Hash({ projectContent: { title } }),
              content,
              authors,
              metadata,
              references,
              title
            });

            if (isProposal) {
              const proposalBatch = [
                createProjectContentCmd
              ];

              return chainTxBuilder.getBatchWeight(proposalBatch)
                .then((proposalBatchWeight) => {
                  const createProposalCmd = new CreateProposalCmd({
                    creator,
                    type: APP_PROPOSAL.PROJECT_CONTENT_PROPOSAL,
                    expirationTime: proposalLifetime,
                    proposedCmds: proposalBatch
                  });
                  txBuilder.addCmd(createProposalCmd);

                  if (isProposalApproved) {
                    const createProjectContentProposalId = createProposalCmd.getProtocolEntityId();
                    const updateProposalCmd = new AcceptProposalCmd({
                      entityId: createProjectContentProposalId,
                      account: creator,
                      batchWeight: proposalBatchWeight
                    });
                    txBuilder.addCmd(updateProposalCmd);
                  }
                  return txBuilder.end();
                });
            }
            txBuilder.addCmd(createProjectContentCmd);
            return txBuilder.end();
          })
          .then((packedTx) => packedTx.signAsync(privKey, chainNodeClient))
          .then((packedTx) => {
            const msg = new JsonDataMsg(packedTx.getPayload(), { 'project-id': projectId });

            if (env.RETURN_MSG === true) {
              return msg;
            }

            return this.projectContentHttp.publishContent(msg);
          });
      });

    await this.webSocketService.waitForMessage((message) => {
      const [, eventBody] = message;
      return eventBody.event.eventNum === APP_EVENT.PROJECT_CONTENT_CREATED
                  && eventBody.event.eventPayload.entityId === response.data._id;
    }, 20000);

    return response;
  }

  /**
   * Get project content by id
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getContent(id) {
    return this.projectContentHttp.getContent(id);
  }

  /**
   * Get project content draft list by project
   * @param {string} projectId
   * @returns {Promise<Object>}
   */
  async getDraftsByProject(projectId) {
    return this.projectContentHttp.getDraftsByProject(projectId);
  }

  /**
   * Get project content draft by id
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getDraft(id) {
    return this.projectContentHttp.getDraft(id);
  }

  /**
   * Get project content list by portal
   * @param {string} portalId
   * @returns {Promise<Object>}
   */
  async getContentListByPortal(portalId) {
    return this.projectContentHttp.getContentListByPortal(portalId);
  }

  /**
   * Get project content list by project
   * @param {string} projectId
   * @returns {Promise<Object>}
   */
  async getContentListByProject(projectId) {
    return this.projectContentHttp.getContentListByProject(projectId);
  }

  /**
   * @deprecated
   * Get project content onchain entity by id
   * @param {string} refId
   * @returns {Promise<Object>}
   */
  async getContentRef(refId) {
    return this.projectContentHttp.getContentRef(refId);
  }

  /**
   * Create project content draft
   * @param {Object} payload
   * @param {Object} payload.data
   * @param {string} payload.data.projectId
   * @param {string} payload.data.title
   * @param {number} payload.data.contentType
   * @param {Array.<string>} payload.data.authors
   * @param {Array.<string>} payload.data.references
   * @param {number} payload.data.formatType
   * @param {Array.<File>} payload.data.files
   * @param {Object} payload.data.jsonData
   * @param {Object} payload.data.metadata
   * @returns {Promise<Object>}
   */
  async createDraft(payload) {
    const draftId = genRipemd160Hash({
      ...payload, __timestamp: new Date().getTime()
    }).slice(0, 24);
    const draftData = {
      ...payload.data,
      draftId
    };

    const formData = createFormData(draftData);

    const createDraftCmd = new CreateDraftCmd(draftData);
    const msg = new MultFormDataMsg(
      formData,
      { appCmds: [createDraftCmd] },
      { 'project-id': draftData.projectId }
    );

    const env = this.proxydi.get('env');

    if (env.RETURN_MSG === true) {
      return msg;
    }

    const response = await this.projectContentHttp.createDraft(msg);

    await this.webSocketService.waitForMessage((message) => {
      const [, eventBody] = message;
      return eventBody.event.eventNum === APP_EVENT.PROJECT_CONTENT_DRAFT_CREATED
                && eventBody.event.eventPayload.draftId === response.data._id;
    }, 20000);

    return response;
  }

  /**
   * Delete project content draft
   * @param {string} draftId
   * @returns {Promise<Object>}
   */
  async deleteDraft(draftId) {
    const deleteDraftCmd = new DeleteDraftCmd({ draftId });
    const msg = new JsonDataMsg({ appCmds: [deleteDraftCmd] }, { 'entity-id': draftId });
    const env = this.proxydi.get('env');

    if (env.RETURN_MSG === true) {
      return msg;
    }

    return this.projectContentHttp.deleteDraft(msg);
  }

  /**
   * Update project content draft
   * @param {Object} payload
   * @param {Object} payload.data
   * @param {string} payload.data.projectId
   * @param {string} payload.data.title
   * @param {number} payload.data.contentType
   * @param {Array.<string>} payload.data.authors
   * @param {Array.<string>} payload.data.references
   * @param {number} payload.data.formatType
   * @param {Array.<File>} payload.data.files
   * @param {Object} payload.data.jsonData
   * @param {Object} payload.data.metadata
   * @returns {Promise<Object>}
   */
  async updateDraft(payload) {
    const { data } = payload;
    const formData = createFormData(data);

    const updateDraftCmd = new UpdateDraftCmd(data);
    const msg = new MultFormDataMsg(
      formData,
      { appCmds: [updateDraftCmd] },
      { 'project-id': data.projectId, 'entity-id': data._id }
    );

    const env = this.proxydi.get('env');

    if (env.RETURN_MSG === true) {
      return msg;
    }

    const response = await this.projectContentHttp.updateDraft(msg);

    await this.webSocketService.waitForMessage((message) => {
      const [, eventBody] = message;
      return eventBody.event.eventNum === APP_EVENT.PROJECT_CONTENT_DRAFT_UPDATED
                && eventBody.event.eventPayload.draftId === response.data._id;
    }, 20000);

    return response;
  }

  /**
   * Unlock project content draft
   * @param {Object} payload
   * @param {Object} payload.data
   * @param {string} payload.data.projectId
   * @param {string} payload.data.title
   * @param {number} payload.data.contentType
   * @param {Array.<string>} payload.data.authors
   * @param {Array.<string>} payload.data.references
   * @param {number} payload.data.formatType
   * @param {Array.<File>} payload.data.files
   * @param {Object} payload.data.jsonData
   * @param {Object} payload.data.metadata
   * @returns {Promise<Object>}
   */
  async unlockDraft(payload) {
    const { data } = payload;
    const updateDraftCmd = new UpdateDraftCmd({ ...data });
    const msg = new JsonDataMsg({ appCmds: [updateDraftCmd] }, { 'entity-id': data._id });
    const env = this.proxydi.get('env');

    if (env.RETURN_MSG === true) {
      return msg;
    }

    return this.projectContentHttp.unlockDraft(msg);
  }

  /**
   * Get public project content list
   * @returns {Promise<Object>}
   */
  async getPublicContentList() {
    return this.projectContentHttp.getPublicContentList();
  }

  /**
   * Get project content references graph
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async getContentReferencesGraph(id) {
    return this.projectContentHttp.getContentReferencesGraph(id);
  }

  /** @deprecated */
  getContentType(type) {
    return projectContentTypes.find((t) => t.type === type || t.id === type);
  }

  /**
   * @param {Object} query
   * @param {Object} query.sort 'asc', 'desc'
   * @param {Number} query.page 0 or above
   * @param {Number} query.pageSize from 1 to 100
   * @param {Object} query.filter
   */
  getContentListPaginated(query) {
    return this.projectContentHttp.getContentListPaginated(query);
  }

  /** @type {() => ProjectContentService} */
  static getInstance = createInstanceGetter(ProjectContentService);
}
