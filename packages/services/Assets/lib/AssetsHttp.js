import { HttpService } from '@deip/http-service';
import { Singleton } from '@deip/toolbox';

class AssetsHttp extends Singleton {
  http = HttpService.getInstance();

  transferAssets(req) {
    return this.http.post('/api/v2/assets/transfer', req.getHttpBody());
  }

  createAssetsExchangeProposal(req) {
    return this.http.post('/api/v2/assets/exchange', req.getHttpBody());
  }

  getAssetById(assetId) {
    return this.http.get(`/api/v2/assets/id/${assetId}`);
  }

  getAssetBySymbol(symbol) {
    return this.http.get(`/api/v2/assets/symbol/${symbol}`);
  }

  getAssetsByType(type) {
    return this.http.get(`/api/v2/assets/type/${type}`);
  }

  getAssetsByIssuer(issuer) {
    return this.http.get(`/api/v2/assets/issuer/${issuer}`);
  }

  lookupAssets(lowerBoundSymbol = '', limit) {
    return this.http.get(`/api/v2/assets/limit/${limit}/${lowerBoundSymbol}`);
  }

  getAccountAssetBalance(owner, symbol) {
    return this.http.get(`/api/v2/assets/owner/${owner}/symbol/${symbol}`);
  }

  getAccountAssetsBalancesByOwner(owner) {
    return this.http.get(`/api/v2/assets/owner/${owner}`);
  }

  getAccountsAssetBalancesByAsset(symbol) {
    return this.http.get(`/api/v2/assets/accounts/symbol/${symbol}`);
  }
}

export {
  AssetsHttp
};
