import { ThreatMatrixService } from './threatmatrix.service.js';
import { ThreatMatrixController } from './threatmatrix.controller.js';

export class ThreatMatrixModule {
  private service = new ThreatMatrixService();
  private controller = new ThreatMatrixController(this.service);

  getService() { return this.service; }
  getController() { return this.controller; }
}
