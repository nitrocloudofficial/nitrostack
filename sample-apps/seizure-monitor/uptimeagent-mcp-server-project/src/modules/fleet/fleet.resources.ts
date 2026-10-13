import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { loadFleet, loadSensorHistory, loadMaintenanceManual } from './fleet.data.js';

export class FleetResources {
  @Resource({
    uri: 'fleet://machines',
    name: 'Machine Fleet',
    description: 'List of all monitored machines with id, name, type, install date, and current status.',
    mimeType: 'application/json',
    examples: {
      response: {
        machines: [
          { id: 'engine-03', name: 'Engine 3', type: 'Turbofan Engine - CF-Series Analog', installDate: '2023-02-14', status: 'critical', totalCyclesLogged: 179, sourceDataset: 'NASA C-MAPSS FD001', realUnitNumber: 3 }
        ]
      }
    }
  })
  async getMachineFleet(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching machine fleet');
    const machines = loadFleet();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ machines }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'fleet://sensor-history',
    name: 'Sensor History',
    description: 'Cycle-by-cycle sensor readings (temperature, pressure, rotationalSpeed — real NASA C-MAPSS FD001 sensor values) for every machine in the fleet, keyed by machine id.',
    mimeType: 'application/json',
    examples: {
      response: {
        'engine-01': [{ cycle: 1, timestamp: '2026-01-29T00:00:00.000Z', temperature: 1398.13, pressure: 47.14, rotationalSpeed: 8138.4 }]
      }
    }
  })
  async getSensorHistory(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching sensor history for all machines');
    const history = loadSensorHistory();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(history, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'fleet://maintenance-manual',
    name: 'Maintenance Manual',
    description: 'Maps fault/anomaly types (per triggering sensor) to severity guidance and recommended repair actions.',
    mimeType: 'application/json',
    examples: {
      response: {
        entries: [
          { faultType: 'speed_instability', triggerSensor: 'rotationalSpeed', recommendedAction: 'Inspect drive-train and fuel control unit; recalibrate governor.' }
        ]
      }
    }
  })
  async getMaintenanceManual(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching maintenance manual');
    const entries = loadMaintenanceManual();

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ entries }, null, 2)
      }]
    };
  }
}
