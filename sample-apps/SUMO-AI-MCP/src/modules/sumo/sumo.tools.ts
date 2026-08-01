import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as dotenv from 'dotenv';

dotenv.config();

function getPythonExecutable(): string {
  const envPython = process.env.PYTHON_PATH;
  if (envPython && envPython.trim()) {
    return envPython.trim();
  }

  // Check if python3 is available in PATH
  try {
    execSync('python3 --version', { stdio: 'ignore' });
    return 'python3';
  } catch (e) { }

  return 'python';
}

function findSumoScript(scriptName: string): string {
  if (fs.existsSync(scriptName)) {
    return scriptName;
  }
  const sumoHomeRaw = process.env.SUMO_HOME;
  if (sumoHomeRaw) {
    const sumoHome = sumoHomeRaw.trim().replace(/[/\\]+$/, '');
    const candidates = [
      path.join(sumoHome, 'tools', 'osm', scriptName),
      path.join(sumoHome, 'tools', scriptName),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
  }
  return scriptName;
}

function findSumoBinary(binaryName: string): string {
  const sumoHomeRaw = process.env.SUMO_HOME;
  if (sumoHomeRaw) {
    const sumoHome = sumoHomeRaw.trim().replace(/[/\\]+$/, '');
    const ext = process.platform === 'win32' ? '.exe' : '';
    const cand = path.join(sumoHome, 'bin', `${binaryName}${ext}`);
    if (fs.existsSync(cand)) {
      return cand;
    }
  }
  return binaryName;
}

function clampBbox(minLon: number, minLat: number, maxLon: number, maxLat: number, maxSpan = 0.025): string {
  const centerLon = (minLon + maxLon) / 2.0;
  const centerLat = (minLat + maxLat) / 2.0;
  const halfSpan = maxSpan / 2.0;

  const clampedMinLon = (centerLon - halfSpan).toFixed(4);
  const clampedMinLat = (centerLat - halfSpan).toFixed(4);
  const clampedMaxLon = (centerLon + halfSpan).toFixed(4);
  const clampedMaxLat = (centerLat + halfSpan).toFixed(4);

  return `${clampedMinLon},${clampedMinLat},${clampedMaxLon},${clampedMaxLat}`;
}

async function resolveLocationToBboxAsync(locationOrBbox: string): Promise<string> {
  if (!locationOrBbox) return '76.8900,10.8950,76.9150,10.9150';
  const query = locationOrBbox.trim();

  // Check if already a 4-comma numerical string
  const parts = query.split(',');
  if (parts.length === 4) {
    const floats = parts.map((p) => parseFloat(p));
    if (!floats.some((f) => isNaN(f))) {
      return clampBbox(floats[0], floats[1], floats[2], floats[3]);
    }
  }

  // High-precision local presets (Coimbatore & regional hubs)
  const presets: Record<string, string> = {
    ettimadai: '76.8900,10.8950,76.9150,10.9150',
    amrita: '76.8980,10.9000,76.9100,10.9100',
    gandhipuram: '76.9550,10.9950,76.9800,11.0200',
    peelamedu: '76.9950,11.0150,77.0200,11.0400',
    rspuram: '76.9350,10.9950,76.9600,11.0200',
    'rs puram': '76.9350,10.9950,76.9600,11.0200',
    ukkadam: '76.9450,10.9750,76.9700,11.0000',
    saravanampatti: '76.9750,11.0650,77.0000,11.0900',
    erode: '77.7200,11.3350,77.7450,11.3600',
    coimbatore: '76.9500,10.9950,76.9750,11.0200',
    chennai: '80.2600,13.0650,80.2850,13.0900',
    bangalore: '77.5850,12.9650,77.6100,12.9900',
    bengaluru: '77.5850,12.9650,77.6100,12.9900',
    delhi: '77.2100,28.6100,77.2350,28.6350'
  };

  const key = query.toLowerCase();
  for (const [name, bbox] of Object.entries(presets)) {
    if (key.includes(name)) {
      return bbox;
    }
  }

  // Dynamic OpenStreetMap Nominatim Geocoding API lookup
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json`;
    const responseData = await new Promise<string>((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'NitroStack-SUMO-Geocoder/1.0' } }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.setTimeout(4000, () => {
        req.destroy();
        reject(new Error('Nominatim timeout'));
      });
    });

    const parsed = JSON.parse(responseData);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const bboxArr = parsed[0].boundingbox; // [southLat, northLat, westLon, eastLon]
      if (bboxArr && bboxArr.length === 4) {
        const minLat = parseFloat(bboxArr[0]);
        const maxLat = parseFloat(bboxArr[1]);
        const minLon = parseFloat(bboxArr[2]);
        const maxLon = parseFloat(bboxArr[3]);
        return clampBbox(minLon, minLat, maxLon, maxLat);
      }
    }
  } catch (e) {
    // Fallback to default focal area if geocoding times out
  }

  return '76.8900,10.8950,76.9150,10.9150';
}

export class SumoTools {
  @Tool({
    name: 'generate_network',
    description: 'Step 1: Dynamically geocode area/neighborhood names (e.g. "Gandhipuram", "Peelamedu", "RS Puram", "Ukkadam", "Ettimadai") or coordinate box, clean old maps, and convert fresh OpenStreetMap data into mymap.net.xml.',
    inputSchema: z.object({
      bbox: z.string().describe('Area or neighborhood name (e.g. "Gandhipuram", "Peelamedu", "RS Puram", "Ukkadam", "Ettimadai") or coordinate string (min_lon,min_lat,max_lon,max_lat)')
    })
  })
  async generateNetwork(input: { bbox: string }, ctx: ExecutionContext) {
    const targetBbox = await resolveLocationToBboxAsync(input.bbox);
    ctx.logger.info(`Generating SUMO network for location '${input.bbox}' (resolved clamped bbox: ${targetBbox})`);

    const osmScript = findSumoScript('osmGet.py');
    const netconvertBin = findSumoBinary('netconvert');
    const cwd = process.cwd();

    try {
      // Step 0: Clean up any stale map files to prevent reusing old maps from previous runs
      const existingFiles = fs.readdirSync(cwd);
      for (const f of existingFiles) {
        if (f.startsWith('mymap') && (f.endsWith('.osm') || f.endsWith('.osm.xml') || f.endsWith('.net.xml'))) {
          try { fs.unlinkSync(path.join(cwd, f)); } catch (e) { }
        }
      }

      // Step 1: Execute python osmGet.py -b [coords] -p mymap
      const pythonBin = getPythonExecutable();
      execSync(`"${pythonBin}" "${osmScript}" "-b=${targetBbox}" -p mymap`, { stdio: ['ignore', 'pipe', 'pipe'] });

      // Detect generated OSM file (e.g. mymap_bbox.osm.xml or mymap.osm)
      const files = fs.readdirSync(cwd);
      const osmFiles = files.filter(f => f.startsWith('mymap') && (f.endsWith('.osm') || f.endsWith('.osm.xml')));
      const osmInput = osmFiles.length > 0 ? osmFiles.join(',') : 'mymap.osm';

      // Step 2: Execute netconvert --osm-files mymap.osm -o mymap.net.xml
      execSync(`"${netconvertBin}" --osm-files ${osmInput} -o mymap.net.xml`, { stdio: ['ignore', 'pipe', 'pipe'] });

      return {
        status: 'success',
        message: `Success: Network file 'mymap.net.xml' generated for '${input.bbox}' (clamped focal bbox: ${targetBbox}).`
      };
    } catch (e: any) {
      return {
        status: 'error',
        message: `Error generating network for '${input.bbox}': ${e.message}`
      };
    }
  }

  private createVTypesFile(filePath = 'vtypes.add.xml') {
    const vtypesXml = `<additional>
    <vTypeDistribution id="indian_mixed">
        <vType id="ind_motorcycle" vClass="motorcycle" length="1.8" width="0.8" minGap="0.5" maxSpeed="16.67" accel="3.5" decel="5.0" probability="0.35" color="1,0.3,0.3" latAlignment="arbitrary"/>
        <vType id="ind_autorickshaw" vClass="moped" length="2.6" width="1.3" minGap="0.8" maxSpeed="13.89" accel="2.0" decel="4.5" probability="0.20" color="1,0.8,0" latAlignment="arbitrary"/>
        <vType id="ind_car" vClass="passenger" length="4.3" width="1.8" minGap="1.0" maxSpeed="22.22" accel="2.6" decel="4.5" probability="0.30" color="0.2,0.6,1"/>
        <vType id="ind_bus" vClass="bus" length="10.5" width="2.5" minGap="2.0" maxSpeed="13.89" accel="1.2" decel="3.5" probability="0.08" color="0.2,0.8,0.2"/>
        <vType id="ind_truck" vClass="truck" length="8.0" width="2.4" minGap="2.0" maxSpeed="13.89" accel="1.0" decel="3.0" probability="0.07" color="0.8,0.5,0.2"/>
    </vTypeDistribution>
</additional>`;
    fs.writeFileSync(path.join(process.cwd(), filePath), vtypesXml, 'utf-8');
  }

  private createGuiSettings(netFile = 'mymap.net.xml', settingsFile = 'gui-settings.xml') {
    let centerX = 1000.0;
    let centerY = 1000.0;
    let zoom = 500.0;

    if (fs.existsSync(netFile)) {
      try {
        const netContent = fs.readFileSync(netFile, 'utf-8');
        const match = netContent.match(/convBoundary="([^"]+)"/);
        if (match && match[1]) {
          const parts = match[1].split(',').map((v) => parseFloat(v));
          if (parts.length === 4) {
            const [minX, minY, maxX, maxY] = parts;
            centerX = (minX + maxX) / 2.0;
            centerY = (minY + maxY) / 2.0;
            const width = Math.max(1.0, maxX - minX);
            const height = Math.max(1.0, maxY - minY);
            zoom = Math.max(400.0, Math.min(2500.0, 120000.0 / Math.max(width, height)));
          }
        }
      } catch (e) {
        // Fallback to default center/zoom
      }
    }

    const guiXml = `<viewsettings>
    <scheme name="real world"/>
    <delay value="150"/>
    <viewport zoom="${zoom.toFixed(2)}" x="${centerX.toFixed(2)}" y="${centerY.toFixed(2)}"/>
    <vehicles vehicleScale="2.5" vehicleColorer="by vType"/>
</viewsettings>`;

    fs.writeFileSync(path.join(process.cwd(), settingsFile), guiXml, 'utf-8');
  }

  @Tool({
    name: 'generate_routes',
    description: 'Step 2: Generate random trips/routes for heterogeneous Indian traffic (motorcycles, autos, cars, buses, trucks) and sublane configuration file.',
    inputSchema: z.object({
      trips: z.number().optional().default(600).describe('Total number of trips to generate across simulation duration (default: 600)'),
      duration: z.number().optional().default(7200).describe('Total simulation duration in seconds (default: 7200s / 2 hours)'),
      density: z.enum(['low', 'medium', 'high', 'congested']).optional().describe('Preset traffic density level (low: 250, medium: 600, high: 1200, congested: 2000 trips)')
    })
  })
  async generateRoutes(input: { trips?: number; duration?: number; density?: 'low' | 'medium' | 'high' | 'congested' }, ctx: ExecutionContext) {
    let totalTrips = input.trips || 600;
    if (input.density) {
      const densityMap: Record<string, number> = { low: 250, medium: 600, high: 1200, congested: 2000 };
      totalTrips = densityMap[input.density] || totalTrips;
    }

    const totalDuration = input.duration || 7200;
    const period = Math.max(1, Math.floor(totalDuration / totalTrips));

    ctx.logger.info(`Generating heterogeneous SUMO routes for ${totalTrips} trips over ${totalDuration}s (period=${period})`);

    const tripsScript = findSumoScript('randomTrips.py');

    if (!fs.existsSync('mymap.net.xml')) {
      return {
        status: 'error',
        message: "Error: 'mymap.net.xml' not found. Please run 'generate_network' first."
      };
    }

    try {
      // Step 1: Create heterogeneous Indian vehicle types file (motorcycles, autorickshaws, cars, buses, trucks)
      this.createVTypesFile('vtypes.add.xml');

      // Step 2: Execute python randomTrips.py with indian_mixed vType distribution
      const pythonBin = getPythonExecutable();
      execSync(`"${pythonBin}" "${tripsScript}" -n mymap.net.xml -e ${totalDuration} -p ${period} -l -r mymap.rou.xml -a vtypes.add.xml --trip-attributes "type=\\"indian_mixed\\""`, { stdio: ['ignore', 'pipe', 'pipe'] });

      // Step 3: Auto-generate GUI visual settings file
      this.createGuiSettings('mymap.net.xml', 'gui-settings.xml');

      // Step 4: Programmatically generate mymap.sumocfg XML file referencing net, routes, and sublane processing
      const sumocfgContent = `<configuration>
    <input>
        <net-file value="mymap.net.xml"/>
        <route-files value="mymap.rou.xml"/>
        <gui-settings-file value="gui-settings.xml"/>
    </input>
    <processing>
        <lateral-resolution value="0.8"/>
    </processing>
    <time>
        <begin value="0"/>
        <end value="${totalDuration}"/>
    </time>
</configuration>`;

      fs.writeFileSync(path.join(process.cwd(), 'mymap.sumocfg'), sumocfgContent, 'utf-8');

      return {
        status: 'success',
        message: `Success: SUMO configuration file 'mymap.sumocfg' generated with ${totalTrips} trips across heterogeneous vehicle types (motorcycles, autos, cars, buses, trucks) and sublane resolution.`
      };
    } catch (e: any) {
      return {
        status: 'error',
        message: `Error generating routes: ${e.message}`
      };
    }
  }

  @Tool({
    name: 'run_headless_simulation',
    description: 'Step 3: Execute SUMO simulation headlessly using mymap.sumocfg and output stats.xml and tripinfo.xml.',
    inputSchema: z.object({})
  })
  async runHeadlessSimulation(input: {}, ctx: ExecutionContext) {
    ctx.logger.info('Running SUMO simulation in headless mode...');

    const sumoBin = findSumoBinary('sumo');

    if (!fs.existsSync('mymap.sumocfg')) {
      return {
        status: 'error',
        message: "Error: 'mymap.sumocfg' not found. Please run 'generate_routes' first."
      };
    }

    try {
      // Execute SUMO headlessly and wait for completion
      execSync(`"${sumoBin}" -c mymap.sumocfg --statistic-output stats.xml --tripinfo-output tripinfo.xml`, { stdio: ['ignore', 'pipe', 'pipe'] });

      return {
        status: 'success',
        message: "Success: Headless SUMO simulation completed. 'stats.xml' and 'tripinfo.xml' generated."
      };
    } catch (e: any) {
      return {
        status: 'error',
        message: `Error running simulation: ${e.message}`
      };
    }
  }

  @Tool({
    name: 'run_gui_simulation',
    description: 'Step 3b: Open the visual SUMO GUI app on your desktop to view vehicles driving on the map in real-time.',
    inputSchema: z.object({
      autoStart: z.boolean().optional().default(true).describe('Automatically start simulation playback on launch'),
      delay: z.number().optional().default(150).describe('Step delay in milliseconds for smooth human-visible animation (default: 150ms)')
    })
  })
  async runGuiSimulation(input: { autoStart?: boolean; delay?: number }, ctx: ExecutionContext) {
    ctx.logger.info('Launching SUMO GUI application...');

    if (!fs.existsSync('mymap.sumocfg')) {
      return {
        status: 'error',
        message: "Error: 'mymap.sumocfg' not found. Please run 'generate_routes' first."
      };
    }

    if (!fs.existsSync('gui-settings.xml')) {
      this.createGuiSettings('mymap.net.xml', 'gui-settings.xml');
    }

    const isHeadless = process.env.HEADLESS_MODE === 'true' || process.env.NITRO_CLOUD === 'true';

    if (isHeadless) {
      ctx.logger.info('Headless Cloud Environment detected (HEADLESS_MODE=true). Running simulation headlessly...');
      await this.runHeadlessSimulation({}, ctx);
      return {
        status: 'success',
        mode: 'cloud_headless',
        message: "Simulation completed headlessly on NitroStack Cloud. 'stats.xml' & 'tripinfo.xml' generated. To view the live simulation GUI on your local desktop machine, run 'npm run launch:local'."
      };
    }

    const sumoGuiBin = findSumoBinary('sumo-gui');
    const stepDelay = input.delay || 150;

    try {
      const autoStartFlag = input.autoStart !== false ? '--start' : '';
      execSync(`start "" "${sumoGuiBin}" -c mymap.sumocfg -g gui-settings.xml --delay ${stepDelay} ${autoStartFlag}`);

      return {
        status: 'success',
        mode: 'local_gui',
        message: `Success: SUMO GUI application launched on desktop with centered viewport, sublane resolution, real world scheme, and ${stepDelay}ms step delay.`
      };
    } catch (e: any) {
      ctx.logger.warn(`Could not open GUI directly (${e.message}). Falling back to headless simulation...`);
      await this.runHeadlessSimulation({}, ctx);
      return {
        status: 'success',
        mode: 'cloud_fallback_headless',
        message: `Headless fallback completed. Desktop GUI launch unavailable in current server environment. Run 'npm run launch:local' on your local desktop machine.`
      };
    }
  }

  @Tool({
    name: 'analyze_results',
    description: 'Step 4: Parse stats.xml and extract key metrics (total vehicles loaded, inserted, average route length).',
    inputSchema: z.object({})
  })
  async analyzeResults(input: {}, ctx: ExecutionContext) {
    ctx.logger.info('Parsing stats.xml results...');

    const statsPath = path.join(process.cwd(), 'stats.xml');
    if (!fs.existsSync(statsPath)) {
      return {
        error: "Statistics file 'stats.xml' not found. Please run 'run_headless_simulation' first."
      };
    }

    try {
      const xmlData = fs.readFileSync(statsPath, 'utf-8');

      // Robust extraction using regular expressions
      const loadedMatch = xmlData.match(/<vehicles[^>]*\bloaded="([0-9]+)"/);
      const insertedMatch = xmlData.match(/<vehicles[^>]*\binserted="([0-9]+)"/);
      const routeLengthMatch = xmlData.match(/<vehicleTripStatistics[^>]*\b(?:routeLength|avgRouteLength)="([0-9.]+)"/);

      const totalLoaded = loadedMatch ? parseInt(loadedMatch[1], 10) : 0;
      const totalInserted = insertedMatch ? parseInt(insertedMatch[1], 10) : 0;
      const avgRouteLength = routeLengthMatch ? parseFloat(routeLengthMatch[1]) : 0.0;

      return {
        total_vehicles_loaded: totalLoaded,
        total_vehicles_inserted: totalInserted,
        average_route_length: avgRouteLength
      };
    } catch (e: any) {
      return {
        error: `Failed to parse statistics: ${e.message}`
      };
    }
  }

  @Tool({
    name: 'run_full_simulation',
    description: 'Master Orchestration Tool: Executes the complete end-to-end SUMO traffic simulation pipeline in a single call (downloads network, generates routes, opens GUI, and analyzes results).',
    inputSchema: z.object({
      bbox: z.string().describe('Bounding box coordinate string (min_lon,min_lat,max_lon,max_lat)'),
      trips: z.number().optional().default(600).describe('Total number of vehicle trips to simulate (default: 600)'),
      duration: z.number().optional().default(7200).describe('Total simulation duration in seconds (default: 7200s / 2 hours)'),
      density: z.enum(['low', 'medium', 'high', 'congested']).optional().describe('Preset traffic density level (low: 250, medium: 600, high: 1200, congested: 2000 trips)'),
      launchGui: z.boolean().optional().default(true).describe('Automatically open the visual SUMO GUI desktop application')
    })
  })
  async runFullSimulation(
    input: { bbox: string; trips?: number; duration?: number; density?: 'low' | 'medium' | 'high' | 'congested'; launchGui?: boolean },
    ctx: ExecutionContext
  ) {
    ctx.logger.info(`Running full end-to-end simulation for bbox: ${input.bbox}`);

    const netRes = await this.generateNetwork({ bbox: input.bbox }, ctx);
    if (netRes.status === 'error') {
      return { status: 'error', step: 'generate_network', message: netRes.message };
    }

    const targetTrips = input.trips || 600;
    const routesRes = await this.generateRoutes({ trips: targetTrips, duration: input.duration || 7200, density: input.density }, ctx);
    if (routesRes.status === 'error') {
      return { status: 'error', step: 'generate_routes', message: routesRes.message };
    }

    const headlessRes = await this.runHeadlessSimulation({}, ctx);

    let guiRes: any = null;
    if (input.launchGui !== false) {
      guiRes = await this.runGuiSimulation({ autoStart: true, delay: 150 }, ctx);
    }

    const analytics = await this.analyzeResults({}, ctx);

    return {
      status: 'success',
      bbox: input.bbox,
      trips: targetTrips,
      duration: input.duration || 7200,
      density: input.density || 'medium',
      gui_launched: input.launchGui !== false,
      network_status: netRes.message,
      routes_status: routesRes.message,
      headless_status: headlessRes.message,
      gui_status: guiRes ? guiRes.message : 'GUI not requested',
      analytics
    };
  }
}
