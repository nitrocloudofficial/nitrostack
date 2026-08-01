import os
import sys
import json
import shutil
import subprocess
import xml.etree.ElementTree as ET
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server instance for SUMO Simulation Pipeline
mcp = FastMCP("SUMO Traffic Simulation Server")


def get_python_executable() -> str:
    """
    Resolves the Python executable to run helper scripts (osmGet.py, randomTrips.py).
    Checks PYTHON_PATH environment variable first, then sys.executable, then python3/python on PATH.
    """
    env_python = os.environ.get("PYTHON_PATH")
    if env_python and env_python.strip():
        return env_python.strip()

    if sys.executable:
        return sys.executable

    which_py3 = shutil.which("python3")
    if which_py3:
        return which_py3

    which_py = shutil.which("python")
    if which_py:
        return which_py

    return "python"


def find_sumo_script(script_name: str) -> str:
    """
    Locate SUMO helper scripts (e.g. osmGet.py, randomTrips.py) in CWD or SUMO_HOME tools.
    """
    if os.path.exists(script_name):
        return script_name

    sumo_home_raw = os.environ.get("SUMO_HOME")
    if sumo_home_raw:
        sumo_home = sumo_home_raw.strip().rstrip("/\\")
        candidate_paths = [
            os.path.join(sumo_home, "tools", "osm", script_name),
            os.path.join(sumo_home, "tools", script_name),
        ]
        for path in candidate_paths:
            if os.path.exists(path):
                return path

    return script_name


def find_sumo_binary(binary_name: str) -> str:
    """
    Locate SUMO executable binaries (e.g. netconvert, sumo) on PATH or inside SUMO_HOME/bin.
    """
    which_path = shutil.which(binary_name)
    if which_path:
        return which_path

    sumo_home_raw = os.environ.get("SUMO_HOME")
    if sumo_home_raw:
        sumo_home = sumo_home_raw.strip().rstrip("/\\")
        ext = ".exe" if sys.platform == "win32" else ""
        candidate = os.path.join(sumo_home, "bin", f"{binary_name}{ext}")
        if os.path.exists(candidate):
            return candidate

    return binary_name


import urllib.request
import urllib.parse


def clamp_bbox(min_lon: float, min_lat: float, max_lon: float, max_lat: float, max_span: float = 0.025) -> str:
    """Clamps a bounding box to a focal region (~2.5km x 2.5km) around its center point to prevent OSM Overpass API timeouts."""
    center_lon = (min_lon + max_lon) / 2.0
    center_lat = (min_lat + max_lat) / 2.0
    half_span = max_span / 2.0

    clamped_min_lon = center_lon - half_span
    clamped_min_lat = center_lat - half_span
    clamped_max_lon = center_lon + half_span
    clamped_max_lat = center_lat + half_span

    return f"{clamped_min_lon:.4f},{clamped_min_lat:.4f},{clamped_max_lon:.4f},{clamped_max_lat:.4f}"


def resolve_location_to_bbox(location_or_bbox: str) -> str:
    """
    Converts place/neighborhood names (e.g. 'Gandhipuram', 'Peelamedu', 'RS Puram', 'Ukkadam', 'Ettimadai') 
    or coordinate strings ('min_lon,min_lat,max_lon,max_lat') into a clamped SUMO bounding box.
    """
    if not location_or_bbox:
        return "76.8900,10.8950,76.9150,10.9150"

    query_str = location_or_bbox.strip()

    # Check if already a 4-comma numerical string
    parts = query_str.split(',')
    if len(parts) == 4:
        try:
            floats = [float(p) for p in parts]
            return clamp_bbox(floats[0], floats[1], floats[2], floats[3])
        except ValueError:
            pass

    # High-precision local presets for Coimbatore & regional hubs
    presets = {
        "ettimadai": "76.8900,10.8950,76.9150,10.9150",
        "amrita": "76.8980,10.9000,76.9100,10.9100",
        "gandhipuram": "76.9550,10.9950,76.9800,11.0200",
        "peelamedu": "76.9950,11.0150,77.0200,11.0400",
        "rspuram": "76.9350,10.9950,76.9600,11.0200",
        "rs puram": "76.9350,10.9950,76.9600,11.0200",
        "ukkadam": "76.9450,10.9750,76.9700,11.0000",
        "saravanampatti": "76.9750,11.0650,77.0000,11.0900",
        "erode": "77.7200,11.3350,77.7450,11.3600",
        "coimbatore": "76.9500,10.9950,76.9750,11.0200",
        "chennai": "80.2600,13.0650,80.2850,13.0900",
        "bangalore": "77.5850,12.9650,77.6100,12.9900",
        "bengaluru": "77.5850,12.9650,77.6100,12.9900",
        "delhi": "77.2100,28.6100,77.2350,28.6350"
    }

    key = query_str.lower()
    for preset_name, preset_bbox in presets.items():
        if preset_name in key:
            return preset_bbox

    # Dynamic OpenStreetMap Nominatim Geocoding lookup
    try:
        url = "https://nominatim.openstreetmap.org/search?q=" + urllib.parse.quote(query_str) + "&format=json"
        req = urllib.request.Request(url, headers={'User-Agent': 'SUMO-MCP-AutoGeocoder/1.0'})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and len(data) > 0:
                boundingbox = data[0].get('boundingbox')  # [southLat, northLat, westLon, eastLon]
                if boundingbox and len(boundingbox) == 4:
                    min_lat, max_lat, min_lon, max_lon = [float(x) for x in boundingbox]
                    return clamp_bbox(min_lon, min_lat, max_lon, max_lat)
    except Exception:
        pass

    return "76.8900,10.8950,76.9150,10.9150"


@mcp.tool()
def generate_network(bbox: str) -> str:
    """
    Step 1: Network Generation Tool
    Dynamically geocodes area/neighborhood names (e.g. 'Gandhipuram', 'Peelamedu', 'RS Puram', 'Ukkadam', 'Ettimadai') or coordinate box, cleans old maps, and converts fresh OpenStreetMap data into mymap.net.xml.

    :param bbox: Area or neighborhood name (e.g. 'Gandhipuram', 'Peelamedu', 'RS Puram', 'Ukkadam', 'Ettimadai') or bounding box string ('min_lon,min_lat,max_lon,max_lat')
    :return: Confirmation message when mymap.net.xml is created.
    """
    target_bbox = resolve_location_to_bbox(bbox)
    osm_script = find_sumo_script("osmGet.py")
    netconvert_bin = find_sumo_binary("netconvert")

    try:
        # Step 0: Clean up stale map files to prevent reusing old maps from previous runs
        for f in os.listdir("."):
            if f.startswith("mymap") and (f.endswith(".osm") or f.endswith(".osm.xml") or f.endswith(".net.xml")):
                try:
                    os.remove(f)
                except Exception:
                    pass

        # Execute osmGet.py to download map data for given bounding box and prefix 'mymap'
        py_bin = get_python_executable()
        subprocess.run([py_bin, osm_script, f"-b={target_bbox}", "-p", "mymap"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

        # Detect generated OSM file (e.g. mymap_bbox.osm.xml or mymap.osm)
        osm_files = [f for f in os.listdir(".") if f.startswith("mymap") and (f.endswith(".osm") or f.endswith(".osm.xml"))]
        osm_input = ",".join(osm_files) if osm_files else "mymap.osm"

        # Execute netconvert to convert downloaded OpenStreetMap file into SUMO XML network format
        subprocess.run([netconvert_bin, "--osm-files", osm_input, "-o", "mymap.net.xml"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

        return f"Success: Network file 'mymap.net.xml' generated for '{bbox}' (clamped focal bbox: {target_bbox})."
    except subprocess.CalledProcessError as e:
        return f"Error generating network for '{bbox}': Subprocess exited with code {e.returncode}. Stderr: {e.stderr}"
    except Exception as e:
        return f"Error generating network for '{bbox}': {str(e)}"


def create_vtypes_file(file_path: str = "vtypes.add.xml") -> None:
    """Helper to auto-generate SUMO additional file with heterogeneous Indian vehicle types distribution."""
    vtypes_xml = """<additional>
    <vTypeDistribution id="indian_mixed">
        <vType id="ind_motorcycle" vClass="motorcycle" length="1.8" width="0.8" minGap="0.5" maxSpeed="16.67" accel="3.5" decel="5.0" probability="0.35" color="1,0.3,0.3" latAlignment="arbitrary"/>
        <vType id="ind_autorickshaw" vClass="moped" length="2.6" width="1.3" minGap="0.8" maxSpeed="13.89" accel="2.0" decel="4.5" probability="0.20" color="1,0.8,0" latAlignment="arbitrary"/>
        <vType id="ind_car" vClass="passenger" length="4.3" width="1.8" minGap="1.0" maxSpeed="22.22" accel="2.6" decel="4.5" probability="0.30" color="0.2,0.6,1"/>
        <vType id="ind_bus" vClass="bus" length="10.5" width="2.5" minGap="2.0" maxSpeed="13.89" accel="1.2" decel="3.5" probability="0.08" color="0.2,0.8,0.2"/>
        <vType id="ind_truck" vClass="truck" length="8.0" width="2.4" minGap="2.0" maxSpeed="13.89" accel="1.0" decel="3.0" probability="0.07" color="0.8,0.5,0.2"/>
    </vTypeDistribution>
</additional>"""
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(vtypes_xml)


def create_gui_settings(net_file: str = "mymap.net.xml", gui_settings_file: str = "gui-settings.xml") -> None:
    """Helper to auto-generate SUMO GUI settings XML for optimal human visual playback."""
    center_x, center_y, zoom = 1000.0, 1000.0, 500.0
    if os.path.exists(net_file):
        try:
            tree = ET.parse(net_file)
            location = tree.getroot().find('location')
            if location is not None:
                bounds = [float(x) for x in location.get('convBoundary', '0,0,2000,2000').split(',')]
                minX, minY, maxX, maxY = bounds
                center_x = (minX + maxX) / 2.0
                center_y = (minY + maxY) / 2.0
                width = max(1.0, maxX - minX)
                height = max(1.0, maxY - minY)
                zoom = max(400.0, min(2500.0, 120000.0 / max(width, height)))
        except Exception:
            pass

    gui_xml = f"""<viewsettings>
    <scheme name="real world"/>
    <delay value="150"/>
    <viewport zoom="{zoom:.2f}" x="{center_x:.2f}" y="{center_y:.2f}"/>
    <vehicles vehicleScale="2.5" vehicleColorer="by vType"/>
</viewsettings>"""

    with open(gui_settings_file, "w", encoding="utf-8") as f:
        f.write(gui_xml)


@mcp.tool()
def generate_routes(trips: int = 600, duration: int = 7200, density: str = None) -> str:
    """
    Step 2: Route Generation Tool
    Generates random trip routes for heterogeneous Indian traffic (motorcycles, autos, cars, buses, trucks) and sublane configuration file.

    :param trips: Total number of vehicles/trips to generate across the simulation duration (default: 600)
    :param duration: Total simulation duration in seconds (default: 7200 seconds / 2 hours)
    :param density: Optional preset density level ('low': 250, 'medium': 600, 'high': 1200, 'congested': 2000)
    :return: Confirmation message when mymap.sumocfg is created.
    """
    trips_script = find_sumo_script("randomTrips.py")
    
    total_trips = trips
    if density:
        density_map = {"low": 250, "medium": 600, "high": 1200, "congested": 2000}
        total_trips = density_map.get(density.lower(), trips)

    period = max(1, duration // max(1, total_trips))

    if not os.path.exists("mymap.net.xml"):
        return "Error: 'mymap.net.xml' not found. Please run 'generate_network' first."

    try:
        # Step 1: Create heterogeneous Indian vehicle types file
        create_vtypes_file("vtypes.add.xml")

        # Step 2: Execute randomTrips.py to generate random routes on the network over specified duration with indian_mixed distribution
        py_bin = get_python_executable()
        subprocess.run([
            py_bin, trips_script,
            "-n", "mymap.net.xml",
            "-e", str(duration),
            "-p", str(period),
            "-l",
            "-r", "mymap.rou.xml",
            "-a", "vtypes.add.xml",
            "--trip-attributes", 'type="indian_mixed"'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

        # Step 3: Generate GUI visual enhancement settings file
        create_gui_settings("mymap.net.xml", "gui-settings.xml")

        # Step 4: Programmatically create mymap.sumocfg XML file referencing network, route, and sublane settings
        sumocfg_content = f"""<configuration>
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
        <end value="{duration}"/>
    </time>
</configuration>"""

        with open("mymap.sumocfg", "w", encoding="utf-8") as f:
            f.write(sumocfg_content)

        return f"Success: SUMO configuration file 'mymap.sumocfg' generated with {total_trips} trips across heterogeneous vehicle types (motorcycles, autos, cars, buses, trucks) and sublane resolution."
    except subprocess.CalledProcessError as e:
        return f"Error generating routes: Subprocess exited with code {e.returncode}. Stderr: {e.stderr}"
    except Exception as e:
        return f"Error generating routes: {str(e)}"


@mcp.tool()
def run_headless_simulation() -> str:
    """
    Step 3: Headless Execution Tool
    Executes the SUMO simulation headlessly and produces statistics and trip info XML reports.

    :return: Confirmation message when the simulation completes.
    """
    sumo_bin = find_sumo_binary("sumo")

    if not os.path.exists("mymap.sumocfg"):
        return "Error: 'mymap.sumocfg' not found. Please run 'generate_routes' first."

    try:
        # Execute SUMO headlessly using mymap.sumocfg configuration, capturing statistics and trip info XMLs
        subprocess.run([
            sumo_bin,
            "-c", "mymap.sumocfg",
            "--statistic-output", "stats.xml",
            "--tripinfo-output", "tripinfo.xml"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)

        return "Success: Headless SUMO simulation completed. 'stats.xml' and 'tripinfo.xml' generated."
    except subprocess.CalledProcessError as e:
        return f"Error running simulation: Subprocess exited with code {e.returncode}. Stderr: {e.stderr}"
    except Exception as e:
        return f"Error running simulation: {str(e)}"


@mcp.tool()
def run_gui_simulation(auto_start: bool = True, delay: int = 150) -> str:
    """
    Step 3b: Visual GUI Execution Tool
    Launches the SUMO GUI application on desktop to view vehicles and traffic simulation visually in real-time.

    :param auto_start: Automatically start playback upon opening sumo-gui window
    :param delay: Milliseconds of delay per simulation step to ensure human-visible smooth playback (default: 150ms)
    :return: Confirmation message.
    """
    if not os.path.exists("mymap.sumocfg"):
        return "Error: 'mymap.sumocfg' not found. Please run 'generate_routes' first."

    # Ensure gui-settings.xml exists before launching GUI
    if not os.path.exists("gui-settings.xml"):
        create_gui_settings("mymap.net.xml", "gui-settings.xml")

    is_headless = os.getenv("HEADLESS_MODE", "false").lower() == "true" or os.getenv("NITRO_CLOUD", "false").lower() == "true"

    if is_headless:
        run_headless_simulation()
        return "Simulation completed headlessly on NitroStack Cloud. 'stats.xml' & 'tripinfo.xml' generated. To view the live simulation GUI on your local desktop machine, run 'npm run launch:local'."

    sumo_gui_bin = find_sumo_binary("sumo-gui")

    try:
        cmd = [sumo_gui_bin, "-c", "mymap.sumocfg", "-g", "gui-settings.xml", "--delay", str(delay)]
        if auto_start:
            cmd.append("--start")
        subprocess.Popen(cmd)
        return f"Success: SUMO GUI app launched on desktop with centered viewport, sublane resolution, real world theme, and {delay}ms step delay."
    except Exception as e:
        run_headless_simulation()
        return f"Headless fallback completed ({str(e)}). Desktop GUI launch unavailable in current server environment. Run 'npm run launch:local' on your local desktop machine."



@mcp.tool()
def analyze_results() -> dict:
    """
    Step 4: Analytics Parsing Tool
    Parses stats.xml using xml.etree.ElementTree and extracts key simulation metrics.

    :return: Clean, structured dictionary/JSON object containing total loaded, inserted, and average route length.
    """
    stats_file = "stats.xml"
    if not os.path.exists(stats_file):
        return {
            "error": f"Statistics file '{stats_file}' not found. Please run 'run_headless_simulation' first."
        }

    try:
        tree = ET.parse(stats_file)
        root = tree.getroot()

        # Locate <vehicles> element recursively for loaded and inserted counts
        vehicles_elem = root.find(".//vehicles")
        total_loaded = int(vehicles_elem.attrib.get("loaded", 0)) if vehicles_elem is not None else 0
        total_inserted = int(vehicles_elem.attrib.get("inserted", 0)) if vehicles_elem is not None else 0

        # Locate <vehicleTripStatistics> element for route length
        trip_stats_elem = root.find(".//vehicleTripStatistics")
        avg_route_length = 0.0
        if trip_stats_elem is not None:
            if "routeLength" in trip_stats_elem.attrib:
                avg_route_length = float(trip_stats_elem.attrib["routeLength"])
            elif "avgRouteLength" in trip_stats_elem.attrib:
                avg_route_length = float(trip_stats_elem.attrib["avgRouteLength"])

        return {
            "total_vehicles_loaded": total_loaded,
            "total_vehicles_inserted": total_inserted,
            "average_route_length": avg_route_length
        }
    except Exception as e:
        return {
            "error": f"Failed to parse statistics: {str(e)}"
        }


@mcp.tool()
def run_full_simulation(bbox: str, trips: int = 600, duration: int = 7200, density: str = None, launch_gui: bool = True) -> dict:
    """
    Master Orchestration Tool
    Executes the COMPLETE SUMO simulation pipeline end-to-end in a SINGLE call without multi-turn prompting:
    1. Downloads OSM map data for bbox & generates network (.net.xml)
    2. Generates vehicle routes (.rou.xml, vtypes.add.xml & sumocfg)
    3. Auto-configures centered visual GUI settings (gui-settings.xml)
    4. Executes headless simulation & produces statistics XML
    5. Automatically opens SUMO GUI desktop app for live visual playback
    6. Parses and returns final traffic analytics metrics

    :param bbox: Bounding box coordinate string (min_lon,min_lat,max_lon,max_lat)
    :param trips: Total number of vehicle trips to generate (default: 600)
    :param duration: Total simulation duration in seconds (default: 7200s / 2 hours)
    :param density: Optional preset density level ('low': 250, 'medium': 600, 'high': 1200, 'congested': 2000)
    :param launch_gui: Automatically open the visual SUMO GUI app on desktop (default: True)
    :return: Combined result dictionary containing status messages and final analytics.
    """
    # Step 1: Generate network
    net_res = generate_network(bbox)
    if net_res.startswith("Error"):
        return {"status": "error", "step": "generate_network", "message": net_res}

    # Step 2: Generate routes & gui settings with heterogeneous vehicle distribution
    routes_res = generate_routes(trips=trips, duration=duration, density=density)
    if routes_res.startswith("Error"):
        return {"status": "error", "step": "generate_routes", "message": routes_res}

    # Step 3: Run headless simulation for stats XML
    headless_res = run_headless_simulation()

    # Step 4: Launch GUI if requested
    gui_res = None
    if launch_gui:
        gui_res = run_gui_simulation(auto_start=True, delay=150)

    # Step 5: Analyze results
    analytics = analyze_results()

    return {
        "status": "success",
        "bbox": bbox,
        "trips": trips,
        "duration": duration,
        "density": density or "medium",
        "gui_launched": launch_gui,
        "network_status": net_res,
        "routes_status": routes_res,
        "headless_status": headless_res,
        "gui_status": gui_res,
        "analytics": analytics
    }


if __name__ == "__main__":
    mcp.run()
