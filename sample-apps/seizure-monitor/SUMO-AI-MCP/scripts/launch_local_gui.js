const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findSumoGui() {
    const sumoHome = process.env.SUMO_HOME;
    if (sumoHome) {
        const ext = process.platform === 'win32' ? '.exe' : '';
        const cand = path.join(sumoHome, 'bin', `sumo-gui${ext}`);
        if (fs.existsSync(cand)) {
            return cand;
        }
    }
    return 'sumo-gui';
}

function launchLocalGui() {
    const cwd = process.cwd();
    const configPath = path.join(cwd, 'mymap.sumocfg');
    const settingsPath = path.join(cwd, 'gui-settings.xml');

    if (!fs.existsSync(configPath)) {
        console.error("Error: 'mymap.sumocfg' not found in current directory. Please run route generation first.");
        process.exit(1);
    }

    const sumoGuiBin = findSumoGui();
    console.log(`Launching local SUMO GUI (${sumoGuiBin}) for '${configPath}'...`);

    try {
        const settingsArg = fs.existsSync(settingsPath) ? `-g "${settingsPath}"` : '';
        if (process.platform === 'win32') {
            execSync(`start "" "${sumoGuiBin}" -c "${configPath}" ${settingsArg} --delay 150 --start`);
        } else {
            execSync(`"${sumoGuiBin}" -c "${configPath}" ${settingsArg} --delay 150 --start &`);
        }
        console.log("SUCCESS: SUMO GUI application launched on your desktop screen!");
    } catch (e) {
        console.error(`Error launching SUMO GUI locally: ${e.message}`);
        process.exit(1);
    }
}

launchLocalGui();
