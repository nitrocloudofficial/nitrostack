import { ToolDecorator as Tool,Widget, ExecutionContext, z } from '@nitrostack/core';
import { DatabaseService } from '../../database/db.js';
import * as fs from 'fs';
import * as path from 'path';

export class FactoryTools {
  private readonly dbService = new DatabaseService();
  // Factory location (Kerala, India) used for live weather lookups via Open-Meteo.
  private static readonly FACTORY_COORDS = { lat: 9.9658, lon: 76.2421 };

  private weatherDescription(code?: number): string {
    const map: Record<number, string> = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Dense drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow',
      80: 'Rain showers', 95: 'Thunderstorm', 96: 'Thunderstorm with hail'
    };
    return (code != null && map[code]) ? map[code] : 'Unknown';
  }

  private async fetchWeather(ctx: ExecutionContext): Promise<{ temp: number; humidity: number; description: string }> {
    const lat = FactoryTools.FACTORY_COORDS.lat;
    const lon = FactoryTools.FACTORY_COORDS.lon;
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,relative_humidity_2m,weather_code';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('status ' + res.status);
      const json: any = await res.json();
      const cur = json && json.current ? json.current : {};
      return {
        temp: typeof cur.temperature_2m === 'number' ? cur.temperature_2m : 32,
        humidity: typeof cur.relative_humidity_2m === 'number' ? cur.relative_humidity_2m : 85,
        description: this.weatherDescription(cur.weather_code)
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (ctx && ctx.logger && ctx.logger.warn) ctx.logger.warn('Weather lookup failed, using fallback: ' + msg);
      return { temp: 32, humidity: 85, description: 'Humid (fallback)' };
    }
  }


  @Tool({
    name: 'analyze_sensor_data',
    description:
      'Analyze uploaded sensor CSV data (timestamp, temperature, vibration, current, voltage) and detect anomalies.',
    inputSchema: z.object({
      file_name: z.string().optional().describe('Name of the CSV file'),
      file_content: z.string().optional().describe('Base64 encoded CSV file content'),
    }),
  })
  @Widget('sensor-anomaly-dashboard')
  async analyzeSensorData(
    input: { file_name?: string; file_content?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Analyzing sensor data');

    let csvContent = '';
    const uploadsDir =
  process.env.NODE_ENV === 'production'
    ? path.join('/tmp', 'factorylens-uploads')
    : path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (input.file_content && input.file_name) {
      const filePath = path.join(uploadsDir, input.file_name);

      try {
        const matches = input.file_content.match(/^data:([^;]+);base64,(.+)$/);
        let buffer: Buffer;

        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(input.file_content, 'base64');
        }

        fs.writeFileSync(filePath, buffer);
        csvContent = buffer.toString('utf8');

        ctx.logger.info(`Saved and read uploaded file: ${filePath}`);
      } catch (err: any) {
        ctx.logger.error(`Failed to save uploaded file: ${err.message}`);
        throw new Error(`Failed to process uploaded file: ${err.message}`);
      }
    } else {
      const defaultPath = path.join(process.cwd(), 'database', 'sensor.csv');
      const uploadPath = path.join(uploadsDir, 'sensor.csv');

      let finalPath = '';

      if (fs.existsSync(uploadPath)) {
        finalPath = uploadPath;
      } else if (fs.existsSync(defaultPath)) {
        finalPath = defaultPath;
      } else {
        throw new Error('No sensor CSV file found. Please upload one.');
      }

      csvContent = fs.readFileSync(finalPath, 'utf8');
      ctx.logger.info(`Reading sensor data from: ${finalPath}`);
    }

    csvContent = csvContent.replace(/^\uFEFF/, '').trim();

    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length <= 1) {
      throw new Error('CSV file is empty or missing headers');
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const dataRows = lines.slice(1);

    const records: any[] = [];
    const anomalies: any[] = [];

    const TEMP_LIMIT = 65.0;
    const VIB_LIMIT = 2.5;
    const CURRENT_MIN = 4.0;
    const CURRENT_MAX = 5.5;

    let tempSum = 0;
    let vibSum = 0;
    let currentSum = 0;

    let maxTemp = 0;
    let maxVib = 0;
    let maxCurrent = 0;

    dataRows.forEach((line) => {
      const values = line.split(',').map((v) => v.trim());

      if (values.length !== headers.length) {
        return;
      }

      const record: any = {};

      headers.forEach((header, index) => {
        const val = values[index];
        record[header] = header === 'timestamp' ? val : parseFloat(val);
      });

      records.push(record);

      const temp = record.temperature || 0;
      const vib = record.vibration || 0;
      const current = record.current || 0;

      tempSum += temp;
      vibSum += vib;
      currentSum += current;

      if (temp > maxTemp) maxTemp = temp;
      if (vib > maxVib) maxVib = vib;
      if (current > maxCurrent) maxCurrent = current;

      const issues: string[] = [];

      if (temp > TEMP_LIMIT) {
        issues.push(`Overheating: ${temp}°C exceeds limit of ${TEMP_LIMIT}°C`);
      }

      if (vib > VIB_LIMIT) {
        issues.push(`High Vibration: ${vib} mm/s exceeds limit of ${VIB_LIMIT} mm/s`);
      }

      if (current > CURRENT_MAX) {
        issues.push(`Overcurrent: ${current}A exceeds normal limit of ${CURRENT_MAX}A`);
      } else if (current < CURRENT_MIN && current > 0) {
        issues.push(`Undercurrent: ${current}A is below normal range minimum of ${CURRENT_MIN}A`);
      }

      if (issues.length > 0) {
        anomalies.push({
          timestamp: record.timestamp,
          temperature: temp,
          vibration: vib,
          current,
          voltage: record.voltage,
          issues,
        });
      }
    });

    const count = records.length;

    const stats = {
      total_records: count,
      averages: {
        temperature: count > 0 ? Math.round((tempSum / count) * 100) / 100 : 0,
        vibration: count > 0 ? Math.round((vibSum / count) * 100) / 100 : 0,
        current: count > 0 ? Math.round((currentSum / count) * 100) / 100 : 0,
      },
      maximums: {
        temperature: maxTemp,
        vibration: maxVib,
        current: maxCurrent,
      },
    };

    return {
      status: anomalies.length > 0 ? 'warning' : 'healthy',
      stats,
      anomalies_count: anomalies.length,
      anomalies,
    };
  }

  
  @Tool({
    name: 'get_maintenance_history',
    description: 'Retrieve the historical repair and maintenance logs for a specific machine from SQLite.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine (e.g. MCH-004)'),
    }),
  })
  @Widget('maintenance-history')
  async getMaintenanceHistory(input: { machine_id: string }, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching maintenance logs for ${input.machine_id}`);

    const logs = await this.dbService.all(
      'SELECT * FROM Maintenance WHERE machine_id = ? ORDER BY date DESC',
      [input.machine_id]
    );

    return {
      machine_id: input.machine_id,
      history: logs,
    };
  }

  
  @Tool({
    name: 'search_machine_manual',
    description: 'Search machine manuals for warning codes, error codes, and troubleshooting steps.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine'),
      query: z.string().describe('The search query or error code (e.g., E101, overheating)'),
    }),
  })
  @Widget('manual-search')
  async searchMachineManual(
    input: { machine_id: string; query: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Searching manual for ${input.machine_id} with query "${input.query}"`);

    const manualsDir = path.join(process.cwd(), 'resources', 'manuals');

    let manualFileName = `${input.machine_id}-manual.txt`;
    let filePath = path.join(manualsDir, manualFileName);

    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(manualsDir)) {
        const files = fs.readdirSync(manualsDir);
        const match = files.find((f) =>
          f.toLowerCase().includes(input.machine_id.toLowerCase())
        );

        if (match) {
          filePath = path.join(manualsDir, match);
          manualFileName = match;
        }
      }
    }

    if (!fs.existsSync(filePath)) {
      return {
        found: false,
        message: `No manual file found for machine ${input.machine_id} in ${manualsDir}`,
      };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const matches: string[] = [];

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(input.query.toLowerCase())) {
        const start = Math.max(0, index - 2);
        const end = Math.min(lines.length - 1, index + 3);
        const snippet = lines.slice(start, end + 1).join('\n');

        matches.push(`--- Line ${index + 1} Context ---\n${snippet}`);
      }
    });

    return {
      found: matches.length > 0,
      manual_file: manualFileName,
      matches_count: matches.length,
      results: matches.slice(0, 5),
    };
  }

  @Tool({
    name: 'analyze_root_cause',
    description:
      'Diagnose the root cause of a machine failure by synthesizing sensor anomalies, maintenance logs, manual guidance, and live environmental conditions. Fetches live weather automatically when not supplied.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine'),
      anomalies: z.array(z.any()).optional().describe('Flagged anomalies from analyze_sensor_data'),
      history: z.array(z.any()).optional().describe('Historical maintenance logs'),
      manual_matches: z.array(z.string()).optional().describe('Relevant excerpts from the manual'),
      external_weather: z
        .object({
          temp: z.number(),
          humidity: z.number(),
          description: z.string(),
        })
        .optional()
        .describe('Current external weather. If omitted, FactoryLens fetches live weather from Open-Meteo.'),
    }),
  })
  @Widget('root-cause-investigation')
  async analyzeRootCause(
    input: {
      machine_id: string;
      anomalies?: any[];
      history?: any[];
      manual_matches?: string[];
      external_weather?: any;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Analyzing root cause for ' + input.machine_id);

    const machineId = input.machine_id;

    const machine = await this.dbService.get<any>('SELECT * FROM Machines WHERE machine_id = ?', [machineId]);

    if (!machine) {
      throw new Error('Machine ' + machineId + ' not found in database');
    }

    let anomalies = input.anomalies || [];

if (!Array.isArray(anomalies)) {
  anomalies = [];
}

if (anomalies.length === 0) {
  try {
    const sensorResult: any = await this.analyzeSensorData({}, ctx);
    anomalies = sensorResult.anomalies || [];
  } catch (err: any) {
    ctx.logger.warn(`Could not auto-load sensor anomalies: ${err.message}`);
  }
}
    const history = input.history || [];

    const weather = input.external_weather || (await this.fetchWeather(ctx));

    let maxTemp = 0;
    let maxVib = 0;
    let maxCurrent = 0;
    anomalies.forEach((a) => {
  let t = Number(a.temperature) || 0;
  let v = Number(a.vibration) || 0;
  let c = Number(a.current) || 0;

  // Support AI-generated anomaly format:
  // { type: "temperature", value: 72.5 }
  if (a.type === 'temperature') {
    t = Number(a.value) || 0;
  }

  if (a.type === 'vibration') {
    v = Number(a.value) || 0;
  }

  if (a.type === 'current') {
    c = Number(a.value) || 0;
  }

  if (t > maxTemp) maxTemp = t;
  if (v > maxVib) maxVib = v;
  if (c > maxCurrent) maxCurrent = c;
});

    const hasOverheating = maxTemp > 65;
    const hasVibration = maxVib > 2.5;
    const hasOvercurrent = maxCurrent > 5.5;

    const evidence = [];
    const recommendations = [];
    let rootCause = 'No clear threshold breach detected; recommend a routine inspection.';
    let confidence = 0.4;

    if (anomalies.length > 0) {
      if (maxTemp > 0) {
        evidence.push('Sensor data shows temperature peaking at ' + maxTemp + 'C' + (maxTemp > 65 ? ', exceeding the 65C safety limit' : ''));
      }
      if (maxVib > 0) {
        evidence.push('Vibration peaked at ' + maxVib + ' mm/s' + (maxVib > 2.5 ? ', exceeding the 2.5 mm/s limit' : ''));
      }
      if (maxCurrent > 0) {
        evidence.push('Current draw peaked at ' + maxCurrent + 'A' + (maxCurrent > 5.5 ? ', exceeding the 5.5A normal maximum' : ''));
      }
    } else {
      evidence.push('No live sensor anomalies were supplied; relying on maintenance history and manual context.');
    }

    const beltHistory = history.find((h) => {
      const issue = String(h.issue || '').toLowerCase();
      return issue.indexOf('belt') !== -1 || issue.indexOf('motor') !== -1;
    });
    if (beltHistory) {
      evidence.push('Maintenance log (' + beltHistory.date + ') references belt/motor issue: "' + beltHistory.issue + '".');
    }

    if (weather && weather.humidity > 80) {
      evidence.push('Live external humidity is ' + weather.humidity + '% (' + weather.description + '), which reduces drive-pulley traction and aggravates belt slippage.');
    }

    if (hasOverheating && hasVibration && hasOvercurrent) {
      rootCause =
        'Drive belt slippage is causing severe friction in the drive motor. The extra load draws excessive current, overheating the motor - worsened by high ambient humidity.';
      confidence = 0.92;
      recommendations.push('Immediate emergency shutdown of ' + machine.machine_name + ' (' + machineId + ').');
      recommendations.push('Inspect and replace the slipping drive belt.');
      recommendations.push('Clean and check the drive motor cooling fan for dust/blockages.');
      recommendations.push('Apply tensioner adjustments and verify drive pulley alignment.');
    } else if (hasOverheating && hasVibration) {
      rootCause =
        'Bearing wear and lubrication failure: friction in the bearings causes physical vibration and heat transfer to the spindle.';
      confidence = 0.78;
      recommendations.push('Perform immediate bearing lubrication check.');
      recommendations.push('Inspect spindle bearings for physical pitting or wear.');
    } else if (hasOverheating) {
      rootCause = 'Cooling circuit malfunction or motor overload.';
      confidence = 0.65;
      recommendations.push('Check cooling fan operation and clear heat-sink blockages.');
    } else if (hasVibration) {
      rootCause = 'Mechanical misalignment or loose mounting.';
      confidence = 0.7;
      recommendations.push('Tighten mounting bolts and perform shaft-alignment check.');
    }

    return {
      machine_id: machineId,
      machine_name: machine.machine_name,
      location: machine.location,
      status: machine.status,
      diagnosis: {
        root_cause: rootCause,
        confidence_score: confidence,
        evidence: evidence,
        recommendations: recommendations,
      },
      weather: weather,
    };
  }

  
  @Tool({
    name: 'predict_business_impact',
    description:
      'Calculate the estimated production loss, repair downtime, and priority score based on the machine status and production queue.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine'),
      diagnosis: z.string().describe('The diagnosed issue or root cause'),
      severity: z.enum(['warning', 'critical']).describe('The severity of the issue'),
    }),
  })
  @Widget('business-impact')
  async predictBusinessImpact(
    input: {
      machine_id: string;
      diagnosis: string;
      severity: 'warning' | 'critical';
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Predicting business impact for ${input.machine_id}`);

    const prodInfo = await this.dbService.get<any>(
      'SELECT * FROM Production WHERE machine_id = ?',
      [input.machine_id]
    );

    if (!prodInfo) {
      return {
        machine_id: input.machine_id,
        downtime_hours: 4,
        production_loss_inr: 5000,
        risk_level: 'medium',
        message: 'No active production schedule in database.',
      };
    }

    let downtimeHours = 0;
    let costPerHour = 0;

    if (input.severity === 'critical') {
      downtimeHours = prodInfo.priority === 'high' ? 8 : 12;
      costPerHour = prodInfo.priority === 'high' ? 15000 : 5000;
    } else {
      downtimeHours = prodInfo.priority === 'high' ? 2 : 4;
      costPerHour = prodInfo.priority === 'high' ? 8000 : 3000;
    }


    const estimatedLoss = downtimeHours * costPerHour;

    const riskLevel =
      prodInfo.priority === 'high' && input.severity === 'critical'
        ? 'critical'
        : prodInfo.priority === 'high' || input.severity === 'critical'
          ? 'high'
          : 'medium';

    return {
      machine_id: input.machine_id,
      product: prodInfo.product,
      quantity_pending: prodInfo.quantity,
      production_priority: prodInfo.priority,
      estimated_downtime_hours: downtimeHours,
      estimated_production_loss_inr: estimatedLoss,
      risk_level: riskLevel,
    };
  }

  
  @Tool({
    name: 'create_work_order',
    description: 'Create a new maintenance work order ticket in SQLite database.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine'),
      issue: z.string().describe('The issue description'),
      urgency: z.enum(['low', 'medium', 'high', 'emergency']).describe('The urgency level'),
      assigned_engineer: z.string().describe('The name of the engineer assigned to the task'),
    }),
  })
  @Widget('work-order')
  async createWorkOrder(
    input: {
      machine_id: string;
      issue: string;
      urgency: 'low' | 'medium' | 'high' | 'emergency';
      assigned_engineer: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Creating work order for ${input.machine_id}`);

    const dateStr = new Date().toISOString().split('T')[0];
    const repairStr = `PENDING - Urgency: ${input.urgency.toUpperCase()}. Assigned to ${input.assigned_engineer}.`;

    await this.dbService.run(
      'INSERT INTO Maintenance (machine_id, date, issue, repair, engineer) VALUES (?, ?, ?, ?, ?)',
      [input.machine_id, dateStr, input.issue, repairStr, input.assigned_engineer]
    );

    if (input.urgency === 'emergency' || input.urgency === 'high') {
      await this.dbService.run(
        "UPDATE Machines SET status = 'critical' WHERE machine_id = ?",
        [input.machine_id]
      );
    }

    const row = await this.dbService.get<any>('SELECT last_insert_rowid() as id');
    const orderId = row ? row.id : Math.floor(Math.random() * 1000);

    return {
      success: true,
      work_order_id: orderId,
      machine_id: input.machine_id,
      issue: input.issue,
      assigned_engineer: input.assigned_engineer,
      date_created: dateStr,
      status: 'pending',
    };
  }

    @Tool({
    name: 'generate_investigation_report',
    description: 'Compile a final maintenance work order investigation report in Markdown format.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine'),
      diagnosis: z.any().describe('The diagnosis object returned by analyze_root_cause'),
      impact: z.any().describe('The impact object returned by predict_business_impact'),
      work_order_id: z.coerce.number().describe('The ID of the created work order (number or numeric string)'),
    }),
  })
  @Widget('investigation-report')
  async generateInvestigationReport(
    input: {
      machine_id: string;
      diagnosis: any;
      impact: any;
      work_order_id: number;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Compiling report for ${input.machine_id}`);

    let diagnosis = input.diagnosis;
    let impact = input.impact;

    if (typeof diagnosis === 'string') {
      try { diagnosis = JSON.parse(diagnosis); } catch { diagnosis = {}; }
    }
    if (typeof impact === 'string') {
      try { impact = JSON.parse(impact); } catch { impact = {}; }
    }

    const machineId = input.machine_id;
    const machineLabel = machineId.startsWith('MCH-') ? machineId : `MCH-${machineId}`;
    const workOrderId = Number(input.work_order_id);

    const diagnosisDetails = diagnosis?.diagnosis || diagnosis || {};
    const rootCause = diagnosisDetails.root_cause || 'Root cause not provided';
    const confidenceScore = diagnosisDetails.confidence_score ?? 0;
    const evidence = Array.isArray(diagnosisDetails.evidence) ? diagnosisDetails.evidence : [];
    const recommendations = Array.isArray(diagnosisDetails.recommendations) ? diagnosisDetails.recommendations : [];

    const dateStr = new Date().toLocaleDateString();

    const reportContent = `
# FACTORYLENS FAILURE INVESTIGATION REPORT

**Report Date:** ${dateStr}
**Work Order ID:** #WO-${workOrderId}
**Machine:** ${machineLabel} (${diagnosis?.machine_name || 'System'})
**Location:** ${diagnosis?.location || 'N/A'}

---

## 1. Executive Summary

An inspection of machine **${machineLabel}** was triggered due to telemetry anomalies.

Root cause analysis suggests:

**${rootCause}**

Confidence score:

**${Math.round(confidenceScore * 100)}%**

---

## 2. Evidence Logs

${evidence.length > 0 ? evidence.map((e: string) => `- ${e}`).join('\n') : '- No evidence logs provided.'}

---

## 3. Business & Production Impact

- **Affected Product Line:** ${impact?.product || 'N/A'}
- **Production Priority:** ${(impact?.production_priority || 'N/A').toString().toUpperCase()}
- **Pending Batch Quantity:** ${impact?.quantity_pending || 'N/A'} units
- **Estimated Repair Downtime:** ${impact?.estimated_downtime_hours || 'N/A'} hours
- **Estimated Financial Impact:** ₹${Number(impact?.estimated_production_loss_inr || 0).toLocaleString('en-IN')} INR
- **Risk Level:** **${(impact?.risk_level || 'N/A').toString().toUpperCase()}**

---

## 4. Maintenance Recommendations

${recommendations.length > 0 ? recommendations.map((r: string, idx: number) => `${idx + 1}. **${r}**`).join('\n') : 'No recommendations provided.'}

---

## 5. Work Order Summary

- **Work Order ID:** #WO-${workOrderId}
- **Assigned Engineer:** ${impact?.assigned_engineer || 'Alex Mercer'}
- **Status:** Pending
- **Suggested Action:** Dispatch technician immediately and perform safety shutdown if the machine remains active.

---

**Lead Investigating AI:** FactoryLens Engineer MCP
**Generated By:** FactoryLens MCP Server
`;

    // Best-effort file write (non-fatal on read-only deploy filesystems)
    try {
      const reportsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      const reportFileName = `report_${machineLabel}_WO-${workOrderId}.md`;
      fs.writeFileSync(path.join(reportsDir, reportFileName), reportContent);
    } catch (writeErr: any) {
      ctx.logger.warn(`Report file not written (non-fatal): ${writeErr?.message ?? writeErr}`);
    }

    return {
      status: 'compiled',
      filename: `report_${machineLabel}_WO-${workOrderId}.md`,
      report: reportContent,
    };
  }
}